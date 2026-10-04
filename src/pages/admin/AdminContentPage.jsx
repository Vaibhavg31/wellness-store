import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    Store, Home, FileText, MessageCircle, Megaphone, Bell, Truck, Gift,
} from 'lucide-react';
import { api, ApiError } from '@/services/api';
import { useAdminAuth, ADMIN_PATH } from '@/contexts/AuthContext';
import { useSiteContent } from '@/contexts/SiteContentContext';
import { useToast } from '@/contexts/ToastContext';
import { useAdminDirtySave } from '@/hooks/useAdminDirtySave';
import { DEFAULT_SITE_CONTENT } from '@/data/defaultContent';
import { deepMerge } from '@/utils/deepMerge';
import { prepareSiteContentForSave } from '@/utils/prepareSiteContentForSave';
import Button from '@/components/ui/Button';
import { PopupDialog } from '@/components/layout/AnnouncementPopup';
import OfferPanel from '@/components/offer/OfferPanel';
import Input from '@/components/ui/Input';
import { AdminErrorBanner, AdminSaveBar, AdminSelect } from '@/components/admin/AdminUi';
import BannerManager from '@/components/admin/BannerManager';
import {
    AdminSection, AdminField, AdminTextarea, ImageUploadField, VideoUploadField,
    StringListEditor, BenefitEditor, FaqEditor, SectionToggles,
} from '@/components/admin/ContentEditor';

const TABS = [
    { id: 'brand', label: 'Brand & Store', icon: Store },
    { id: 'homepage', label: 'Homepage', icon: Home },
    { id: 'about', label: 'About Page', icon: FileText },
    { id: 'contact', label: 'Contact & FAQ', icon: MessageCircle },
    { id: 'promo', label: 'SEO & Meta', icon: Megaphone },
    { id: 'popup', label: 'Announcement Popup', icon: Bell },
    { id: 'offer', label: 'Sticky Offer Tab', icon: Gift },
    { id: 'experience', label: 'Delivery & Store Options', icon: Truck },
];

// Deliberately distinct, unambiguous names — "Promo Banners" and "Top Promo
// Banner" used to sound nearly identical despite being completely different
// features (uploaded photos vs. a text-only announcement strip), which was
// genuinely confusing. Every label below stands on its own.
const SECTION_LABELS = {
    hero: 'Hero Banner',
    videoBanner: 'Video Banner',
    brandMarquee: 'Brand Marquee',
    banners: 'Image Banners (Stacked)',
    bannerSlider: 'Full-width Banner Slider',
    categoryShelves: 'Category Shelves (products by category)',
    featured: 'Featured Collection',
    trending: 'Trending Now',
    categories: 'Shop by Category',
    bundles: 'Bundle & Save Offers',
    whyChoose: 'Why Choose Us',
    certifiedBanner: 'Certified Banner (FSSAI/GMP)',
    reviews: 'Customer Reviews',
    instagram: 'Instagram Gallery',
    newsletter: 'Newsletter',
    promoBanner: 'Top Announcement Bar (Text Only)',
};

