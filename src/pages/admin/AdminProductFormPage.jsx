import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
    AlertCircle,
    CreditCard,
    ImageIcon,
    Layers,
    ListChecks,
    Package,
    Plus,
    ShieldCheck,
    Sparkles,
    Tag,
    Trash2,
    Upload,
    X,
} from 'lucide-react';
import { api, imageUrl } from '@/services/api';
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

const TAG_OPTIONS = ['New', 'Sale', 'Limited', 'Best Seller', 'Anti-Tarnish'];

// Keep labels in sync with BADGE_ICONS in src/utils/productTrustBadges.js
const BADGE_OPTIONS = [
    'Anti-Tarnish',
    'Long-Lasting Shine',
    'Everyday Wearable',
    'Waterproof',
    '316L Surgical Steel',
    'Hypoallergenic',
    'Nickel-Free',
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
    isNew: false,
    isBestSeller: false,
    isTrendingPinned: false,
    isPublished: true,
    codEnabled: true,
    onlinePaymentEnabled: true,
};

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
                });
            });
        }
    }, [adminToken, id, isNew]);

    const update = (key, value) => {
        setForm((prev) => ({ ...prev, [key]: value }));
    };

    const price = Number(form.price);
    const originalPrice = Number(form.originalPrice);
    const stock = Number(form.stock);

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

        setSaving(true);

        try {
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
                // Deliberately NOT sending enable3dPreview/cutoutImages: this form has
                // no UI for either, and previously sent enable3DPreview:false and
                // cutoutImages:[] unconditionally on every save — silently wiping any
                // product's 3D-preview flag and cutout images on every single edit.
                // Omitting the keys lets the backend leave existing values untouched.
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
                    <h1 className="font-serif text-3xl text-charcoal mb-1 max-lg:hidden">
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
                                placeholder="e.g. Celestial Pearl Cascade Necklace"
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
                        description="Sale price, MRP, and inventory"
                    />
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
                    {Number.isFinite(price) && price > 0 && Number.isFinite(originalPrice) && originalPrice > 0 && (
                        <div className="rounded-xl border border-admin-border bg-admin-surface-alt p-3 flex flex-wrap items-center justify-between gap-2 text-sm">
                            <span className="text-admin-muted">Customer sees</span>
                            <div className="flex items-center gap-3">
                                <span className="font-semibold text-charcoal">{formatPrice(price)}</span>
                                {originalPrice > price && (
                                    <>
                                        <span className="text-admin-muted/80 line-through">{formatPrice(originalPrice)}</span>
                                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald/10 text-emerald border border-emerald/20">
                                            {computedDiscount}% off
                                        </span>
                                    </>
                                )}
                            </div>
                        </div>
                    )}
                </FormSection>

                <FormSection>
                    <SectionHeader
                        icon={ImageIcon}
                        title="Photos"
                        description="At least one image required"
                        action={(
                            <label className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-wine bg-wine/5 hover:bg-wine/10 border border-wine/20 cursor-pointer">
                                <Upload size={14} />
                                {uploading ? 'Uploading…' : 'Upload'}
                                <input type="file" multiple accept="image/*" className="hidden" onChange={handleImageUpload} />
                            </label>
                        )}
                    />
                    {form.images.length === 0 ? (
                        <label className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-admin-border bg-admin-surface-alt py-12 cursor-pointer hover:border-wine/30 hover:bg-wine/5 transition-colors">
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
                                        <span className="absolute bottom-1.5 left-1.5 text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-charcoal/70 text-white">
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
                                            className="absolute bottom-1.5 left-1.5 text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-charcoal/60 text-white opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                                        >
                                            Set as cover
                                        </button>
                                    )}
                                </div>
                            ))}
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
                                        ? 'border-wine bg-wine/5 ring-2 ring-wine/20'
                                        : 'border-admin-border bg-admin-surface-alt hover:border-border'
                                }`}
                            >
                                <p className="text-sm font-semibold text-charcoal">Published</p>
                                <p className="text-[11px] text-admin-muted mt-0.5">Visible on the storefront</p>
                            </button>
                            <button
                                type="button"
                                onClick={() => update('isPublished', false)}
                                className={`rounded-xl border p-3 text-left transition-all ${
                                    !form.isPublished
                                        ? 'border-wine bg-wine/5 ring-2 ring-wine/20'
                                        : 'border-admin-border bg-admin-surface-alt hover:border-border'
                                }`}
                            >
                                <p className="text-sm font-semibold text-charcoal">Hidden</p>
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
                                            ? 'bg-wine text-ivory border-wine'
                                            : 'border-admin-border text-admin-muted hover:border-wine/40 bg-white'
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
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs bg-wine/10 text-wine border border-wine/25"
                                        >
                                            {tag}
                                            <button
                                                type="button"
                                                onClick={() => removeTag(tag)}
                                                className="p-0.5 rounded-full hover:bg-wine/20"
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
                                    className="mt-0.5 rounded border-border"
                                />
                                <span>
                                    <span className="text-sm font-medium text-charcoal">New arrival</span>
                                    <span className="text-xs text-admin-muted block mt-0.5">Highlight in new arrivals</span>
                                </span>
                            </label>
                            <label className="flex items-start gap-3 cursor-pointer rounded-lg border border-admin-border p-3 bg-admin-surface-alt">
                                <input
                                    type="checkbox"
                                    checked={form.isBestSeller}
                                    onChange={(e) => update('isBestSeller', e.target.checked)}
                                    className="mt-0.5 rounded border-border"
                                />
                                <span>
                                    <span className="text-sm font-medium text-charcoal">Best seller</span>
                                    <span className="text-xs text-admin-muted block mt-0.5">Show best seller badge</span>
                                </span>
                            </label>
                            <label className="flex items-start gap-3 cursor-pointer rounded-lg border border-admin-border p-3 bg-admin-surface-alt">
                                <input
                                    type="checkbox"
                                    checked={form.isTrendingPinned}
                                    onChange={(e) => update('isTrendingPinned', e.target.checked)}
                                    className="mt-0.5 rounded border-border"
                                />
                                <span>
                                    <span className="text-sm font-medium text-charcoal">Pin to Trending</span>
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
                                            ? 'bg-wine text-ivory border-wine'
                                            : 'border-admin-border text-admin-muted hover:border-wine/40 bg-white'
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
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs bg-wine/10 text-wine border border-wine/25"
                                        >
                                            {badge}
                                            <button
                                                type="button"
                                                onClick={() => removeBadge(badge)}
                                                className="p-0.5 rounded-full hover:bg-wine/20"
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
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-wine bg-wine/5 hover:bg-wine/10 border border-wine/20"
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
                                    className="mt-0.5 rounded border-border"
                                />
                                <span>
                                    <span className="text-sm font-medium text-charcoal">Cash on delivery</span>
                                    <span className="text-xs text-admin-muted block mt-0.5">Allow COD at checkout</span>
                                </span>
                            </label>
                            <label className="flex items-start gap-3 cursor-pointer rounded-lg border border-admin-border p-3 bg-admin-surface-alt">
                                <input
                                    type="checkbox"
                                    checked={form.onlinePaymentEnabled}
                                    onChange={(e) => update('onlinePaymentEnabled', e.target.checked)}
                                    className="mt-0.5 rounded border-border"
                                />
                                <span>
                                    <span className="text-sm font-medium text-charcoal">Online payment</span>
                                    <span className="text-xs text-admin-muted block mt-0.5">Allow Razorpay checkout</span>
                                </span>
                            </label>
                        </div>
                    </OptionalSection>
                </FormSection>

                <div className="sm:sticky sm:bottom-4 z-10 rounded-2xl border border-admin-border bg-white shadow-lg p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="flex-1 space-y-1">
                        <div className="flex justify-between text-sm text-admin-muted">
                            <span>Category</span>
                            <span className="capitalize text-charcoal">
                                {categories.find((c) => c.slug === form.category)?.label || '—'}
                            </span>
                        </div>
                        <div className="flex justify-between text-sm text-admin-muted">
                            <span>Images</span>
                            <span className="text-charcoal">{form.images.length} uploaded</span>
                        </div>
                        <div className="flex justify-between items-baseline pt-2 border-t border-admin-border">
                            <span className="text-sm font-medium text-charcoal">Sale price</span>
                            <span className="font-serif text-2xl text-charcoal">
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
                            variant="gold"
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
