import { Crown, Film, Image as ImageIcon, Plus, Target, Trash2 } from 'lucide-react';
import { OptionalSection, FormLabel, fieldClass } from '@/components/admin/AdminFormUi';
import { ImageUploadField, VideoUploadField } from '@/components/admin/ContentEditor';
import { activeConcerns } from '@/utils/concerns';
import { formatPrice } from '@/utils/formatPrice';

const addButton = 'inline-flex items-center gap-1.5 rounded-lg border border-primary/20 bg-primary-soft px-3 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary-tint';
const removeButton = 'shrink-0 rounded-lg p-2.5 text-danger transition-colors hover:bg-danger-tint';

/**
 * The newer product settings: which concerns it belongs to, its Chikit Club price, the videos shown under the questions
 * and the information banners. They live in the product form state as `concerns`, `clubEligible`, `clubPrice`,
 * `videos` and `infoBanners`.
 */
export default function ProductExtrasEditor({ form, update, siteContent, adminToken, basePrice }) {
    const concerns = activeConcerns(siteContent.extras).filter((c) => c.slug);
    const club = siteContent.extras?.club ?? { enabled: true, discountPercent: 0 };
    const shown = Number(basePrice) || 0;
    const automatic = shown > 0 && club.discountPercent > 0 ? Math.round(shown * (1 - club.discountPercent / 100) * 100) / 100 : 0;
    const setVideo = (i, patch) => update('videos', form.videos.map((v, x) => (x === i ? { ...v, ...patch } : v)));
    const setBanner = (i, patch) => update('infoBanners', form.infoBanners.map((b, x) => (x === i ? { ...b, ...patch } : b)));
    const toggleConcern = (slug) => update('concerns', form.concerns.includes(slug) ? form.concerns.filter((c) => c !== slug) : [...form.concerns, slug]);

    return (
        <>
            <OptionalSection
                icon={Target}
                title="Concerns"
                description="Tick the health goals this product belongs to. It then shows on each concern's page (it also appears there when its name or description contains the concern's keywords)."
                enabled
                onToggle={() => {}}
            >
                <div className="flex flex-wrap gap-2">
                    {concerns.map((c) => {
                        const on = form.concerns.includes(c.slug);
                        return (
                            <button key={c.slug} type="button" aria-pressed={on} onClick={() => toggleConcern(c.slug)}
                                className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${on ? 'border-primary bg-primary text-white' : 'border-admin-border bg-white text-ink hover:border-primary/40'}`}>
                                {c.label}
                            </button>
                        );
                    })}
                </div>
            </OptionalSection>

            {club.enabled !== false && (
                <OptionalSection
                    icon={Crown}
                    title="Chikit Club price"
                    description="Members pay the club price. By default this is the club discount off the shown price."
                    enabled={form.clubEligible}
                    onToggle={(v) => update('clubEligible', v)}
                >
                    <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                            <FormLabel>Club price for this product (₹)</FormLabel>
                            <input type="number" min="0" step="1" value={form.clubPrice} onChange={(e) => update('clubPrice', e.target.value)} className={fieldClass} placeholder={automatic ? `Automatic: ${formatPrice(automatic)} (${club.discountPercent}% off)` : 'Automatic'} />
                            <p className="mt-1.5 text-xs text-admin-muted">Leave empty to use the club discount of {club.discountPercent}%. Packs with their own club price (below, under Variants) use that instead.</p>
                        </div>
                    </div>
                    <p className="text-xs text-admin-muted">Switch this section off to leave the product out of the club (members pay the normal price).</p>
                </OptionalSection>
            )}

            <OptionalSection
                icon={Film}
                title="Videos"
                description="Short videos shown under the questions on the product page."
                enabled={form.videos.length > 0}
                onToggle={(v) => update('videos', v ? [{ url: '', poster: '', title: '' }] : [])}
            >
                <div className="space-y-4">
                    {form.videos.map((v, i) => (
                        <div key={i} className="space-y-3 rounded-xl border border-admin-border bg-admin-surface-alt p-3 sm:p-4">
                            <div className="flex items-center justify-between gap-3">
                                <input value={v.title} onChange={(e) => setVideo(i, { title: e.target.value })} className={fieldClass} placeholder="Title (optional)" aria-label={`Video ${i + 1} title`} />
                                <button type="button" className={removeButton} onClick={() => update('videos', form.videos.filter((_, x) => x !== i))} aria-label={`Remove video ${i + 1}`}><Trash2 size={15} /></button>
                            </div>
                            <VideoUploadField label="Video" value={v.url} onChange={({ url }) => setVideo(i, { url })} adminToken={adminToken} />
                            <ImageUploadField label="Cover picture" value={v.poster} onChange={(poster) => setVideo(i, { poster })} adminToken={adminToken} />
                        </div>
                    ))}
                </div>
                <button type="button" className={addButton} onClick={() => update('videos', [...form.videos, { url: '', poster: '', title: '' }])}><Plus size={14} /> Add video</button>
            </OptionalSection>

            <OptionalSection
                icon={ImageIcon}
                title="Information banners"
                description="Your own designed banners (how it works, how to take it, ingredients). While there are none, the page shows panels written from the product's own details."
                enabled={form.infoBanners.length > 0}
                onToggle={(v) => update('infoBanners', v ? [{ image: '', alt: '' }] : [])}
            >
                <div className="space-y-4">
                    {form.infoBanners.map((b, i) => (
                        <div key={i} className="space-y-3 rounded-xl border border-admin-border bg-admin-surface-alt p-3 sm:p-4">
                            <div className="flex items-center justify-between gap-3">
                                <input value={b.alt} onChange={(e) => setBanner(i, { alt: e.target.value })} className={fieldClass} placeholder="What the banner says (for screen readers)" aria-label={`Banner ${i + 1} description`} />
                                <button type="button" className={removeButton} onClick={() => update('infoBanners', form.infoBanners.filter((_, x) => x !== i))} aria-label={`Remove banner ${i + 1}`}><Trash2 size={15} /></button>
                            </div>
                            <ImageUploadField label="Banner image" hint="Full width, about 1400 px wide." value={b.image} onChange={(image) => setBanner(i, { image })} adminToken={adminToken} />
                        </div>
                    ))}
                </div>
                <button type="button" className={addButton} onClick={() => update('infoBanners', [...form.infoBanners, { image: '', alt: '' }])}><Plus size={14} /> Add banner</button>
            </OptionalSection>
        </>
    );
}
