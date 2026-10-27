/**
 * Turns the admin's product form (unsaved) into the same shape the shop's API returns, so the real product page can
 * render it for the admin's "Preview". It mirrors what saving would send (see AdminProductFormPage handleSubmit):
 * variants decide the headline price and stock, and the discount is worked out from the two prices.
 * Missing pieces get harmless stand-ins so the page never breaks while the admin is still filling the form in.
 *
 * Returns { product, missing } — `missing` lists what a customer would still need to see (shown as a hint).
 */
const text = (value) => (typeof value === 'string' ? value.trim() : '');
const number = (value) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
};
const percentOff = (price, original) => (original > price && price > 0 ? Math.round(((original - price) / original) * 100) : 0);

const placeholderImage = () => `${window.location.origin}/preview-placeholder.svg`;

export function draftToProduct(form, { variantsOn = false } = {}) {
    const variants = variantsOn
        ? form.variants.map((v, index) => {
            const price = number(v.price);
            const originalPrice = number(v.originalPrice) || price;
            return {
                id: v.id || v.key || `draft-variant-${index}`,
                label: text(v.label) || `Option ${index + 1}`,
                netQuantity: text(v.netQuantity) || null,
                image: v.image || null,
                price,
                originalPrice,
                discount: percentOff(price, originalPrice),
                stock: number(v.stock),
                sku: text(v.sku) || null,
                isDefault: Boolean(v.isDefault),
            };
        })
        : [];
    const defaultVariant = variants.find((v) => v.isDefault) || variants[0] || null;

    const price = defaultVariant ? defaultVariant.price : number(form.price);
    const originalPrice = defaultVariant ? defaultVariant.originalPrice : (number(form.originalPrice) || price);
    const stock = defaultVariant ? variants.reduce((sum, v) => sum + v.stock, 0) : number(form.stock);

    const missing = [];
    if (!text(form.title)) missing.push('a title');
    if (!form.images?.length) missing.push('a photo');
    if (price <= 0) missing.push('a price');
    if (!text(form.description)) missing.push('a description');
    if (!form.category) missing.push('a category');

    const product = {
        id: 'preview-draft',
        title: text(form.title) || 'Your product title',
        description: text(form.description) || 'Your product description will appear here.',
        price,
        originalPrice,
        discount: percentOff(price, originalPrice),
        category: form.category || 'uncategorised',
        rating: number(form.rating),
        reviewCount: number(form.reviewCount),
        stock,
        images: form.images?.length ? form.images : [placeholderImage()],
        tags: (form.tags ?? []).map(text).filter(Boolean),
        badges: (form.badges ?? []).map(text).filter(Boolean),
        showTrustBadges: form.showTrustBadges !== false,
        features: (form.features ?? []).filter((f) => text(f)),
        ingredients: (form.ingredients ?? []).filter((i) => text(i.name)),
        howToUse: (form.howToUse ?? []).filter((s) => text(s)),
        nutrition: {
            servingSize: text(form.nutrition?.servingSize),
            rows: (form.nutrition?.rows ?? []).filter((r) => text(r.name) && text(r.value)),
        },
        faqs: (form.faqs ?? []).filter((f) => text(f.question) && text(f.answer)),
        variants,
        hasVariants: variants.length > 0,
        isNew: Boolean(form.isNew),
        isBestSeller: Boolean(form.isBestSeller),
        isTrendingPinned: Boolean(form.isTrendingPinned),
        isPublished: form.isPublished !== false,
        codEnabled: form.codEnabled !== false,
        onlinePaymentEnabled: form.onlinePaymentEnabled !== false,
    };

    return { product, missing };
}
