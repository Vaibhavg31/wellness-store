import { ArrowDown, ArrowUp, Crown, Film, Image as ImageIcon, Plus, Sparkles, Target, Trash2 } from 'lucide-react';
import { OptionalSection, FormLabel, fieldClass } from '@/components/admin/AdminFormUi';
import { ImageUploadField, VideoUploadField } from '@/components/admin/ContentEditor';
import { activeConcerns } from '@/utils/concerns';
import { WELL_SERIES } from '@/utils/wellRange';
import { formatPrice } from '@/utils/formatPrice';
import { RIBBON_ICONS } from '@/components/home/FeatureRibbon';
import { videoSource } from '@/utils/videoEmbed';

const addButton = 'inline-flex items-center gap-1.5 rounded-lg border border-primary/20 bg-primary-soft px-3 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary-tint';
const removeButton = 'shrink-0 rounded-lg p-2.5 text-danger transition-colors hover:bg-danger-tint';

const moveButton = 'shrink-0 rounded-lg p-2 text-admin-muted transition-colors hover:bg-admin-surface hover:text-ink disabled:cursor-not-allowed disabled:opacity-30';
const NEW_REEL = { url: '', poster: '', title: '' };
/** Promises an admin can add to the product's running ribbon with one tap. */
const RIBBON_SUGGESTIONS = [
    { icon: 'leaf', title: '100% Ayurvedic' },
    { icon: 'check', title: 'No added sugar' },
    { icon: 'flask', title: 'Lab tested' },
    { icon: 'award', title: 'Doctor formulated' },
    { icon: 'heart', title: 'Made with care' },
];

const KIND_NAME = { youtube: 'YouTube video', instagram: 'Instagram post or reel', vimeo: 'Vimeo video', file: 'video file', link: 'link (opens in a new tab)' };

