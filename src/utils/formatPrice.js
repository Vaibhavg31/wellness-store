export function formatPrice(amount) {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0,
    }).format(amount);
}
export function calculateDiscount(original, current) {
    return Math.round(((original - current) / original) * 100);
}
export function cn(...classes) {
    return classes.filter(Boolean).join(' ');
}

/** Free text an admin typed ("any 3 for ₹1499") shown with Indian digit grouping ("₹1,499"), so prices never look different from the rest of the site. */
export function tidyRupees(text) {
    return String(text ?? '').replace(/₹\s?(\d{4,})/g, (_, digits) => `₹${new Intl.NumberFormat('en-IN').format(Number(digits))}`);
}
