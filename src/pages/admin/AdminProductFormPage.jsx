import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
    AlertCircle,
    Boxes,
    CreditCard,
    Eraser,
    ImageIcon,
    Layers,
    ListChecks,
    Package,
    Plus,
    ShieldCheck,
    Sparkles,
    Star,
    Tag,
    Trash2,
    Upload,
    Wand2,
    X,
} from 'lucide-react';
import { api, imageUrl } from '@/services/api';
import BannerManager from '@/components/admin/BannerManager';
import { useAdminAuth, ADMIN_PATH } from '@/contexts/AuthContext';
import { useSiteContent } from '@/contexts/SiteContentContext';
import { formatPrice } from '@/utils/formatPrice';
import { resolveBadgeLabel } from '@/utils/productTrustBadges';
import Button from '@/components/ui/Button';
import {
    fieldClass,
    FormLabel,
    FormSection,
    OptionalSection,
    SectionHeader,
} from '@/components/admin/AdminFormUi';

const TAG_OPTIONS = ['New', 'Sale', 'Limited', 'Best Seller', 'Combo Deal'];

// Keep labels in sync with BADGE_ICONS in src/utils/productTrustBadges.js
const BADGE_OPTIONS = [
    'FSSAI Certified',
    'Lab Tested',
    '100% Vegetarian',
    'Gluten-Free',
    'No Added Sugar',
    'GMP Certified',
    'Free Delivery',
    'Fast Returns',
];

function normalizeTag(value) {
    return value.trim().replace(/\s+/g, ' ');
}

function tagExists(tags, candidate) {
    const norm = normalizeTag(candidate).toLowerCase();
    return tags.some((t) => t.toLowerCase() === norm);
}

const DEFAULT_OPTIONAL = {
    tags: true,
    badges: true,
    features: false,
    payment: true,
    variants: false,
};

const emptyProduct = {
    title: '',
    price: '',
    originalPrice: '',
    discount: 0,
    category: '',
    tags: [],
    badges: [],
    showTrustBadges: true,
    rating: 0,
    reviewCount: 0,
    description: '',
    features: [''],
    stock: '',
    images: [],
    cutoutImages: [],
    variants: [],
    isNew: false,
    isBestSeller: false,
    isTrendingPinned: false,
    isPublished: true,
    codEnabled: true,
    onlinePaymentEnabled: true,
};

let variantSeq = 0;
function makeVariant(patch = {}) {
    variantSeq += 1;
    return {
        key: `new-${Date.now()}-${variantSeq}`, // stable React key only; not sent to the server unless it's a real id
        id: null,
        label: '',
        netQuantity: '',
        image: '', // '' = reuse the product's own photos
        price: '',
        originalPrice: '',
        stock: '',
        sku: '',
        isDefault: false,
        ...patch,
    };
}

// Cycled through so a fresh row's placeholder isn't always the same example
// — makes it obvious variants aren't only for "month supply" durations.
const VARIANT_LABEL_PLACEHOLDERS = ['e.g. Small', 'e.g. Large', 'e.g. 3 Month Supply', 'e.g. 250ml'];

