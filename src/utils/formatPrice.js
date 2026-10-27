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