export default function AdminContentPage() {
    const { adminToken } = useAdminAuth();
    const { refetch } = useSiteContent();
    const { showToast } = useToast();
    const [tab, setTab] = useState('brand');
    const [content, setContent] = useState(null);
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [coupons, setCoupons] = useState([]);
    const [previewing, setPreviewing] = useState(false);
    const [previewingOffer, setPreviewingOffer] = useState(false);
    const contentRef = useRef(content);
    contentRef.current = content;
    const sectionsSavedToastRef = useRef(null);

    const {
        hasChanges,
        saving,
        setSaving,
        saved,
        markSaved,
        clearSaved,
        resetBaseline,
        patchBaseline,
        isReady,
    } = useAdminDirtySave(content);
    const [saveError, setSaveError] = useState(null);

    useEffect(() => () => clearTimeout(sectionsSavedToastRef.current), []);

    useEffect(() => {
        api.get('/api/settings').then((data) => {
            const merged = deepMerge(DEFAULT_SITE_CONTENT, data);
            if (data?.sections) merged.sections = data.sections;
            setContent(merged);
            resetBaseline(merged);
        }).catch((err) => {
            setSaveError(err instanceof ApiError ? err.message : 'Failed to load content');
        });
    }, [resetBaseline]);

    useEffect(() => {
        api.get('/api/categories').then(setCategories).catch(() => {});
    }, []);

    useEffect(() => {
        if (!adminToken) return;
        api.get('/api/products/admin/all', adminToken)
            .then(setProducts)
            .catch(() => {});
        api.get('/api/coupons/admin/all', adminToken)
            .then(setCoupons)
            .catch(() => {});
    }, [adminToken]);

    const updateExtras = (patch) => update('extras', { ...content.extras, ...patch });

    const update = (path, value) => {
        setSaveError(null);
        setContent((prev) => {
            const next = { ...prev };
            const keys = path.split('.');
            let obj = next;
            for (let i = 0; i < keys.length - 1; i++) {
                obj[keys[i]] = { ...obj[keys[i]] };
                obj = obj[keys[i]];
            }
            obj[keys[keys.length - 1]] = value;
            return next;
        });
        clearSaved();
    };

    /**
     * Section show/hide and drag-reorder save immediately, the same way each
     * banner's own Live/Hidden toggle already does — NOT batched with the
     * big "Save all changes" button. This used to be the one inconsistency
     * that caused a real bug report: an admin flipped a section on, added
     * banner images (which save instantly on upload), assumed everything
     * was live, and never noticed the section itself still needed the
     * separate batch save. Making this instant removes that trap entirely.
     */
    const handleSectionsChange = async (nextSections) => {
        const previousSections = contentRef.current?.sections;
        setContent((prev) => ({ ...prev, sections: nextSections }));

        if (!adminToken) {
            showToast('Session expired. Please sign in again.', 'error');
            setContent((prev) => ({ ...prev, sections: previousSections }));
            return;
        }

        try {
            const updated = await api.put('/api/settings', { sections: nextSections }, adminToken);
            const savedSections = updated?.sections ?? nextSections;
            setContent((prev) => ({ ...prev, sections: savedSections }));
            patchBaseline({ sections: savedSections });
            refetch();

            // A single drag fires several intermediate reorders (one per
            // position swap) — without debouncing, that's a toast per swap.
            // This was also the actual cause of "no save button shown on
            // phone" reports: the save was working the whole time, it just
            // gave zero confirmation, so people went looking for a Save
            // button that (by design) doesn't exist for this action.
            clearTimeout(sectionsSavedToastRef.current);
            sectionsSavedToastRef.current = setTimeout(() => {
                showToast('Order saved', 'success');
            }, 800);
        } catch (err) {
            clearTimeout(sectionsSavedToastRef.current);
            setContent((prev) => ({ ...prev, sections: previousSections }));
            showToast(err instanceof ApiError ? err.message : 'Failed to update section', 'error');
        }
    };

    const handleSave = async () => {
        const current = contentRef.current;
        if (!adminToken) {
            showToast('Session expired. Please sign in again.', 'error');
            return;
        }
        if (!current || !hasChanges) return;

        setSaving(true);
        setSaveError(null);

        const payload = prepareSiteContentForSave(current);

        try {
            const updated = await api.put('/api/settings', payload, adminToken);
            const merged = deepMerge(DEFAULT_SITE_CONTENT, updated);
            if (updated?.sections) merged.sections = updated.sections;
            setContent(merged);
            refetch();
            markSaved(merged);
            showToast('Content saved successfully', 'success');
        } catch (err) {
            const message = err instanceof ApiError ? err.message : 'Failed to save content';
            setSaveError(message);
            showToast(message, 'error');
        } finally {
            setSaving(false);
        }
    };

    if (!content || !isReady) return <p className="text-admin-muted">Loading content...</p>;

    /**
     * What each homepage section's row expands to show. One place per
     * section — drag to reorder, switch to show/hide, click the title to
     * edit its content, all in the same list. Sections with nothing to
     * configure here (they pull from Products/Categories/Reviews, managed
     * on their own admin pages) get a short pointer instead of empty fields.
     */
    const renderHomepageSectionContent = (key) => {
        switch (key) {
            case 'videoBanner':
                return (
                    <div className="space-y-4 pt-3">
                        <p className="text-xs text-admin-muted bg-primary/5 border border-primary/10 rounded-lg px-3 py-2">
                            A full-width autoplay video banner. Hidden automatically until you upload a video.
                        </p>
                        <VideoUploadField
                            label="Banner Video"
                            hint="MP4 or WebM, 16:9 landscape recommended, max 20MB. We check the video's resolution before uploading and let you know how well it'll fit."
                            value={content.videoBanner.videoUrl}
                            width={content.videoBanner.width}
                            height={content.videoBanner.height}
                            onChange={({ url, width, height }) => update('videoBanner', { ...content.videoBanner, videoUrl: url, width, height })}
                            adminToken={adminToken}
                        />
                        <ImageUploadField
                            label="Poster Image"
                            hint="Shown while the video loads, and as a static fallback on very slow connections."
                            value={content.videoBanner.poster}
                            onChange={(v) => update('videoBanner', { ...content.videoBanner, poster: v })}
                            adminToken={adminToken}
                        />
                        <AdminField label="Fit" hint="Cover fills the banner edge-to-edge (may crop). Contain shows the whole video, letterboxed.">
                            <div className="grid grid-cols-2 gap-3">
                                {[
                                    { value: 'cover', title: 'Cover', desc: 'Fills the frame' },
                                    { value: 'contain', title: 'Contain', desc: 'Shows full video' },
                                ].map((opt) => (
                                    <button
                                        key={opt.value}
                                        type="button"
                                        onClick={() => update('videoBanner', { ...content.videoBanner, fit: opt.value })}
                                        className={`rounded-xl border p-3 text-left transition-all ${
                                            content.videoBanner.fit === opt.value
                                                ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                                                : 'border-admin-border bg-admin-surface-alt hover:border-line'
                                        }`}
                                    >
                                        <p className="text-sm font-semibold text-ink">{opt.title}</p>
                                        <p className="text-[11px] text-admin-muted mt-0.5">{opt.desc}</p>
                                    </button>
                                ))}
                            </div>
                        </AdminField>
                        <div className="grid sm:grid-cols-2 gap-4">
                            <AdminField label="Title (optional overlay text)">
                                <Input value={content.videoBanner.title} onChange={(e) => update('videoBanner', { ...content.videoBanner, title: e.target.value })} />
                            </AdminField>
                            <AdminField label="Subtitle">
                                <Input value={content.videoBanner.subtitle} onChange={(e) => update('videoBanner', { ...content.videoBanner, subtitle: e.target.value })} />
                            </AdminField>
                        </div>
                        <div className="grid sm:grid-cols-2 gap-4">
                            <AdminField label="Button Label">
                                <Input value={content.videoBanner.ctaLabel} onChange={(e) => update('videoBanner', { ...content.videoBanner, ctaLabel: e.target.value })} placeholder="Shop Now" />
                            </AdminField>
                            <AdminField label="Button Link">
                                <Input value={content.videoBanner.ctaHref} onChange={(e) => update('videoBanner', { ...content.videoBanner, ctaHref: e.target.value })} placeholder="/shop" />
                            </AdminField>
                        </div>
                    </div>
                );

            case 'hero':
                return (
                    <div className="space-y-4 pt-3">
                        <AdminField label="Badge Text">
                            <Input value={content.hero.badge} onChange={(e) => update('hero', { ...content.hero, badge: e.target.value })} />
                        </AdminField>
                        <div className="grid sm:grid-cols-2 gap-4">
                            <AdminField label="Headline">
                                <Input value={content.hero.headline} onChange={(e) => update('hero', { ...content.hero, headline: e.target.value })} />
                            </AdminField>
                            <AdminField label="Headline Accent (italic)">
                                <Input value={content.hero.headlineAccent} onChange={(e) => update('hero', { ...content.hero, headlineAccent: e.target.value })} />
                            </AdminField>
                        </div>
                        <AdminField label="Subheadline">
                            <AdminTextarea value={content.hero.subheadline} onChange={(e) => update('hero', { ...content.hero, subheadline: e.target.value })} />
                        </AdminField>
                        <div className="grid sm:grid-cols-2 gap-4">
                            <AdminField label="Primary Button">
                                <Input value={content.hero.primaryCta?.label} onChange={(e) => update('hero', { ...content.hero, primaryCta: { ...content.hero.primaryCta, label: e.target.value } })} placeholder="Label" />
                            </AdminField>
                            <AdminField label="Primary Link">
                                <Input value={content.hero.primaryCta?.href} onChange={(e) => update('hero', { ...content.hero, primaryCta: { ...content.hero.primaryCta, href: e.target.value } })} placeholder="/shop" />
                            </AdminField>
                        </div>
                        <AdminField label="Featured Product ID" hint="Pins a product to the small featured-product card and its CTA. Leave empty to hide that card.">
                            <Input value={content.hero.featuredProductId} onChange={(e) => update('hero', { ...content.hero, featuredProductId: e.target.value })} />
                        </AdminField>
                        <AdminField label="Hero Photos" hint="Up to 4 real product photos shown in the hero's rotating photo stage. Leave any slot on Auto to fall back to your best-seller / new-arrival products.">
                            <div className="grid grid-cols-2 gap-3">
                                {[0, 1, 2, 3].map((slot) => (
                                    <AdminSelect
                                        key={slot}
                                        aria-label={`Hero photo ${slot + 1}`}
                                        value={content.hero.productImageIds?.[slot] ?? ''}
                                        onChange={(e) => {
                                            const next = [...(content.hero.productImageIds ?? [])];
                                            next[slot] = e.target.value;
                                            update('hero', { ...content.hero, productImageIds: next });
                                        }}
                                        className="w-full"
                                        options={[
                                            { value: '', label: `Auto (slot ${slot + 1})` },
                                            ...products.map((p) => ({ value: p.id, label: p.title })),
                                        ]}
                                    />
                                ))}
                            </div>
                        </AdminField>
                    </div>
                );

            case 'bannerSlider': {
                const top = content.extras.topSlider;
                const patchTop = (change) => updateExtras({ topSlider: { ...top, ...change } });
                const patchVideo = (change) => patchTop({ video: { ...top.video, ...change } });
                return (
                    <div className="pt-3 space-y-4">
                        <p className="text-xs text-admin-muted bg-primary/5 border border-primary/10 rounded-lg px-3 py-2">
                            The first thing visitors see: a full-width section that runs edge to edge. Show either a slider of several
                            images, or one video. Use it for sales, announcements or brand images.
                        </p>

                        <AdminField label="What should this section show?">
                            <div className="grid grid-cols-2 gap-3">
                                {[
                                    { value: 'images', title: 'Image slider', desc: 'Several images that slide automatically' },
                                    { value: 'video', title: 'One video', desc: 'A single full-width video' },
                                ].map((option) => (
                                    <button
                                        key={option.value}
                                        type="button"
                                        onClick={() => patchTop({ mode: option.value })}
                                        aria-pressed={top.mode === option.value}
                                        className={`rounded-xl border p-3 text-left transition-all ${top.mode === option.value ? 'border-primary bg-primary/5 ring-2 ring-primary/20' : 'border-admin-border bg-admin-surface-alt hover:border-line'}`}
                                    >
                                        <p className="text-sm font-semibold text-ink">{option.title}</p>
                                        <p className="text-[11px] text-admin-muted mt-0.5">{option.desc}</p>
                                    </button>
                                ))}
                            </div>
                        </AdminField>

                        {top.mode === 'images' ? (
                            <>
                                <AdminField label="Slide every (seconds)" hint="How long each image stays. Use 0 to stop automatic sliding (visitors can still swipe or use the arrows).">
                                    <Input type="number" min={0} max={30} className="w-28" value={top.autoplaySeconds} onChange={(e) => patchTop({ autoplaySeconds: Math.min(30, Math.max(0, Number(e.target.value) || 0)) })} />
                                </AdminField>
                                <p className="text-xs text-admin-muted">
                                    Add as many slides as you like and move them with the arrows. Best size 1920×730px (wide); add a separate phone
                                    image (about 1080×1350px) so it looks right on mobile. Not the same as “Image Banners (Stacked)” below.
                                </p>
                                <BannerManager filterTarget="slider" />
                            </>
                        ) : (
                            <div className="space-y-4">
                                <VideoUploadField
                                    label="Video"
                                    hint="MP4 or WebM, wide (landscape) works best, max 20MB. It plays silently on a loop; visitors can pause it or turn sound on."
                                    value={top.video.url}
                                    width={top.video.width}
                                    height={top.video.height}
                                    onChange={({ url, width, height }) => patchVideo({ url, width, height })}
                                    adminToken={adminToken}
                                />
                                <ImageUploadField
                                    label="Poster image (optional)"
                                    hint="Shown while the video loads, and to visitors who prefer reduced motion."
                                    value={top.video.poster}
                                    onChange={(v) => patchVideo({ poster: v })}
                                    adminToken={adminToken}
                                />
                                <div className="grid sm:grid-cols-2 gap-4">
                                    <AdminField label="Small heading (optional)"><Input maxLength={90} value={top.video.subtitle} onChange={(e) => patchVideo({ subtitle: e.target.value })} /></AdminField>
                                    <AdminField label="Big heading (optional)"><Input maxLength={90} value={top.video.title} onChange={(e) => patchVideo({ title: e.target.value })} /></AdminField>
                                    <AdminField label="Button text (optional)"><Input maxLength={30} value={top.video.ctaLabel} onChange={(e) => patchVideo({ ctaLabel: e.target.value })} placeholder="Shop Now" /></AdminField>
                                    <AdminField label="Button link"><Input maxLength={200} value={top.video.ctaHref} onChange={(e) => patchVideo({ ctaHref: e.target.value })} placeholder="/shop" /></AdminField>
                                </div>
                                {!top.video.url && <p className="text-xs text-danger">No video uploaded yet — until you upload one, nothing shows in this section.</p>}
                                <p className="text-xs text-admin-muted">Your slider images are kept. Switch back to “Image slider” any time.</p>
                            </div>
                        )}
                    </div>
                );
            }

            case 'banners':
                return (
                    <div className="pt-3 space-y-3">
                        <p className="text-xs text-admin-muted bg-primary/5 border border-primary/10 rounded-lg px-3 py-2">
                            All enabled images shown stacked, full-size, one after another — not a carousel.
                            Not the same as "Banner Slider" above. Tag a banner "Both" to show it in both places.
                        </p>
                        <BannerManager filterTarget="stacked" />
                    </div>
                );

            case 'brandMarquee':
                return (
                    <div className="pt-3">
                        <StringListEditor items={content.marquee.items} onChange={(items) => update('marquee', { items })} placeholder="Marquee item" />
                    </div>
                );

            case 'featured':
                return (
                    <div className="space-y-4 pt-3">
                        <AdminField label="Collection Title">
                            <Input value={content.featured.collectionTitle} onChange={(e) => update('featured', { ...content.featured, collectionTitle: e.target.value })} />
                        </AdminField>
                        <AdminField label="Styles Section Title">
                            <Input value={content.featured.stylesTitle} onChange={(e) => update('featured', { ...content.featured, stylesTitle: e.target.value })} />
                        </AdminField>
                    </div>
                );

            case 'whyChoose':
                return (
                    <div className="space-y-4 pt-3">
                        <AdminField label="Subtitle">
                            <Input value={content.whyChoose.subtitle} onChange={(e) => update('whyChoose', { ...content.whyChoose, subtitle: e.target.value })} />
                        </AdminField>
                        <AdminField label="Title">
                            <Input value={content.whyChoose.title} onChange={(e) => update('whyChoose', { ...content.whyChoose, title: e.target.value })} />
                        </AdminField>
                        <AdminField label="Description">
                            <AdminTextarea value={content.whyChoose.description} onChange={(e) => update('whyChoose', { ...content.whyChoose, description: e.target.value })} />
                        </AdminField>
                        <BenefitEditor benefits={content.whyChoose.benefits} onChange={(benefits) => update('whyChoose', { ...content.whyChoose, benefits })} />
                    </div>
                );

            case 'certifiedBanner':
                return (
                    <div className="space-y-4 pt-3">
                        <AdminField label="Badge">
                            <Input value={content.certifiedBanner.badge} onChange={(e) => update('certifiedBanner', { ...content.certifiedBanner, badge: e.target.value })} />
                        </AdminField>
                        <AdminField label="Title">
                            <Input value={content.certifiedBanner.title} onChange={(e) => update('certifiedBanner', { ...content.certifiedBanner, title: e.target.value })} />
                        </AdminField>
                        <AdminField label="Description">
                            <AdminTextarea value={content.certifiedBanner.description} onChange={(e) => update('certifiedBanner', { ...content.certifiedBanner, description: e.target.value })} rows={4} />
                        </AdminField>
                        <ImageUploadField label="Banner Image" value={content.certifiedBanner.image} onChange={(v) => update('certifiedBanner', { ...content.certifiedBanner, image: v })} adminToken={adminToken} />
                    </div>
                );

            case 'newsletter':
                return (
                    <div className="space-y-4 pt-3">
                        <AdminField label="Title">
                            <Input value={content.newsletter.title} onChange={(e) => update('newsletter', { ...content.newsletter, title: e.target.value })} />
                        </AdminField>
                        <AdminField label="Description">
                            <AdminTextarea value={content.newsletter.description} onChange={(e) => update('newsletter', { ...content.newsletter, description: e.target.value })} />
                        </AdminField>
                    </div>
                );

            case 'instagram':
                return (
                    <div className="space-y-4 pt-3">
                        <AdminField label="Section Title">
                            <Input value={content.instagram.title} onChange={(e) => update('instagram', { ...content.instagram, title: e.target.value })} />
                        </AdminField>
                        <AdminField label="Gallery Images" hint="Paste image URLs. Use the trash icon or clear a field to remove.">
                            <StringListEditor items={content.instagram.images ?? []} onChange={(images) => update('instagram', { ...content.instagram, images })} placeholder="Image URL" />
                        </AdminField>
                    </div>
                );

            case 'promoBanner':
                return (
                    <div className="space-y-4 pt-3">
                        <p className="text-xs text-admin-muted bg-primary/5 border border-primary/10 rounded-lg px-3 py-2">
                            This is a text-only strip pinned above the navigation on every page (see "Free
                            delivery above..." at the very top of the site) — no image, and unrelated to
                            Banner Slider / Image Banners below.
                        </p>
                        <label className="flex items-center gap-3 cursor-pointer">
                            <button
                                type="button"
                                onClick={() => update('promo', { ...content.promo, enabled: !content.promo.enabled })}
                                className={`relative w-12 h-6 rounded-full transition-colors ${content.promo.enabled ? 'bg-primary' : 'bg-muted/30'}`}
                            >
                                <span className={`absolute top-0.5 w-5 h-5 bg-canvas rounded-full shadow transition-transform ${content.promo.enabled ? 'left-6' : 'left-0.5'}`} />
                            </button>
                            <span className="text-sm text-ink">Show promo banner</span>
                        </label>
                        <AdminField label="Banner Text (before code)">
                            <Input value={content.promo.text} onChange={(e) => update('promo', { ...content.promo, text: e.target.value })} />
                        </AdminField>
                        <AdminField label="Promo Code">
                            <Input value={content.promo.code} onChange={(e) => update('promo', { ...content.promo, code: e.target.value })} />
                        </AdminField>
                        <AdminField label="Text After Code">
                            <Input value={content.promo.suffix} onChange={(e) => update('promo', { ...content.promo, suffix: e.target.value })} />
                        </AdminField>
                        <AdminField label="Link URL">
                            <Input value={content.promo.href} onChange={(e) => update('promo', { ...content.promo, href: e.target.value })} />
                        </AdminField>
                    </div>
                );

            case 'trending':
                return (
                    <p className="text-sm text-admin-muted pt-3">
                        Shows products marked "Trending" in{' '}
                        <Link to={`${ADMIN_PATH}/products`} className="text-primary font-medium hover:underline">Products</Link>. No extra content to configure here.
                    </p>
                );

            case 'categoryShelves':
                return (
                    <div className="space-y-4 pt-3">
                        <p className="text-xs text-admin-muted bg-primary/5 border border-primary/10 rounded-lg px-3 py-2">
                            Puts products first: one swipeable row of products per category. The category bar at the top highlights the row being read as the shopper scrolls (on phones, a sticky strip does this).
                            This list also decides which categories appear in the top bar. Categories with no products are hidden automatically. Drag this section higher or lower in the list above to place it.
                        </p>
                        <AdminField label="Which categories">
                            <AdminSelect
                                aria-label="Shelf mode"
                                value={content.extras.shelves.mode}
                                onChange={(e) => updateExtras({ shelves: { ...content.extras.shelves, mode: e.target.value } })}
                                className="w-full sm:w-80"
                                options={[
                                    { value: 'auto', label: 'All categories that have products (automatic)' },
                                    { value: 'custom', label: 'Only the ones I choose, in my order' },
                                ]}
                            />
                        </AdminField>
                        <AdminField label="Products per shelf" hint="2 to 16. Shoppers can open 'View all' for the rest.">
                            <Input type="number" min={2} max={16} className="w-28" value={content.extras.shelves.limit} onChange={(e) => updateExtras({ shelves: { ...content.extras.shelves, limit: Number(e.target.value) || 8 } })} />
                        </AdminField>
                        {content.extras.shelves.mode === 'custom' && (
                            <div className="space-y-3">
                                {content.extras.shelves.items.map((item, index) => {
                                    const items = content.extras.shelves.items;
                                    const patch = (change) => updateExtras({ shelves: { ...content.extras.shelves, items: items.map((s, i) => (i === index ? { ...s, ...change } : s)) } });
                                    const move = (by) => {
                                        const next = [...items];
                                        const [moved] = next.splice(index, 1);
                                        next.splice(index + by, 0, moved);
                                        updateExtras({ shelves: { ...content.extras.shelves, items: next } });
                                    };
                                    return (
                                        <div key={index} className="grid gap-3 rounded-lg border border-admin-border p-3 sm:grid-cols-[1fr_1.4fr_auto] sm:items-end">
                                            <AdminField label={`Shelf ${index + 1}`}>
                                                <AdminSelect
                                                    aria-label={`Shelf ${index + 1} category`}
                                                    value={item.categorySlug}
                                                    onChange={(e) => patch({ categorySlug: e.target.value })}
                                                    className="w-full"
                                                    options={[{ value: '', label: 'Choose a category' }, ...categories.map((c) => ({ value: c.slug, label: c.label }))]}
                                                />
                                            </AdminField>
                                            <AdminField label="Subtitle (optional)"><Input value={item.subtitle} maxLength={120} placeholder="Fresh picks this month" onChange={(e) => patch({ subtitle: e.target.value })} /></AdminField>
                                            <div className="flex gap-2">
                                                <Button variant="outline" size="sm" disabled={index === 0} onClick={() => move(-1)} aria-label="Move shelf up">↑</Button>
                                                <Button variant="outline" size="sm" disabled={index === items.length - 1} onClick={() => move(1)} aria-label="Move shelf down">↓</Button>
                                                <Button variant="outline" size="sm" onClick={() => updateExtras({ shelves: { ...content.extras.shelves, items: items.filter((_, i) => i !== index) } })}>Remove</Button>
                                            </div>
                                        </div>
                                    );
                                })}
                                <Button variant="outline" size="sm" onClick={() => updateExtras({ shelves: { ...content.extras.shelves, items: [...content.extras.shelves.items, { categorySlug: '', subtitle: '' }] } })}>Add shelf</Button>
                                {content.extras.shelves.items.length === 0 && <p className="text-caption text-admin-muted">No shelves chosen yet, so every category with products is shown.</p>}
                            </div>
                        )}
                    </div>
                );

            case 'categories':
                return (
                    <p className="text-sm text-admin-muted pt-3">
                        Shows categories with at least one product, managed in{' '}
                        <Link to={`${ADMIN_PATH}/categories`} className="text-primary font-medium hover:underline">Categories</Link>. No extra content to configure here.
                    </p>
                );

            case 'bundles':
                return (
                    <p className="text-sm text-admin-muted pt-3">
                        Shows every published bundle offer, managed in{' '}
                        <Link to={`${ADMIN_PATH}/bundles`} className="text-primary font-medium hover:underline">Bundles</Link>. Hidden automatically when there are no bundles to show.
                    </p>
                );

            case 'reviews':
                return (
                    <p className="text-sm text-admin-muted pt-3">
                        Shows approved reviews from{' '}
                        <Link to={`${ADMIN_PATH}/reviews`} className="text-primary font-medium hover:underline">Reviews</Link>. No extra content to configure here.
                    </p>
                );

            default:
                return null;
        }
    };

    return (
        <div className="pb-20 lg:pb-24">
            <AdminErrorBanner message={saveError} onDismiss={() => setSaveError(null)} />

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="font-display text-3xl text-ink mb-1 max-lg:hidden">Content Manager</h1>
                    <p className="text-admin-muted text-sm">Edit website text, images, and sections. No code required.</p>
                </div>
                <AdminSaveBar
                    hasChanges={hasChanges}
                    saving={saving}
                    saved={saved}
                    onSave={handleSave}
                    saveLabel="Save all changes"
                />
            </div>

            <div className="flex flex-col lg:flex-row gap-8">
                <nav className="lg:w-52 flex lg:flex-col gap-1 overflow-x-auto pb-2 lg:pb-0">
                    {TABS.map(({ id, label, icon: Icon }) => (
                        <button
                            key={id}
                            type="button"
                            onClick={() => setTab(id)}
                            className={`flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm whitespace-nowrap transition-colors ${
                                tab === id
                                    ? 'bg-primary text-canvas'
                                    : 'text-admin-muted hover:bg-admin-surface hover:text-ink'
                            }`}
                        >
                            <Icon size={16} strokeWidth={1.5} />
                            {label}
                        </button>
                    ))}
                </nav>

                <div className="flex-1 min-w-0">
                    {tab === 'brand' && (
                        <>
                            <AdminSection title="Brand Identity" description="Your brand name and taglines appear across the site">
                                <AdminField label="Brand Name">
                                    <Input value={content.brandName} onChange={(e) => update('brandName', e.target.value)} />
                                </AdminField>
                                <AdminField label="Short Name">
                                    <Input value={content.brandShort} onChange={(e) => update('brandShort', e.target.value)} />
                                </AdminField>
                                <AdminField label="Tagline">
                                    <Input value={content.brandTagline} onChange={(e) => update('brandTagline', e.target.value)} />
                                </AdminField>
                                <AdminField label="Description">
                                    <AdminTextarea value={content.brandDescription} onChange={(e) => update('brandDescription', e.target.value)} rows={3} />
                                </AdminField>
                            </AdminSection>

                            <AdminSection title="Contact Information">
                                <AdminField label="Email">
                                    <Input value={content.contact.email} onChange={(e) => update('contact', { ...content.contact, email: e.target.value })} />
                                </AdminField>
                                <AdminField label="WhatsApp Number" hint="Include country code, e.g. +916353259781">
                                    <Input value={content.contact.whatsappNumber} onChange={(e) => update('contact', { ...content.contact, whatsappNumber: e.target.value })} />
                                </AdminField>
                                <AdminField label="WhatsApp Display">
                                    <Input value={content.contact.whatsappDisplay} onChange={(e) => update('contact', { ...content.contact, whatsappDisplay: e.target.value })} />
                                </AdminField>
                                <AdminField label="WhatsApp Default Message" hint="Pre-filled in chat when customers tap WhatsApp — they only need to press Send">
                                    <Input value={content.contact.whatsappDefaultMessage ?? ''} onChange={(e) => update('contact', { ...content.contact, whatsappDefaultMessage: e.target.value })} />
                                </AdminField>
                                <AdminField label="Business Hours">
                                    <Input value={content.contact.businessHours} onChange={(e) => update('contact', { ...content.contact, businessHours: e.target.value })} />
                                </AdminField>
                            </AdminSection>

                            <AdminSection title="Social Media">
                                <AdminField label="Instagram Handle">
                                    <Input value={content.social.instagramHandle} onChange={(e) => update('social', { ...content.social, instagramHandle: e.target.value })} />
                                </AdminField>
                                <AdminField label="Instagram URL">
                                    <Input value={content.social.instagramUrl} onChange={(e) => update('social', { ...content.social, instagramUrl: e.target.value })} />
                                </AdminField>
                                <AdminField label="Instagram Tagline">
                                    <AdminTextarea value={content.social.instagramTagline} onChange={(e) => update('social', { ...content.social, instagramTagline: e.target.value })} rows={2} />
                                </AdminField>
                            </AdminSection>

                            <AdminSection title="Delivery & Pricing">
                                <div className="grid sm:grid-cols-3 gap-4">
                                    <AdminField label="Delivery Fee (₹)">
                                        <Input type="number" value={content.delivery.fee} onChange={(e) => update('delivery', { ...content.delivery, fee: Number(e.target.value) })} />
                                    </AdminField>
                                    <AdminField label="Free Delivery Threshold (₹)">
                                        <Input type="number" value={content.delivery.freeThreshold} onChange={(e) => update('delivery', { ...content.delivery, freeThreshold: Number(e.target.value) })} />
                                    </AdminField>
                                    <AdminField label="Return Policy (Days)" hint="Shown on product pages. Set to 0 to hide returns badge.">
                                        <Input type="number" min={0} value={content.delivery.returnDays ?? 7} onChange={(e) => update('delivery', { ...content.delivery, returnDays: Number(e.target.value) })} />
                                    </AdminField>
                                </div>
                            </AdminSection>

                            <AdminSection title="Payment Methods" description="Managed in Settings → Store Services. Individual products can override in the product editor.">
                                <p className="text-sm text-admin-muted">
                                    Cash on Delivery and Online Payment toggles are in{' '}
                                    <Link to={`${ADMIN_PATH}/settings`} className="text-primary font-medium hover:underline">
                                        Settings
                                    </Link>
                                    .
                                </p>
                            </AdminSection>

                            <AdminSection title="Footer">
                                <AdminField label="Footer Tagline">
                                    <Input value={content.footer.tagline} onChange={(e) => update('footer', { ...content.footer, tagline: e.target.value })} />
                                </AdminField>
                                <AdminField label="Footer Description">
                                    <AdminTextarea value={content.footer.description} onChange={(e) => update('footer', { ...content.footer, description: e.target.value })} rows={2} />
                                </AdminField>
                                <AdminField label="Instagram Card Text" hint="Small caption under the Instagram handle in the footer's Instagram card">
                                    <Input value={content.footer.instagramCardText} onChange={(e) => update('footer', { ...content.footer, instagramCardText: e.target.value })} />
                                </AdminField>
                                <AdminField label="Newsletter Card Title" hint="Heading above the email signup form in the footer">
                                    <Input value={content.footer.newsletterTitle} onChange={(e) => update('footer', { ...content.footer, newsletterTitle: e.target.value })} />
                                </AdminField>
                                <AdminField label="Newsletter Card Description">
                                    <AdminTextarea value={content.footer.newsletterDescription} onChange={(e) => update('footer', { ...content.footer, newsletterDescription: e.target.value })} rows={2} />
                                </AdminField>
                            </AdminSection>
                        </>
                    )}

                    {tab === 'homepage' && (
                        <>
                            <AdminSection
                                title="Top navigation bar"
                                description="What shoppers see in the bar at the top of every page. Products first: your categories. About, FAQ and Contact stay in the footer and the phone menu."
                            >
                                <AdminField label="Bar shows">
                                    <AdminSelect
                                        aria-label="Top bar mode"
                                        value={content.extras.nav.mode}
                                        onChange={(e) => updateExtras({ nav: { ...content.extras.nav, mode: e.target.value } })}
                                        className="w-full sm:w-96"
                                        options={[
                                            { value: 'categories', label: 'My categories (recommended — product first)' },
                                            { value: 'links', label: 'My own list of links (About, FAQ, …)' },
                                        ]}
                                    />
                                </AdminField>
                                {content.extras.nav.mode === 'categories' && (
                                    <>
                                        <label className="flex items-center gap-3 cursor-pointer">
                                            <input type="checkbox" className="h-4 w-4 accent-primary" checked={content.extras.nav.showAll} onChange={(e) => updateExtras({ nav: { ...content.extras.nav, showAll: e.target.checked } })} />
                                            <span className="text-sm text-ink">Show a “Shop” button first (opens all products)</span>
                                        </label>
                                        {content.extras.nav.showAll && (
                                            <AdminField label="Shop button text">
                                                <Input maxLength={20} className="w-48" value={content.extras.nav.shopLabel} onChange={(e) => updateExtras({ nav: { ...content.extras.nav, shopLabel: e.target.value } })} />
                                            </AdminField>
                                        )}
                                        <p className="text-caption text-admin-muted">Categories sit in a row that slides sideways. On the homepage it moves by itself to the category being scrolled past. On phones it is a second row under the logo.</p>
                                        <p className="text-caption text-admin-muted">
                                            Which categories appear, and their order, follow the “Category Shelves” section below — so the top bar and the homepage always match.
                                            A category with no products is hidden automatically. Rename, reorder or hide categories in{' '}
                                            <Link to={`${ADMIN_PATH}/categories`} className="text-primary font-medium hover:underline">Categories</Link>.
                                        </p>
                                    </>
                                )}
                            </AdminSection>

                            <AdminSection title="Homepage Sections" description="Drag a row to reorder it, use the switch to show/hide it, and click a section's name to open its content editor right here. Reordering and show/hide save immediately — no need to press Save for those.">
                                <SectionToggles
                                    sections={content.sections}
                                    labels={SECTION_LABELS}
                                    onChange={handleSectionsChange}
                                    renderContent={renderHomepageSectionContent}
                                />
                            </AdminSection>

                        </>
                    )}

                    {tab === 'about' && (
                        <AdminSection title="About Page">
                            <AdminField label="Hero Title">
                                <Input value={content.about.heroTitle} onChange={(e) => update('about', { ...content.about, heroTitle: e.target.value })} />
                            </AdminField>
                            <AdminField label="Hero Description">
                                <AdminTextarea value={content.about.heroDescription} onChange={(e) => update('about', { ...content.about, heroDescription: e.target.value })} rows={3} />
                            </AdminField>
                            <ImageUploadField label="Story Image" value={content.about.storyImage} onChange={(v) => update('about', { ...content.about, storyImage: v })} adminToken={adminToken} />
                            <AdminField label="Story Badge">
                                <Input value={content.about.storyBadge} onChange={(e) => update('about', { ...content.about, storyBadge: e.target.value })} />
                            </AdminField>
                            <AdminField label="Story Title">
                                <Input value={content.about.storyTitle} onChange={(e) => update('about', { ...content.about, storyTitle: e.target.value })} />
                            </AdminField>
                            <AdminField label="Story Paragraphs">
                                <StringListEditor
                                    items={content.about.storyParagraphs}
                                    onChange={(storyParagraphs) => update('about', { ...content.about, storyParagraphs })}
                                    placeholder="Paragraph text"
                                />
                            </AdminField>
                            <div className="grid sm:grid-cols-2 gap-4 mt-4">
                                <AdminField label="Mission Title">
                                    <Input value={content.about.missionTitle} onChange={(e) => update('about', { ...content.about, missionTitle: e.target.value })} />
                                </AdminField>
                                <AdminField label="Vision Title">
                                    <Input value={content.about.visionTitle} onChange={(e) => update('about', { ...content.about, visionTitle: e.target.value })} />
                                </AdminField>
                            </div>
                            <AdminField label="Mission Text">
                                <AdminTextarea value={content.about.missionText} onChange={(e) => update('about', { ...content.about, missionText: e.target.value })} rows={3} />
                            </AdminField>
                            <AdminField label="Vision Text">
                                <AdminTextarea value={content.about.visionText} onChange={(e) => update('about', { ...content.about, visionText: e.target.value })} rows={3} />
                            </AdminField>
                        </AdminSection>
                    )}

                    {tab === 'contact' && (
                        <>
                            <AdminSection title="Contact Page Header">
                                <AdminField label="Subtitle">
                                    <Input value={content.contactPage.subtitle} onChange={(e) => update('contactPage', { ...content.contactPage, subtitle: e.target.value })} />
                                </AdminField>
                                <AdminField label="Title">
                                    <Input value={content.contactPage.title} onChange={(e) => update('contactPage', { ...content.contactPage, title: e.target.value })} />
                                </AdminField>
                                <AdminField label="Description">
                                    <AdminTextarea value={content.contactPage.description} onChange={(e) => update('contactPage', { ...content.contactPage, description: e.target.value })} />
                                </AdminField>
                            </AdminSection>
                            <AdminSection title="FAQs" description="Shown on the FAQ page (/faq)">
                                <FaqEditor faqs={content.contactPage.faqs} onChange={(faqs) => update('contactPage', { ...content.contactPage, faqs })} />
                            </AdminSection>
                        </>
                    )}

                    {tab === 'promo' && (
                        <>
                            <AdminSection title="SEO & Meta Tags">
                                <AdminField label="Page Title">
                                    <Input value={content.seo.title} onChange={(e) => update('seo', { ...content.seo, title: e.target.value })} />
                                </AdminField>
                                <AdminField label="Meta Description">
                                    <AdminTextarea value={content.seo.description} onChange={(e) => update('seo', { ...content.seo, description: e.target.value })} rows={3} />
                                </AdminField>
                            </AdminSection>
                        </>
                    )}

                    {tab === 'popup' && (
                        <AdminSection
                            title="Announcement Popup"
                            description="A site-wide popup shown after the page loads. Off by default — nothing shows until you enable it here."
                        >
                            <label className="flex items-center gap-3 cursor-pointer">
                                <button
                                    type="button"
                                    onClick={() => update('popup', { ...content.popup, enabled: !content.popup.enabled })}
                                    className={`relative w-12 h-6 rounded-full transition-colors ${content.popup.enabled ? 'bg-primary' : 'bg-muted/30'}`}
                                >
                                    <span className={`absolute top-0.5 w-5 h-5 bg-canvas rounded-full shadow transition-transform ${content.popup.enabled ? 'left-6' : 'left-0.5'}`} />
                                </button>
                                <span className="text-sm text-ink">Show announcement popup</span>
                            </label>

                            <div className="grid sm:grid-cols-2 gap-4">
                                <AdminField label="Type" hint="Steers which fields below apply.">
                                    <AdminSelect
                                        aria-label="Popup type"
                                        value={content.popup.type}
                                        onChange={(e) => update('popup', { ...content.popup, type: e.target.value })}
                                        className="w-full"
                                        options={[
                                            { value: 'info', label: 'Info / Announcement' },
                                            { value: 'coupon', label: 'Coupon' },
                                            { value: 'festival', label: 'Festival / Sale' },
                                            { value: 'product', label: 'Product Spotlight' },
                                            { value: 'category', label: 'Category Spotlight' },
                                            { value: 'spin', label: 'Spin the Wheel (win a discount)' },
                                        ]}
                                    />
                                </AdminField>
                                <AdminField label="Frequency" hint="How often a visitor sees it after dismissing.">
                                    <AdminSelect
                                        aria-label="Popup frequency"
                                        value={content.popup.frequency}
                                        onChange={(e) => update('popup', { ...content.popup, frequency: e.target.value })}
                                        className="w-full"
                                        options={[
                                            { value: 'session', label: 'Once per browser session' },
                                            { value: 'every_visit', label: 'Every visit / page load' },
                                            { value: 'once', label: 'Once ever (this browser)' },
                                        ]}
                                    />
                                </AdminField>
                            </div>

                            <AdminField label="Title">
                                <Input value={content.popup.title} onChange={(e) => update('popup', { ...content.popup, title: e.target.value })} />
                            </AdminField>
                            <AdminField label="Message">
                                <AdminTextarea value={content.popup.message} onChange={(e) => update('popup', { ...content.popup, message: e.target.value })} rows={3} />
                            </AdminField>
                            <ImageUploadField
                                label="Image (optional)"
                                value={content.popup.image}
                                onChange={(v) => update('popup', { ...content.popup, image: v })}
                                adminToken={adminToken}
                            />

                            {content.popup.type === 'coupon' && (
                                <AdminField label="Coupon Code">
                                    <Input value={content.popup.couponCode} onChange={(e) => update('popup', { ...content.popup, couponCode: e.target.value })} placeholder="WELCOME10" />
                                </AdminField>
                            )}

                            {content.popup.type === 'product' && (
                                <AdminField label="Featured Product">
                                    <AdminSelect
                                        aria-label="Popup product"
                                        value={content.popup.productId ?? ''}
                                        onChange={(e) => update('popup', { ...content.popup, productId: e.target.value || null })}
                                        className="w-full"
                                        options={[{ value: '', label: 'None' }, ...products.map((p) => ({ value: p.id, label: p.title }))]}
                                    />
                                </AdminField>
                            )}

                            {content.popup.type === 'category' && (
                                <AdminField label="Featured Category">
                                    <AdminSelect
                                        aria-label="Popup category"
                                        value={content.extras.popup.categorySlug}
                                        onChange={(e) => updateExtras({ popup: { ...content.extras.popup, categorySlug: e.target.value } })}
                                        className="w-full"
                                        options={[{ value: '', label: 'None' }, ...categories.map((c) => ({ value: c.slug, label: c.label }))]}
                                    />
                                </AdminField>
                            )}

                            {content.popup.type === 'spin' && (
                                <div className="space-y-3 rounded-lg border border-admin-border p-4">
                                    <div>
                                        <p className="text-sm font-semibold text-ink">Wheel slices</p>
                                        <p className="text-caption text-admin-muted">2 to 8 slices. A slice with a coupon wins that coupon; a slice with no coupon is “Better luck next time”. Weight is the relative chance (a 40 slice is twice as likely as a 20). The result is chosen on the server, and a coupon that has expired or run out is skipped automatically.</p>
                                    </div>
                                    {content.extras.spin.segments.map((segment, index) => {
                                        const patch = (change) => updateExtras({ spin: { ...content.extras.spin, segments: content.extras.spin.segments.map((s, i) => (i === index ? { ...s, ...change } : s)) } });
                                        return (
                                            <div key={index} className="grid gap-3 sm:grid-cols-[1fr_1fr_5.5rem_auto] sm:items-end">
                                                <AdminField label="Label on wheel"><Input value={segment.label} maxLength={24} placeholder="10% OFF" onChange={(e) => patch({ label: e.target.value })} /></AdminField>
                                                <AdminField label="Prize">
                                                    <AdminSelect
                                                        aria-label={`Slice ${index + 1} prize`}
                                                        value={segment.couponId}
                                                        onChange={(e) => patch({ couponId: e.target.value })}
                                                        className="w-full"
                                                        options={[{ value: '', label: 'No prize (better luck)' }, ...coupons.map((c) => ({ value: c.id, label: `${c.code}${c.isEnabled ? '' : ' (disabled)'}` }))]}
                                                    />
                                                </AdminField>
                                                <AdminField label="Weight"><Input type="number" min={0} max={100} value={segment.weight} onChange={(e) => patch({ weight: Number(e.target.value) || 0 })} /></AdminField>
                                                <Button variant="outline" size="sm" onClick={() => updateExtras({ spin: { ...content.extras.spin, segments: content.extras.spin.segments.filter((_, i) => i !== index) } })}>Remove</Button>
                                            </div>
                                        );
                                    })}
                                    {content.extras.spin.segments.length < 8 && (
                                        <Button variant="outline" size="sm" className="w-fit" onClick={() => updateExtras({ spin: { ...content.extras.spin, segments: [...content.extras.spin.segments, { label: '', couponId: '', weight: 10 }] } })}>Add slice</Button>
                                    )}
                                    {content.extras.spin.segments.length < 2 && <p className="text-caption text-danger">Add at least 2 slices or the wheel will not appear.</p>}
                                    <AdminField label="Spin again after (days)" hint="Per browser. 0 means one spin ever. Spins are also limited to 5 per day per network.">
                                        <Input type="number" min={0} max={365} className="w-32" value={content.extras.spin.cooldownDays} onChange={(e) => updateExtras({ spin: { ...content.extras.spin, cooldownDays: Number(e.target.value) || 0 } })} />
                                    </AdminField>
                                </div>
                            )}

                            <div className="grid sm:grid-cols-2 gap-4">
                                <AdminField label="CTA Button Label">
                                    <Input value={content.popup.ctaLabel} onChange={(e) => update('popup', { ...content.popup, ctaLabel: e.target.value })} placeholder="Shop Now" />
                                </AdminField>
                                <AdminField label="CTA Link">
                                    <Input value={content.popup.ctaHref} onChange={(e) => update('popup', { ...content.popup, ctaHref: e.target.value })} placeholder="/shop" />
                                </AdminField>
                            </div>

                            <AdminField label="Delay (seconds)" hint="How long after the page loads before it appears.">
                                <Input
                                    type="number"
                                    min={0}
                                    max={60}
                                    value={content.popup.delaySeconds}
                                    onChange={(e) => update('popup', { ...content.popup, delaySeconds: Number(e.target.value) || 0 })}
                                    className="w-32"
                                />
                            </AdminField>

                            <div className="grid sm:grid-cols-2 gap-4">
                                <AdminField label="Start showing (optional)" hint="Leave empty to start right away.">
                                    <Input type="datetime-local" value={content.extras.popup.startsAt} onChange={(e) => updateExtras({ popup: { ...content.extras.popup, startsAt: e.target.value } })} />
                                </AdminField>
                                <AdminField label="Stop showing (optional)" hint="Perfect for a sale: it switches itself off.">
                                    <Input type="datetime-local" value={content.extras.popup.endsAt} onChange={(e) => updateExtras({ popup: { ...content.extras.popup, endsAt: e.target.value } })} />
                                </AdminField>
                            </div>

                            <AdminField label="Where it appears" hint="It never shows in checkout, sign-in or this admin.">
                                <AdminSelect
                                    aria-label="Popup pages"
                                    value={content.extras.popup.pages}
                                    onChange={(e) => updateExtras({ popup: { ...content.extras.popup, pages: e.target.value } })}
                                    className="w-full sm:w-72"
                                    options={[{ value: 'all', label: 'Any storefront page' }, { value: 'home', label: 'Homepage only' }]}
                                />
                            </AdminField>

                            <div className="flex items-center gap-3">
                                <Button variant="outline" size="sm" onClick={() => setPreviewing(true)}>Preview popup</Button>
                                <span className="text-caption text-admin-muted">Shows exactly what visitors see, using your unsaved edits.</span>
                            </div>
                            {previewing && (
                                <PopupDialog
                                    popup={content.popup}
                                    product={products.find((p) => p.id === content.popup.productId) ?? null}
                                    category={categories.find((c) => c.slug === content.extras.popup.categorySlug) ?? null}
                                    segments={content.extras.spin.segments}
                                    preview
                                    onDismiss={() => setPreviewing(false)}
                                />
                            )}
                        </AdminSection>
                    )}

                    {tab === 'offer' && (
                        <AdminSection
                            title="Sticky Offer Tab"
                            description="A small tab fixed to the edge of every page (e.g. “Get 10% OFF”). Shoppers tap it, see how the offer works, and unlock the coupon code. The code is only revealed by the server, so it never appears in the page source."
                        >
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input type="checkbox" className="h-4 w-4 accent-primary" checked={content.extras.offerTab.enabled} onChange={(e) => updateExtras({ offerTab: { ...content.extras.offerTab, enabled: e.target.checked } })} />
                                <span className="text-sm text-ink">Show the offer tab on the website</span>
                            </label>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <AdminField label="Coupon to give" hint="Create coupons under Coupons. If it expires or runs out, the tab says the offer has ended.">
                                    <AdminSelect
                                        aria-label="Offer coupon"
                                        value={content.extras.offerTab.couponId}
                                        onChange={(e) => updateExtras({ offerTab: { ...content.extras.offerTab, couponId: e.target.value } })}
                                        className="w-full"
                                        options={[{ value: '', label: 'Choose a coupon' }, ...coupons.map((c) => ({ value: c.id, label: `${c.code}${c.isEnabled ? '' : ' (disabled)'}` }))]}
                                    />
                                </AdminField>
                                <AdminField label="Text on the tab"><Input maxLength={24} value={content.extras.offerTab.tabLabel} onChange={(e) => updateExtras({ offerTab: { ...content.extras.offerTab, tabLabel: e.target.value } })} /></AdminField>
                            </div>

                            <AdminField label="Panel heading"><Input maxLength={90} value={content.extras.offerTab.title} onChange={(e) => updateExtras({ offerTab: { ...content.extras.offerTab, title: e.target.value } })} /></AdminField>
                            <AdminField label="Panel description"><AdminTextarea rows={2} maxLength={200} value={content.extras.offerTab.subtitle} onChange={(e) => updateExtras({ offerTab: { ...content.extras.offerTab, subtitle: e.target.value } })} /></AdminField>

                            <AdminField label="How it works (up to 4 steps)">
                                <StringListEditor
                                    items={content.extras.offerTab.steps}
                                    onChange={(steps) => updateExtras({ offerTab: { ...content.extras.offerTab, steps: steps.slice(0, 4) } })}
                                    placeholder="e.g. Enter your email"
                                />
                            </AdminField>

                            <label className="flex items-center gap-3 cursor-pointer">
                                <input type="checkbox" className="h-4 w-4 accent-primary" checked={content.extras.offerTab.requireEmail} onChange={(e) => updateExtras({ offerTab: { ...content.extras.offerTab, requireEmail: e.target.checked } })} />
                                <span className="text-sm text-ink">Ask for an email before showing the code (the email is added to your newsletter list)</span>
                            </label>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <AdminField label="Button text"><Input maxLength={30} value={content.extras.offerTab.buttonLabel} onChange={(e) => updateExtras({ offerTab: { ...content.extras.offerTab, buttonLabel: e.target.value } })} /></AdminField>
                                <AdminField label="Appears after (seconds)"><Input type="number" min={0} max={120} className="w-28" value={content.extras.offerTab.delaySeconds} onChange={(e) => updateExtras({ offerTab: { ...content.extras.offerTab, delaySeconds: Number(e.target.value) || 0 } })} /></AdminField>
                                <AdminField label="Side of the screen">
                                    <AdminSelect aria-label="Tab side" value={content.extras.offerTab.side} onChange={(e) => updateExtras({ offerTab: { ...content.extras.offerTab, side: e.target.value } })} className="w-full" options={[{ value: 'right', label: 'Right edge' }, { value: 'left', label: 'Left edge' }]} />
                                </AdminField>
                                <AdminField label="Where it appears" hint="Never in checkout, sign-in or this admin.">
                                    <AdminSelect aria-label="Tab pages" value={content.extras.offerTab.pages} onChange={(e) => updateExtras({ offerTab: { ...content.extras.offerTab, pages: e.target.value } })} className="w-full" options={[{ value: 'all', label: 'Any storefront page' }, { value: 'home', label: 'Homepage only' }]} />
                                </AdminField>
                            </div>

                            <div className="flex items-center gap-3">
                                <Button variant="outline" size="sm" onClick={() => setPreviewingOffer(true)}>Preview panel</Button>
                                <span className="text-caption text-admin-muted">Uses your unsaved edits and never sends anything.</span>
                            </div>
                            {previewingOffer && <OfferPanel offer={content.extras.offerTab} onClose={() => setPreviewingOffer(false)} preview />}
                        </AdminSection>
                    )}

                    {tab === 'experience' && (
                        <>
                            <AdminSection
                                title="Delivery estimate"
                                description="Shown on product pages, the cart and order pages as “Delivery by 12 Oct – 15 Oct”. Leave both at 0 to show no date promise."
                            >
                                <div className="grid sm:grid-cols-2 gap-4">
                                    <AdminField label="Fastest (days)" hint="Days from order date.">
                                        <Input type="number" min={0} max={60} className="w-32" value={content.extras.delivery.minDays} onChange={(e) => updateExtras({ delivery: { ...content.extras.delivery, minDays: Number(e.target.value) || 0 } })} />
                                    </AdminField>
                                    <AdminField label="Slowest (days)">
                                        <Input type="number" min={0} max={60} className="w-32" value={content.extras.delivery.maxDays} onChange={(e) => updateExtras({ delivery: { ...content.extras.delivery, maxDays: Number(e.target.value) || 0 } })} />
                                    </AdminField>
                                </div>
                            </AdminSection>

                            <AdminSection title="Rotating announcements" description="Extra messages that rotate in the top bar after the main promo (e.g. “Free shipping over ₹499”). Up to 6.">
                                {content.extras.announcements.map((item, index) => (
                                    <div key={index} className="grid gap-3 sm:grid-cols-[1fr_12rem_auto] sm:items-end">
                                        <AdminField label={`Message ${index + 1}`}>
                                            <Input value={item.text} maxLength={140} onChange={(e) => updateExtras({ announcements: content.extras.announcements.map((a, i) => (i === index ? { ...a, text: e.target.value } : a)) })} />
                                        </AdminField>
                                        <AdminField label="Link (optional)">
                                            <Input value={item.href} placeholder="/shop" onChange={(e) => updateExtras({ announcements: content.extras.announcements.map((a, i) => (i === index ? { ...a, href: e.target.value } : a)) })} />
                                        </AdminField>
                                        <Button variant="outline" size="sm" onClick={() => updateExtras({ announcements: content.extras.announcements.filter((_, i) => i !== index) })}>Remove</Button>
                                    </div>
                                ))}
                                {content.extras.announcements.length < 6 && (
                                    <Button variant="outline" size="sm" onClick={() => updateExtras({ announcements: [...content.extras.announcements, { text: '', href: '' }] })}>Add message</Button>
                                )}
                            </AdminSection>

                            <AdminSection title="Shop by concern" description="Health goals shown under the categories on the homepage (e.g. Digestion, Hair care). Each opens the shop filtered by the keyword you set. Up to 8.">
                                {content.extras.concerns.map((item, index) => {
                                    const patch = (change) => updateExtras({ concerns: content.extras.concerns.map((c, i) => (i === index ? { ...c, ...change } : c)) });
                                    return (
                                        <div key={index} className="space-y-3 rounded-lg border border-admin-border p-4">
                                            <div className="grid gap-3 sm:grid-cols-2">
                                                <AdminField label="Name"><Input value={item.label} maxLength={40} placeholder="Digestion" onChange={(e) => patch({ label: e.target.value })} /></AdminField>
                                                <AdminField label="Shop keyword" hint="Matches product name, description or category."><Input value={item.search} maxLength={60} placeholder="digest" onChange={(e) => patch({ search: e.target.value })} /></AdminField>
                                            </div>
                                            <ImageUploadField label="Image (optional)" value={item.image} onChange={(v) => patch({ image: v })} adminToken={adminToken} />
                                            <Button variant="outline" size="sm" onClick={() => updateExtras({ concerns: content.extras.concerns.filter((_, i) => i !== index) })}>Remove</Button>
                                        </div>
                                    );
                                })}
                                {content.extras.concerns.length < 8 && (
                                    <Button variant="outline" size="sm" className="w-fit" onClick={() => updateExtras({ concerns: [...content.extras.concerns, { label: '', search: '', image: '' }] })}>Add concern</Button>
                                )}
                            </AdminSection>

                            <AdminSection title="Product page & account">
                                <AdminField label="Health disclaimer" hint="Shown at the bottom of every product page. Have it reviewed for your category.">
                                    <AdminTextarea rows={3} maxLength={600} value={content.extras.disclaimer} onChange={(e) => updateExtras({ disclaimer: e.target.value })} />
                                </AdminField>
                                <AdminField label="Restock reminder after (days)" hint="Account page suggests re-ordering a delivered product after this many days. 0 turns it off.">
                                    <Input type="number" min={0} max={365} className="w-32" value={content.extras.restockReminderDays} onChange={(e) => updateExtras({ restockReminderDays: Number(e.target.value) || 0 })} />
                                </AdminField>
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input type="checkbox" className="h-4 w-4 accent-primary" checked={content.extras.expertChat} onChange={(e) => updateExtras({ expertChat: e.target.checked })} />
                                    <span className="text-sm text-ink">Show “Ask an expert on WhatsApp” on product pages</span>
                                </label>
                            </AdminSection>
                        </>
                    )}
                </div>
            </div>

            <AdminSaveBar
                sticky
                hasChanges={hasChanges}
                saving={saving}
                saved={saved}
                onSave={handleSave}
                saveLabel="Save all changes"
            />
        </div>
    );
}