export default function AdminProductFormPage() {
    const { id } = useParams();
    const isNew = !id || id === 'new';
    const navigate = useNavigate();
    const { adminToken } = useAdminAuth();
    const { content: siteContent } = useSiteContent();
    const [form, setForm] = useState(emptyProduct);
    const [categories, setCategories] = useState([]);
    const [customTag, setCustomTag] = useState('');
    const [customBadge, setCustomBadge] = useState('');
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');
    const [optional, setOptional] = useState(DEFAULT_OPTIONAL);

    const setOptionalSection = (key, value) => {
        setOptional((o) => ({ ...o, [key]: value }));
    };

    useEffect(() => {
        if (!adminToken) return;
        api.get('/api/categories/admin/all', adminToken).then(setCategories).catch(() => setCategories([]));
        if (!isNew && id) {
            api.get(`/api/products/admin/${id}`, adminToken).then((p) => {
                setForm({
                    title: p.title,
                    price: p.price,
                    originalPrice: p.originalPrice,
                    discount: p.discount,
                    category: p.category,
                    tags: p.tags,
                    badges: p.badges ?? [],
                    showTrustBadges: p.showTrustBadges !== false,
                    rating: p.rating,
                    reviewCount: p.reviewCount,
                    description: p.description,
                    features: p.features.length ? p.features : [''],
                    stock: p.stock,
                    images: p.images,
                    cutoutImages: p.cutoutImages ?? [],
                    variants: (p.variants ?? []).map((v) => makeVariant({
                        id: v.id,
                        label: v.label,
                        netQuantity: v.netQuantity ?? '',
                        image: v.image ?? '',
                        price: v.price,
                        originalPrice: v.originalPrice,
                        stock: v.stock,
                        sku: v.sku ?? '',
                        isDefault: v.isDefault,
                    })),
                    isNew: p.isNew,
                    isBestSeller: p.isBestSeller,
                    isTrendingPinned: p.isTrendingPinned,
                    isPublished: p.isPublished,
                    codEnabled: p.codEnabled !== false,
                    onlinePaymentEnabled: p.onlinePaymentEnabled !== false,
                });
                setOptional({
                    tags: (p.tags?.length > 0) || p.isNew || p.isBestSeller,
                    badges: p.showTrustBadges !== false,
                    features: p.features?.some((f) => f.trim()),
                    payment: p.codEnabled === false || p.onlinePaymentEnabled === false,
                    variants: (p.variants?.length ?? 0) > 0,
                });
            });
        }
    }, [adminToken, id, isNew]);

    const update = (key, value) => {
        setForm((prev) => ({ ...prev, [key]: value }));
    };

    // Once pack-size variants are on, the base Price/Original Price/Stock
    // fields are hidden and derived from the default variant instead — the
    // rest of the app (product cards, search, cart) still just reads the
    // product's own price/stock fields, so this is what keeps them accurate.
    const defaultVariant = optional.variants
        ? (form.variants.find((v) => v.isDefault) || form.variants[0])
        : null;

    const price = Number(defaultVariant ? defaultVariant.price : form.price);
    const originalPrice = Number(defaultVariant ? (defaultVariant.originalPrice || defaultVariant.price) : form.originalPrice);
    const stock = defaultVariant
        ? form.variants.reduce((sum, v) => sum + (Number(v.stock) || 0), 0)
        : Number(form.stock);

    const computedDiscount = useMemo(() => {
        if (!Number.isFinite(price) || !Number.isFinite(originalPrice) || originalPrice <= price) return 0;
        return Math.round(((originalPrice - price) / originalPrice) * 100);
    }, [price, originalPrice]);

    const handleImageUpload = async (e) => {
        if (!adminToken || !e.target.files?.length) return;
        setUploading(true);
        setError('');
        try {
            const urls = await api.upload(Array.from(e.target.files), adminToken);
            setForm((prev) => ({ ...prev, images: [...prev.images, ...urls] }));
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Upload failed');
        } finally {
            setUploading(false);
            e.target.value = '';
        }
    };

    // A variant's cover photo doesn't have to already be one of the
    // product's own gallery images — this uploads a brand-new photo
    // dedicated to just this one option (e.g. a different color/flavor
    // never shown elsewhere on the product).
    const [uploadingVariantPhoto, setUploadingVariantPhoto] = useState(null);
    const handleVariantPhotoUpload = async (index, e) => {
        if (!adminToken || !e.target.files?.length) return;
        setUploadingVariantPhoto(index);
        setError('');
        try {
            const urls = await api.upload(Array.from(e.target.files).slice(0, 1), adminToken);
            if (urls[0]) updateVariant(index, { image: urls[0] });
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Upload failed');
        } finally {
            setUploadingVariantPhoto(null);
            e.target.value = '';
        }
    };

    // "Cutout" images — background-removed versions of the gallery photos
    // above. Storefront spots that show the product inside a small round
    // container (the homepage Orbit Ring "dabbi") prefer these when present,
    // since a transparent PNG sits inside a circular frame cleanly while a
    // white-background studio shot shows a hard square edge behind the
    // circle. Processing runs entirely in the admin's own browser — nothing
    // is sent anywhere until the result is uploaded like any other photo.
    const [cutoutSourceIndex, setCutoutSourceIndex] = useState(null); // index into form.images currently processing
    const [cutoutProgress, setCutoutProgress] = useState(null); // { label, ratio } | null

    const handleRemoveBackground = async (sourceImg, index) => {
        if (!adminToken) return;
        setCutoutSourceIndex(index);
        setCutoutProgress({ label: 'Starting…', ratio: 0 });
        setError('');
        try {
            // Dynamically imported: this pulls in the (fairly large) in-browser
            // ONNX/WASM background-removal engine, which the product form
            // otherwise has no reason to load just to show/edit a product.
            const { removeImageBackground, blobToFile } = await import('@/utils/removeBackground');
            const blob = await removeImageBackground(imageUrl(sourceImg), (label, ratio) => {
                setCutoutProgress({ label, ratio });
            });
            const file = blobToFile(blob, `cutout-${Date.now()}.png`);
            const urls = await api.upload([file], adminToken);
            if (urls[0]) {
                setForm((prev) => ({ ...prev, cutoutImages: [...prev.cutoutImages, urls[0]] }));
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Background removal failed — try a different photo.');
        } finally {
            setCutoutSourceIndex(null);
            setCutoutProgress(null);
        }
    };

    const removeCutoutImage = (i) => {
        setForm((prev) => ({ ...prev, cutoutImages: prev.cutoutImages.filter((_, j) => j !== i) }));
    };

    const toggleTag = (tag) => {
        const normalized = normalizeTag(tag);
        if (!normalized) return;
        setForm((prev) => ({
            ...prev,
            tags: tagExists(prev.tags, normalized)
                ? prev.tags.filter((t) => t.toLowerCase() !== normalized.toLowerCase())
                : [...prev.tags, normalized],
        }));
    };

    const addCustomTag = () => {
        const normalized = normalizeTag(customTag);
        if (!normalized) return;
        setForm((prev) => {
            if (tagExists(prev.tags, normalized)) return prev;
            return { ...prev, tags: [...prev.tags, normalized] };
        });
        setCustomTag('');
        setOptional((o) => ({ ...o, tags: true }));
    };

    const removeTag = (tag) => {
        setForm((prev) => ({
            ...prev,
            tags: prev.tags.filter((t) => t !== tag),
        }));
    };

    const customTagsOnly = useMemo(
        () => form.tags.filter((t) => !TAG_OPTIONS.some((opt) => opt.toLowerCase() === t.toLowerCase())),
        [form.tags],
    );

    const toggleBadge = (badge) => {
        const normalized = normalizeTag(badge);
        if (!normalized) return;
        setForm((prev) => ({
            ...prev,
            badges: tagExists(prev.badges, normalized)
                ? prev.badges.filter((b) => b.toLowerCase() !== normalized.toLowerCase())
                : [...prev.badges, normalized],
        }));
    };

    const addCustomBadge = () => {
        const normalized = normalizeTag(customBadge);
        if (!normalized) return;
        setForm((prev) => {
            if (tagExists(prev.badges, normalized)) return prev;
            return { ...prev, badges: [...prev.badges, normalized] };
        });
        setCustomBadge('');
    };

    const removeBadge = (badge) => {
        setForm((prev) => ({
            ...prev,
            badges: prev.badges.filter((b) => b !== badge),
        }));
    };

    const customBadgesOnly = useMemo(
        () => form.badges.filter((b) => !BADGE_OPTIONS.some((opt) => opt.toLowerCase() === b.toLowerCase())),
        [form.badges],
    );

    const toggleBadgesSection = (v) => {
        setOptionalSection('badges', v);
        setForm((prev) => ({ ...prev, showTrustBadges: v, badges: v ? prev.badges : [] }));
    };

    // ---- Variants: one product, multiple buyable options — different
    // sizes (Small/Medium/Large, 100ml/250ml/500ml), pack counts, or
    // durations (1/3/6 Month Supply). All options share the same photos,
    // description, and category as the product above — only label,
    // quantity label, price, and stock differ per option. ----------------

    const toggleVariantsSection = (v) => {
        setOptionalSection('variants', v);
        if (v && form.variants.length === 0) {
            setForm((prev) => ({ ...prev, variants: [makeVariant({ isDefault: true }), makeVariant({})] }));
        } else if (!v) {
            setForm((prev) => ({ ...prev, variants: [] }));
        }
    };

    const addVariant = () => {
        setForm((prev) => ({
            ...prev,
            variants: [...prev.variants, makeVariant({ isDefault: prev.variants.length === 0 })],
        }));
    };

    const updateVariant = (index, patch) => {
        setForm((prev) => ({
            ...prev,
            variants: prev.variants.map((v, i) => (i === index ? { ...v, ...patch } : v)),
        }));
    };

    const removeVariant = (index) => {
        setForm((prev) => {
            const next = prev.variants.filter((_, i) => i !== index);
            // Keep exactly one default so the storefront always has a
            // pre-selected option — promote the first remaining variant if
            // the one just removed was it.
            if (next.length > 0 && !next.some((v) => v.isDefault)) {
                next[0] = { ...next[0], isDefault: true };
            }
            return { ...prev, variants: next };
        });
    };

    const setDefaultVariant = (index) => {
        setForm((prev) => ({
            ...prev,
            variants: prev.variants.map((v, i) => ({ ...v, isDefault: i === index })),
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!adminToken) return;

        setError('');

        if (!form.images?.length) {
            setError('Please upload at least one product image.');
            return;
        }
        if (!form.category) {
            setError('Please select a category.');
            return;
        }
        if (!form.title.trim()) {
            setError('Please enter a product title.');
            return;
        }
        if (!form.description.trim()) {
            setError('Please enter a product description.');
            return;
        }
        if (!Number.isFinite(price) || price <= 0) {
            setError('Please enter a valid price greater than 0.');
            return;
        }
        if (!Number.isFinite(originalPrice) || originalPrice <= 0) {
            setError('Please enter a valid original price greater than 0.');
            return;
        }
        if (!Number.isFinite(stock) || stock < 0) {
            setError('Please enter a valid stock quantity (0 or more).');
            return;
        }
        if (optional.variants) {
            if (form.variants.length < 2) {
                setError('Add at least 2 options (e.g. "Small" / "Large", or "100ml" / "250ml") — or turn Variants off if this product only comes one way.');
                return;
            }
            for (const v of form.variants) {
                if (!v.label.trim()) {
                    setError('Every option needs a label (e.g. "Large", "250ml", or "3 Month Supply").');
                    return;
                }
                if (!Number.isFinite(Number(v.price)) || Number(v.price) <= 0) {
                    setError(`Enter a valid price for "${v.label}".`);
                    return;
                }
                if (!Number.isFinite(Number(v.stock)) || Number(v.stock) < 0) {
                    setError(`Enter a valid stock quantity for "${v.label}".`);
                    return;
                }
            }
        }

        setSaving(true);

        try {
            const cleanVariants = optional.variants
                ? form.variants.map((v) => ({
                    id: v.id || undefined,
                    label: v.label.trim(),
                    netQuantity: v.netQuantity.trim() || null,
                    image: v.image || null,
                    price: Number(v.price),
                    originalPrice: Number(v.originalPrice) || Number(v.price),
                    stock: Number(v.stock) || 0,
                    sku: v.sku.trim() || null,
                    isDefault: v.isDefault,
                }))
                : [];

            const payload = {
                ...form,
                title: form.title.trim(),
                description: form.description.trim(),
                price,
                originalPrice,
                stock,
                tags: form.tags.map((t) => normalizeTag(t)).filter(Boolean),
                badges: form.badges.map((b) => normalizeTag(b)).filter(Boolean),
                features: form.features.filter((f) => f.trim()),
                discount: computedDiscount,
                variants: cleanVariants,
                cutoutImages: form.cutoutImages,
                // Still deliberately NOT sending enable3dPreview: this form has no
                // UI for it, and previously sent enable3DPreview:false unconditionally
                // on every save — silently wiping any product's 3D-preview flag on
                // every single edit. Omitting the key lets the backend leave it
                // untouched. cutoutImages, above, now has real UI (below) so it's
                // safe — and necessary — to send explicitly like every other field.
            };

            if (isNew) {
                await api.post('/api/products', payload, adminToken);
            } else {
                await api.put(`/api/products/${id}`, payload, adminToken);
            }

            navigate(`${ADMIN_PATH}/products`);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Save failed');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="max-w-5xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
                <div>
                    <h1 className="font-display text-3xl text-ink mb-1 max-lg:hidden">
                        {isNew ? 'Add Product' : 'Edit Product'}
                    </h1>
                    <p className="text-admin-muted text-sm max-w-xl">
                        {isNew
                            ? 'Create a catalog item with photos and pricing. Only basics, pricing, and images are required.'
                            : 'Update product details, images, and store settings.'}
                    </p>
                </div>
                <Link to={`${ADMIN_PATH}/products`}>
                    <Button variant="outline" size="sm" className="normal-case tracking-normal">
                        Back to products
                    </Button>
                </Link>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                    <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex gap-3">
                        <AlertCircle size={18} className="flex-shrink-0" />
                        <span>{error}</span>
                    </div>
                )}

                <FormSection>
                    <SectionHeader
                        icon={Package}
                        title="Product info"
                        description="Title, description, and category"
                    />
                    <div className="space-y-3">
                        <div>
                            <FormLabel required>Title</FormLabel>
                            <input
                                value={form.title}
                                onChange={(e) => update('title', e.target.value)}
                                className={fieldClass}
                                placeholder="e.g. Plant Protein Isolate"
                                required
                            />
                        </div>
                        <div>
                            <FormLabel required>Description</FormLabel>
                            <textarea
                                value={form.description}
                                onChange={(e) => update('description', e.target.value)}
                                rows={4}
                                required
                                className={`${fieldClass} resize-none rounded-xl`}
                                placeholder="Describe materials, finish, and occasion…"
                            />
                        </div>
                        <div>
                            <FormLabel required>Category</FormLabel>
                            <select
                                value={form.category}
                                onChange={(e) => update('category', e.target.value)}
                                required
                                className={fieldClass}
                            >
                                <option value="">Select category</option>
                                {categories.map((c) => (
                                    <option key={c.id} value={c.slug}>{c.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </FormSection>

                <FormSection>
                    <SectionHeader
                        icon={Tag}
                        title="Pricing & stock"
                        description={optional.variants
                            ? 'Managed per option below — this product has multiple variants'
                            : 'Sale price, MRP, and inventory'}
                    />
                    {!optional.variants && (
                        <div className="grid sm:grid-cols-3 gap-3">
                            <div>
                                <FormLabel required>Price (₹)</FormLabel>
                                <input
                                    type="number"
                                    min="1"
                                    value={form.price}
                                    onChange={(e) => update('price', e.target.value)}
                                    className={fieldClass}
                                    placeholder="2499"
                                    required
                                />
                            </div>
                            <div>
                                <FormLabel required>Original price (₹)</FormLabel>
                                <input
                                    type="number"
                                    min="1"
                                    value={form.originalPrice}
                                    onChange={(e) => update('originalPrice', e.target.value)}
                                    className={fieldClass}
                                    placeholder="3499"
                                    required
                                />
                            </div>
                            <div>
                                <FormLabel required>Stock</FormLabel>
                                <input
                                    type="number"
                                    min="0"
                                    value={form.stock}
                                    onChange={(e) => update('stock', e.target.value)}
                                    className={fieldClass}
                                    placeholder="10"
                                    required
                                />
                            </div>
                        </div>
                    )}
                    {Number.isFinite(price) && price > 0 && Number.isFinite(originalPrice) && originalPrice > 0 && (
                        <div className="rounded-xl border border-admin-border bg-admin-surface-alt p-3 flex flex-wrap items-center justify-between gap-2 text-sm">
                            <span className="text-admin-muted">
                                {optional.variants ? `Customer sees (default: "${defaultVariant?.label || '—'}")` : 'Customer sees'}
                            </span>
                            <div className="flex items-center gap-3">
                                <span className="font-semibold text-ink">{formatPrice(price)}</span>
                                {originalPrice > price && (
                                    <>
                                        <span className="text-admin-muted/80 line-through">{formatPrice(originalPrice)}</span>
                                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                                            {computedDiscount}% off
                                        </span>
                                    </>
                                )}
                            </div>
                        </div>
                    )}

                    <OptionalSection
                        icon={Boxes}
                        title="Variants (sizes, packs, durations…)"
                        description="One product, multiple buyable options — different sizes (Small/Medium/Large, 100ml/250ml/500ml), pack counts, or durations (1/3/6 Month Supply) — each with its own price and stock. The customer picks one on the product page; everything else about the product (photos, description, category) stays shared."
                        enabled={optional.variants}
                        onToggle={toggleVariantsSection}
                    >
                        <p className="text-xs text-admin-muted -mt-1">
                            No need to upload separate photos per option — every variant shows the same photos you set above by default. Pick a different cover photo per option below only if it genuinely looks different (e.g. a different color).
                        </p>
                        <div className="space-y-3">
                            {form.variants.map((v, i) => (
                                <div key={v.key} className="rounded-xl border border-admin-border bg-admin-surface-alt p-3 sm:p-4 space-y-3">
                                    <div className="flex items-start justify-between gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setDefaultVariant(i)}
                                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-colors ${
                                                v.isDefault
                                                    ? 'bg-primary text-canvas border-primary'
                                                    : 'border-admin-border text-admin-muted hover:border-primary/40 bg-white'
                                            }`}
                                            title="Pre-selected option on the product page"
                                        >
                                            <Star size={11} fill={v.isDefault ? 'currentColor' : 'none'} />
                                            {v.isDefault ? 'Default option' : 'Set as default'}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => removeVariant(i)}
                                            className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 shrink-0"
                                            aria-label="Remove option"
                                        >
                                            <Trash2 size={15} />
                                        </button>
                                    </div>

                                    <div className="grid sm:grid-cols-2 gap-3">
                                        <div>
                                            <FormLabel required>Label</FormLabel>
                                            <input
                                                value={v.label}
                                                onChange={(e) => updateVariant(i, { label: e.target.value })}
                                                className={fieldClass}
                                                placeholder={VARIANT_LABEL_PLACEHOLDERS[i % VARIANT_LABEL_PLACEHOLDERS.length]}
                                                required
                                            />
                                        </div>
                                        <div>
                                            <FormLabel>Size / quantity label</FormLabel>
                                            <input
                                                value={v.netQuantity}
                                                onChange={(e) => updateVariant(i, { netQuantity: e.target.value })}
                                                className={fieldClass}
                                                placeholder="e.g. 250ml, 60 capsules, 180g"
                                            />
                                        </div>
                                    </div>

                                    {form.images.length > 0 && (
                                        <div>
                                            <FormLabel>Cover photo for this option</FormLabel>
                                            <div className="flex flex-wrap gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => updateVariant(i, { image: '' })}
                                                    className={`px-3 py-2 rounded-lg border text-xs transition-colors ${
                                                        !v.image ? 'border-primary bg-primary/5 text-primary' : 'border-admin-border text-admin-muted hover:border-primary/30'
                                                    }`}
                                                >
                                                    Same as product
                                                </button>
                                                {form.images.map((img) => (
                                                    <button
                                                        key={img}
                                                        type="button"
                                                        onClick={() => updateVariant(i, { image: img })}
                                                        className={`w-11 h-11 rounded-lg overflow-hidden border-2 transition-colors shrink-0 ${
                                                            v.image === img ? 'border-primary' : 'border-transparent opacity-70 hover:opacity-100'
                                                        }`}
                                                        title="Use this photo for this option"
                                                    >
                                                        <img src={imageUrl(img)} alt="" className="w-full h-full object-cover" />
                                                    </button>
                                                ))}
                                                {v.image && !form.images.includes(v.image) && (
                                                    <button
                                                        type="button"
                                                        className="w-11 h-11 rounded-lg overflow-hidden border-2 border-primary shrink-0"
                                                        title="This option's own uploaded photo"
                                                    >
                                                        <img src={imageUrl(v.image)} alt="" className="w-full h-full object-cover" />
                                                    </button>
                                                )}
                                                <label
                                                    className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-dashed text-xs cursor-pointer transition-colors ${
                                                        uploadingVariantPhoto === i
                                                            ? 'border-admin-border text-admin-muted pointer-events-none'
                                                            : 'border-primary/40 text-primary hover:bg-primary/5'
                                                    }`}
                                                >
                                                    <Upload size={12} />
                                                    {uploadingVariantPhoto === i ? 'Uploading…' : 'Upload new'}
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        className="hidden"
                                                        onChange={(e) => handleVariantPhotoUpload(i, e)}
                                                        disabled={uploadingVariantPhoto === i}
                                                    />
                                                </label>
                                            </div>
                                            <p className="text-[11px] text-admin-muted mt-1.5">
                                                Pick one of the photos above, or upload a photo just for this option (e.g. a different color) — it won't be added to the main gallery.
                                            </p>
                                        </div>
                                    )}

                                    <div className="grid sm:grid-cols-3 gap-3">
                                        <div>
                                            <FormLabel required>Price (₹)</FormLabel>
                                            <input
                                                type="number"
                                                min="1"
                                                value={v.price}
                                                onChange={(e) => updateVariant(i, { price: e.target.value })}
                                                className={fieldClass}
                                                placeholder="1799"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <FormLabel>Original price (₹)</FormLabel>
                                            <input
                                                type="number"
                                                min="1"
                                                value={v.originalPrice}
                                                onChange={(e) => updateVariant(i, { originalPrice: e.target.value })}
                                                className={fieldClass}
                                                placeholder="2697"
                                            />
                                        </div>
                                        <div>
                                            <FormLabel required>Stock</FormLabel>
                                            <input
                                                type="number"
                                                min="0"
                                                value={v.stock}
                                                onChange={(e) => updateVariant(i, { stock: e.target.value })}
                                                className={fieldClass}
                                                placeholder="40"
                                                required
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <button
                            type="button"
                            onClick={addVariant}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-primary bg-primary/5 hover:bg-primary/10 border border-primary/20"
                        >
                            <Plus size={14} /> Add option
                        </button>
                    </OptionalSection>
                </FormSection>

                <FormSection>
                    <SectionHeader
                        icon={ImageIcon}
                        title="Photos"
                        description="At least one image required"
                        action={(
                            <label className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-primary bg-primary/5 hover:bg-primary/10 border border-primary/20 cursor-pointer">
                                <Upload size={14} />
                                {uploading ? 'Uploading…' : 'Upload'}
                                <input type="file" multiple accept="image/*" className="hidden" onChange={handleImageUpload} />
                            </label>
                        )}
                    />
                    {form.images.length === 0 ? (
                        <label className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-admin-border bg-admin-surface-alt py-12 cursor-pointer hover:border-primary/30 hover:bg-primary/5 transition-colors">
                            <ImageIcon size={32} className="text-admin-muted/40" />
                            <span className="text-sm text-admin-muted">Click to upload product images</span>
                            <span className="text-xs text-admin-muted">JPG, PNG, WebP · max 5MB each</span>
                            <input type="file" multiple accept="image/*" className="hidden" onChange={handleImageUpload} />
                        </label>
                    ) : (
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                            {form.images.map((img, i) => (
                                <div key={i} className="relative group aspect-square rounded-xl overflow-hidden border border-admin-border bg-admin-surface-alt">
                                    <img src={imageUrl(img)} alt="" className="w-full h-full object-cover" />
                                    <button
                                        type="button"
                                        onClick={() => setForm((prev) => ({
                                            ...prev,
                                            images: prev.images.filter((_, j) => j !== i),
                                        }))}
                                        className="absolute top-1.5 right-1.5 p-1.5 rounded-lg bg-red-500 text-white opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shadow-sm"
                                        aria-label="Remove image"
                                    >
                                        <X size={12} />
                                    </button>
                                    {i === 0 ? (
                                        <span className="absolute bottom-1.5 left-1.5 text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-ink/70 text-white">
                                            Cover
                                        </span>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => setForm((prev) => {
                                                const next = [...prev.images];
                                                const [picked] = next.splice(i, 1);
                                                next.unshift(picked);
                                                return { ...prev, images: next };
                                            })}
                                            className="absolute bottom-1.5 left-1.5 text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-ink/60 text-white opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                                        >
                                            Set as cover
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveBackground(img, i)}
                                        disabled={cutoutSourceIndex !== null}
                                        title="Remove background — creates a transparent cutout for round product containers"
                                        className="absolute top-1.5 left-1.5 p-1.5 rounded-lg bg-white/90 text-primary opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                        aria-label="Remove background"
                                    >
                                        {cutoutSourceIndex === i ? (
                                            <Wand2 size={12} className="animate-pulse" />
                                        ) : (
                                            <Eraser size={12} />
                                        )}
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    {cutoutProgress && (
                        <div className="mt-3 rounded-lg border border-primary/20 bg-primary/5 p-3">
                            <div className="flex items-center justify-between text-xs text-primary font-medium mb-1.5">
                                <span className="inline-flex items-center gap-1.5"><Wand2 size={12} /> {cutoutProgress.label}</span>
                                <span>{Math.round(cutoutProgress.ratio * 100)}%</span>
                            </div>
                            <div className="h-1.5 rounded-full bg-primary/15 overflow-hidden">
                                <div
                                    className="h-full bg-primary rounded-full transition-[width] duration-200"
                                    style={{ width: `${Math.max(4, Math.round(cutoutProgress.ratio * 100))}%` }}
                                />
                            </div>
                            <p className="text-[11px] text-admin-muted mt-1.5">
                                First use on this device downloads a one-time AI model (up to ~40MB) — every removal after that is quick.
                            </p>
                        </div>
                    )}

                    {form.cutoutImages.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-admin-border-light">
                            <p className="text-xs font-medium text-admin-muted mb-2.5 flex items-center gap-1.5">
                                <Eraser size={12} /> Background-removed cutouts
                                <span className="text-admin-muted/70 font-normal">— used automatically in round product containers (e.g. the homepage Orbit Ring)</span>
                            </p>
                            <div
                                className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3"
                                style={{ backgroundImage: 'linear-gradient(45deg, #0000000d 25%, transparent 25%), linear-gradient(-45deg, #0000000d 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #0000000d 75%), linear-gradient(-45deg, transparent 75%, #0000000d 75%)', backgroundSize: '16px 16px', backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px' }}
                            >
                                {form.cutoutImages.map((img, i) => (
                                    <div key={img} className="relative group aspect-square rounded-xl overflow-hidden border border-admin-border">
                                        <img src={imageUrl(img)} alt="" className="w-full h-full object-contain p-1" />
                                        <button
                                            type="button"
                                            onClick={() => removeCutoutImage(i)}
                                            className="absolute top-1.5 right-1.5 p-1.5 rounded-lg bg-red-500 text-white opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shadow-sm"
                                            aria-label="Remove cutout"
                                        >
                                            <X size={12} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </FormSection>

                <FormSection>
                    <SectionHeader
                        icon={Layers}
                        title="Store settings"
                        description="Visibility and optional extras"
                    />

                    <div>
                        <FormLabel>Visibility</FormLabel>
                        <div className="grid sm:grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => update('isPublished', true)}
                                className={`rounded-xl border p-3 text-left transition-all ${
                                    form.isPublished
                                        ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                                        : 'border-admin-border bg-admin-surface-alt hover:border-line'
                                }`}
                            >
                                <p className="text-sm font-semibold text-ink">Published</p>
                                <p className="text-[11px] text-admin-muted mt-0.5">Visible on the storefront</p>
                            </button>
                            <button
                                type="button"
                                onClick={() => update('isPublished', false)}
                                className={`rounded-xl border p-3 text-left transition-all ${
                                    !form.isPublished
                                        ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                                        : 'border-admin-border bg-admin-surface-alt hover:border-line'
                                }`}
                            >
                                <p className="text-sm font-semibold text-ink">Hidden</p>
                                <p className="text-[11px] text-admin-muted mt-0.5">Draft — not shown to customers</p>
                            </button>
                        </div>
                    </div>

                    <OptionalSection
                        icon={Sparkles}
                        title="Tags & badges"
                        description="Sale tags, new arrival, and best seller"
                        enabled={optional.tags}
                        onToggle={(v) => setOptionalSection('tags', v)}
                    >
                        <div className="flex flex-wrap gap-2">
                            {TAG_OPTIONS.map((tag) => (
                                <button
                                    key={tag}
                                    type="button"
                                    onClick={() => toggleTag(tag)}
                                    className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${
                                        tagExists(form.tags, tag)
                                            ? 'bg-primary text-canvas border-primary'
                                            : 'border-admin-border text-admin-muted hover:border-primary/40 bg-white'
                                    }`}
                                >
                                    {tag}
                                </button>
                            ))}
                        </div>

                        {customTagsOnly.length > 0 && (
                            <div>
                                <p className="text-[10px] uppercase tracking-wider text-admin-muted mb-2">Custom tags</p>
                                <div className="flex flex-wrap gap-2">
                                    {customTagsOnly.map((tag) => (
                                        <span
                                            key={tag}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs bg-primary/10 text-primary border border-primary/25"
                                        >
                                            {tag}
                                            <button
                                                type="button"
                                                onClick={() => removeTag(tag)}
                                                className="p-0.5 rounded-full hover:bg-primary/20"
                                                aria-label={`Remove ${tag}`}
                                            >
                                                <X size={12} />
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="flex gap-2">
                            <input
                                value={customTag}
                                onChange={(e) => setCustomTag(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        addCustomTag();
                                    }
                                }}
                                placeholder="Type a custom tag and press Enter"
                                className={fieldClass}
                            />
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="normal-case tracking-normal shrink-0"
                                onClick={addCustomTag}
                                disabled={!normalizeTag(customTag)}
                            >
                                Add
                            </Button>
                        </div>
                        <div className="grid sm:grid-cols-2 gap-3 pt-1">
                            <label className="flex items-start gap-3 cursor-pointer rounded-lg border border-admin-border p-3 bg-admin-surface-alt">
                                <input
                                    type="checkbox"
                                    checked={form.isNew}
                                    onChange={(e) => update('isNew', e.target.checked)}
                                    className="mt-0.5 rounded border-line"
                                />
                                <span>
                                    <span className="text-sm font-medium text-ink">New arrival</span>
                                    <span className="text-xs text-admin-muted block mt-0.5">Highlight in new arrivals</span>
                                </span>
                            </label>
                            <label className="flex items-start gap-3 cursor-pointer rounded-lg border border-admin-border p-3 bg-admin-surface-alt">
                                <input
                                    type="checkbox"
                                    checked={form.isBestSeller}
                                    onChange={(e) => update('isBestSeller', e.target.checked)}
                                    className="mt-0.5 rounded border-line"
                                />
                                <span>
                                    <span className="text-sm font-medium text-ink">Best seller</span>
                                    <span className="text-xs text-admin-muted block mt-0.5">Show best seller badge</span>
                                </span>
                            </label>
                            <label className="flex items-start gap-3 cursor-pointer rounded-lg border border-admin-border p-3 bg-admin-surface-alt">
                                <input
                                    type="checkbox"
                                    checked={form.isTrendingPinned}
                                    onChange={(e) => update('isTrendingPinned', e.target.checked)}
                                    className="mt-0.5 rounded border-line"
                                />
                                <span>
                                    <span className="text-sm font-medium text-ink">Pin to Trending</span>
                                    <span className="text-xs text-admin-muted block mt-0.5">Force into the homepage &quot;Trending Now&quot; row, ahead of real sales data</span>
                                </span>
                            </label>
                        </div>
                    </OptionalSection>

                    <OptionalSection
                        icon={ShieldCheck}
                        title="Trust badges"
                        description="The whole badge row on the product page — quality highlights, free delivery, and returns. Turn off to hide it entirely for this product."
                        enabled={optional.badges}
                        onToggle={toggleBadgesSection}
                    >
                        <div className="flex flex-wrap gap-2">
                            {BADGE_OPTIONS.map((badge) => (
                                <button
                                    key={badge}
                                    type="button"
                                    onClick={() => toggleBadge(badge)}
                                    className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${
                                        tagExists(form.badges, badge)
                                            ? 'bg-primary text-canvas border-primary'
                                            : 'border-admin-border text-admin-muted hover:border-primary/40 bg-white'
                                    }`}
                                >
                                    {resolveBadgeLabel(badge, siteContent)}
                                </button>
                            ))}
                        </div>

                        {customBadgesOnly.length > 0 && (
                            <div>
                                <p className="text-[10px] uppercase tracking-wider text-admin-muted mb-2">Custom badges</p>
                                <div className="flex flex-wrap gap-2">
                                    {customBadgesOnly.map((badge) => (
                                        <span
                                            key={badge}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs bg-primary/10 text-primary border border-primary/25"
                                        >
                                            {badge}
                                            <button
                                                type="button"
                                                onClick={() => removeBadge(badge)}
                                                className="p-0.5 rounded-full hover:bg-primary/20"
                                                aria-label={`Remove ${badge}`}
                                            >
                                                <X size={12} />
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="flex gap-2">
                            <input
                                value={customBadge}
                                onChange={(e) => setCustomBadge(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        addCustomBadge();
                                    }
                                }}
                                placeholder="Type a custom badge and press Enter"
                                className={fieldClass}
                            />
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="normal-case tracking-normal shrink-0"
                                onClick={addCustomBadge}
                                disabled={!normalizeTag(customBadge)}
                            >
                                Add
                            </Button>
                        </div>
                        {form.badges.length === 0 && (
                            <p className="text-xs text-admin-muted">
                                No quality badges picked yet — the Free Delivery and Returns badges will still show below them. Turn the whole section off above to hide the row completely.
                            </p>
                        )}
                    </OptionalSection>

                    <OptionalSection
                        icon={ListChecks}
                        title="Product features"
                        description="Bullet points shown on the product page"
                        enabled={optional.features}
                        onToggle={(v) => setOptionalSection('features', v)}
                    >
                        <div className="space-y-2">
                            {form.features.map((feat, i) => (
                                <div key={i} className="flex gap-2">
                                    <input
                                        value={feat}
                                        onChange={(e) => {
                                            const next = [...form.features];
                                            next[i] = e.target.value;
                                            update('features', next);
                                        }}
                                        className={fieldClass}
                                        placeholder={`Feature ${i + 1}`}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => update('features', form.features.filter((_, j) => j !== i))}
                                        className="p-2.5 rounded-lg text-red-500 hover:bg-red-50 shrink-0"
                                        aria-label="Remove feature"
                                    >
                                        <Trash2 size={15} />
                                    </button>
                                </div>
                            ))}
                        </div>
                        <button
                            type="button"
                            onClick={() => update('features', [...form.features, ''])}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-primary bg-primary/5 hover:bg-primary/10 border border-primary/20"
                        >
                            <Plus size={14} /> Add feature
                        </button>
                    </OptionalSection>

                    <OptionalSection
                        icon={CreditCard}
                        title="Payment options"
                        description="COD and online checkout for this product"
                        enabled={optional.payment}
                        onToggle={(v) => setOptionalSection('payment', v)}
                    >
                        <div className="space-y-3">
                            <label className="flex items-start gap-3 cursor-pointer rounded-lg border border-admin-border p-3 bg-admin-surface-alt">
                                <input
                                    type="checkbox"
                                    checked={form.codEnabled}
                                    onChange={(e) => update('codEnabled', e.target.checked)}
                                    className="mt-0.5 rounded border-line"
                                />
                                <span>
                                    <span className="text-sm font-medium text-ink">Cash on delivery</span>
                                    <span className="text-xs text-admin-muted block mt-0.5">Allow COD at checkout</span>
                                </span>
                            </label>
                            <label className="flex items-start gap-3 cursor-pointer rounded-lg border border-admin-border p-3 bg-admin-surface-alt">
                                <input
                                    type="checkbox"
                                    checked={form.onlinePaymentEnabled}
                                    onChange={(e) => update('onlinePaymentEnabled', e.target.checked)}
                                    className="mt-0.5 rounded border-line"
                                />
                                <span>
                                    <span className="text-sm font-medium text-ink">Online payment</span>
                                    <span className="text-xs text-admin-muted block mt-0.5">Allow Razorpay checkout</span>
                                </span>
                            </label>
                        </div>
                    </OptionalSection>
                </FormSection>

                <FormSection>
                    <SectionHeader
                        icon={ImageIcon}
                        title="Product page banners"
                        description="Promo images shown only on this product's own page — separate from the homepage banner sections"
                    />
                    {isNew ? (
                        <p className="text-sm text-admin-muted bg-admin-surface-alt border border-admin-border-light rounded-xl p-4">
                            Save this product first — page banners are attached to a real product id.
                        </p>
                    ) : (
                        <BannerManager productId={id} />
                    )}
                </FormSection>

                <div className="sm:sticky sm:bottom-4 z-10 rounded-2xl border border-admin-border bg-white shadow-lg p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="flex-1 space-y-1">
                        <div className="flex justify-between text-sm text-admin-muted">
                            <span>Category</span>
                            <span className="capitalize text-ink">
                                {categories.find((c) => c.slug === form.category)?.label || '—'}
                            </span>
                        </div>
                        <div className="flex justify-between text-sm text-admin-muted">
                            <span>Images</span>
                            <span className="text-ink">{form.images.length} uploaded</span>
                        </div>
                        <div className="flex justify-between items-baseline pt-2 border-t border-admin-border">
                            <span className="text-sm font-medium text-ink">Sale price</span>
                            <span className="font-display text-2xl text-ink">
                                {Number.isFinite(price) && price > 0 ? formatPrice(price) : '—'}
                            </span>
                        </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                        <Button
                            type="button"
                            variant="outline"
                            size="lg"
                            className="normal-case tracking-normal"
                            onClick={() => navigate(`${ADMIN_PATH}/products`)}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            variant="turmeric"
                            loading={saving}
                            disabled={uploading}
                            size="lg"
                            className="sm:min-w-[180px] normal-case tracking-normal"
                        >
                            {isNew ? 'Create product' : 'Save changes'}
                        </Button>
                    </div>
                </div>
            </form>
        </div>
    );
}