/** One product video: either a file uploaded here, or a link someone pasted (a customer's own video on YouTube, Instagram or Vimeo). */
function VideoSourceField({ video, onChange, adminToken }) {
    const external = /^https?:\/\//i.test(video.url);
    const mode = video._mode ?? (external ? 'link' : 'upload');
    const found = videoSource(video.url);
    const pick = (next) => { if (next !== mode) onChange({ _mode: next, url: '' }); };
    const tab = (value, label) => (
        <button
            type="button"
            role="radio"
            aria-checked={mode === value}
            onClick={() => pick(value)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${mode === value ? 'bg-primary text-white' : 'text-admin-muted hover:text-ink'}`}
        >
            {label}
        </button>
    );
    return (
        <div className="space-y-2">
            <div role="radiogroup" aria-label="Where the video comes from" className="inline-flex gap-1 rounded-lg border border-admin-border bg-admin-surface p-1">
                {tab('upload', 'Upload a video')}
                {tab('link', 'Paste a link')}
            </div>
            {mode === 'upload' ? (
                <VideoUploadField label="Video" value={video.url} onChange={({ url }) => onChange({ url, _mode: 'upload' })} adminToken={adminToken} />
            ) : (
                <div>
                    <FormLabel>Video link</FormLabel>
                    <input
                        type="url"
                        inputMode="url"
                        value={video.url}
                        onChange={(e) => onChange({ url: e.target.value.trim(), _mode: 'link' })}
                        className={fieldClass}
                        placeholder="https://www.youtube.com/watch?v=… or an Instagram / Vimeo link"
                    />
                    <p className="mt-1.5 text-xs text-admin-muted">
                        {found.kind !== 'none' ? `Found a ${KIND_NAME[found.kind]}. ` : ''}
                        YouTube links show their own cover picture; for Instagram and Vimeo, add a cover picture below.
                    </p>
                </div>
            )}
        </div>
    );
}

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
    const setHighlight = (i, patch) => update('highlights', form.highlights.map((h, x) => (x === i ? { ...h, ...patch } : h)));
    const moveMedia = (i, d) => { const next = [...form.videos]; [next[i], next[i + d]] = [next[i + d], next[i]]; update('videos', next); };
    const moveHighlight = (i, d) => { const next = [...form.highlights]; [next[i], next[i + d]] = [next[i + d], next[i]]; update('highlights', next); };
    const moveBanner = (i, d) => { const next = [...form.infoBanners]; [next[i], next[i + d]] = [next[i + d], next[i]]; update('infoBanners', next); };
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
                <label className="mt-4 block text-sm">
                    <span className="mb-1.5 block font-medium text-ink">Chikit Well series</span>
                    <select value={form.series ?? ''} onChange={(e) => update('series', e.target.value)} className={fieldClass}>
                        <option value="">No series</option>
                        {WELL_SERIES.map((s) => <option key={s.key} value={s.key}>{s.name} · {s.tagline}</option>)}
                    </select>
                    <span className="mt-1 block text-xs text-admin-muted">The product then counts in its series on the homepage and shows on the series' concern page.</span>
                </label>
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
                icon={Sparkles}
                title="Running ribbon"
                description="A slim ribbon of short promises that glides across the product page, right under the buy section (for example: 100% Ayurvedic, No added sugar, Lab tested). One short line each, with an icon."
                enabled={form.highlights.length > 0}
                onToggle={(v) => update('highlights', v ? [{ icon: 'leaf', title: '', sub: '' }] : [])}
            >
                <div className="space-y-3">
                    {form.highlights.map((h, i) => (
                        <div key={i} className="grid gap-3 rounded-xl border border-admin-border bg-admin-surface-alt p-3 sm:grid-cols-[9rem_1fr_auto] sm:items-end sm:p-4">
                            <div>
                                <FormLabel>Icon</FormLabel>
                                <select value={h.icon || 'leaf'} onChange={(e) => setHighlight(i, { icon: e.target.value })} className={fieldClass} aria-label={`Ribbon item ${i + 1} icon`}>
                                    {Object.keys(RIBBON_ICONS).map((k) => <option key={k} value={k}>{k}</option>)}
                                </select>
                            </div>
                            <div>
                                <FormLabel>Short line</FormLabel>
                                <input value={h.title} maxLength={40} onChange={(e) => setHighlight(i, { title: e.target.value })} className={fieldClass} placeholder="100% Ayurvedic" aria-label={`Ribbon item ${i + 1} text`} />
                            </div>
                            <div className="flex items-center justify-end gap-1">
                                <button type="button" className={moveButton} onClick={() => moveHighlight(i, -1)} disabled={i === 0} aria-label={`Move ribbon item ${i + 1} up`}><ArrowUp size={15} /></button>
                                <button type="button" className={moveButton} onClick={() => moveHighlight(i, 1)} disabled={i === form.highlights.length - 1} aria-label={`Move ribbon item ${i + 1} down`}><ArrowDown size={15} /></button>
                                <button type="button" className={removeButton} onClick={() => update('highlights', form.highlights.filter((_, x) => x !== i))} aria-label={`Remove ribbon item ${i + 1}`}><Trash2 size={15} /></button>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="flex flex-wrap gap-2">
                    <button type="button" className={addButton} onClick={() => update('highlights', [...form.highlights, { icon: 'leaf', title: '', sub: '' }])}><Plus size={14} /> Add ribbon item</button>
                </div>
                {form.highlights.length < 3 && (
                    <div className="flex flex-wrap items-center gap-2 text-xs text-admin-muted">
                        <span>Quick add:</span>
                        {RIBBON_SUGGESTIONS.filter((s) => !form.highlights.some((h) => h.title === s.title)).slice(0, 5).map((s) => (
                            <button key={s.title} type="button" onClick={() => update('highlights', [...form.highlights.filter((h) => h.title.trim()), { ...s, sub: '' }])} className="rounded-full border border-admin-border bg-white px-2.5 py-1 text-xs text-ink transition-colors hover:border-primary/40">{s.title}</button>
                        ))}
                    </div>
                )}
                <p className="text-xs text-admin-muted">Items without text are not saved. Three to six items look best.</p>
            </OptionalSection>

            <OptionalSection
                icon={ImageIcon}
                title="Banners"
                description="Wide banner pictures shown one under the other on the product page (how it works, benefits, ingredients, offers). Add as many as you like and put them in the order you want."
                enabled={form.infoBanners.length > 0}
                onToggle={(v) => update('infoBanners', v ? [{ image: '', alt: '' }] : [])}
            >
                <div className="space-y-4">
                    {form.infoBanners.map((b, i) => (
                        <div key={i} className="space-y-3 rounded-xl border border-admin-border bg-admin-surface-alt p-3 sm:p-4">
                            <div className="flex items-center justify-between gap-3">
                                <input value={b.alt} maxLength={140} onChange={(e) => setBanner(i, { alt: e.target.value })} className={fieldClass} placeholder="What the banner says (for screen readers)" aria-label={`Banner ${i + 1} description`} />
                                <div className="flex shrink-0 items-center gap-1">
                                    <button type="button" className={moveButton} onClick={() => moveBanner(i, -1)} disabled={i === 0} aria-label={`Move banner ${i + 1} up`}><ArrowUp size={15} /></button>
                                    <button type="button" className={moveButton} onClick={() => moveBanner(i, 1)} disabled={i === form.infoBanners.length - 1} aria-label={`Move banner ${i + 1} down`}><ArrowDown size={15} /></button>
                                    <button type="button" className={removeButton} onClick={() => update('infoBanners', form.infoBanners.filter((_, x) => x !== i))} aria-label={`Remove banner ${i + 1}`}><Trash2 size={15} /></button>
                                </div>
                            </div>
                            <ImageUploadField label={`Banner ${i + 1}`} hint="Wide picture, about 1400 px across. It fills the page width." value={b.image} onChange={(image) => setBanner(i, { image })} adminToken={adminToken} />
                        </div>
                    ))}
                </div>
                <button type="button" className={addButton} onClick={() => update('infoBanners', [...form.infoBanners, { image: '', alt: '' }])}><Plus size={14} /> Add banner</button>
                <p className="text-xs text-admin-muted">Banners without a picture are not saved.</p>
            </OptionalSection>

            <OptionalSection
                icon={Film}
                title="Reels (videos)"
                description="Short videos shown as a swipeable row of tall reel tiles on the product page. Upload a video file, or paste a YouTube, Instagram or Vimeo link. Add as many as you like."
                enabled={form.videos.length > 0}
                onToggle={(v) => update('videos', v ? [{ ...NEW_REEL }] : [])}
            >
                <div className="space-y-4">
                    {form.videos.map((v, i) => (
                        <div key={i} className="space-y-3 rounded-xl border border-admin-border bg-admin-surface-alt p-3 sm:p-4">
                            <div className="flex items-center justify-between gap-3">
                                <input value={v.title} maxLength={90} onChange={(e) => setVideo(i, { title: e.target.value })} className={fieldClass} placeholder="Reel title (optional)" aria-label={`Reel ${i + 1} title`} />
                                <div className="flex shrink-0 items-center gap-1">
                                    <button type="button" className={moveButton} onClick={() => moveMedia(i, -1)} disabled={i === 0} aria-label={`Move reel ${i + 1} up`}><ArrowUp size={15} /></button>
                                    <button type="button" className={moveButton} onClick={() => moveMedia(i, 1)} disabled={i === form.videos.length - 1} aria-label={`Move reel ${i + 1} down`}><ArrowDown size={15} /></button>
                                    <button type="button" className={removeButton} onClick={() => update('videos', form.videos.filter((_, x) => x !== i))} aria-label={`Remove reel ${i + 1}`}><Trash2 size={15} /></button>
                                </div>
                            </div>
                            <VideoSourceField video={v} onChange={(patch) => setVideo(i, patch)} adminToken={adminToken} />
                            <ImageUploadField label="Cover picture (optional)" hint="Tall (9:16) works best. YouTube links use their own cover." value={v.poster} onChange={(poster) => setVideo(i, { poster })} adminToken={adminToken} />
                        </div>
                    ))}
                </div>
                <button type="button" className={addButton} onClick={() => update('videos', [...form.videos, { ...NEW_REEL }])}><Plus size={14} /> Add reel</button>
                <p className="text-xs text-admin-muted">Reels without a video or link are not saved.</p>
            </OptionalSection>

        </>
    );
}
