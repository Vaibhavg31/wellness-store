import { ADMIN_PATH } from '@/contexts/AuthContext';

/**
 * One import() per page, shared by React.lazy (App.jsx) and the prefetcher below. A page that was hovered, focused
 * or warmed up while the browser was idle is already in memory when it is opened, so no loading screen is needed.
 */
export const pageLoaders = {
    ShopPage: () => import('@/pages/ShopPage'),
    ProductDetailPage: () => import('@/pages/ProductDetailPage'),
    CategoryPage: () => import('@/pages/CategoryPage'),
    ReviewsPage: () => import('@/pages/ReviewsPage'),
    CartPage: () => import('@/pages/CartPage'),
    CheckoutPage: () => import('@/pages/CheckoutPage'),
    WishlistPage: () => import('@/pages/WishlistPage'),
    AccountPage: () => import('@/pages/AccountPage'),
    OrdersPage: () => import('@/pages/OrdersPage'),
    OrderDetailPage: () => import('@/pages/OrderDetailPage'),
    AboutPage: () => import('@/pages/AboutPage'),
    ContactPage: () => import('@/pages/ContactPage'),
    FaqPage: () => import('@/pages/FaqPage'),
    PrivacyPage: () => import('@/pages/PrivacyPage'),
    TermsPage: () => import('@/pages/TermsPage'),
    ShippingPolicyPage: () => import('@/pages/ShippingPolicyPage'),
    RefundPolicyPage: () => import('@/pages/RefundPolicyPage'),
    TrackOrderPage: () => import('@/pages/TrackOrderPage'),
    NotFoundPage: () => import('@/pages/NotFoundPage'),
    ProductPreviewFramePage: () => import('@/pages/ProductPreviewFramePage'),
    LoginPage: () => import('@/pages/LoginPage'),
    ForgotPasswordPage: () => import('@/pages/ForgotPasswordPage'),
    ResetPasswordPage: () => import('@/pages/ResetPasswordPage'),
    VerifyEmailPage: () => import('@/pages/VerifyEmailPage'),
    VerifyEmailPendingPage: () => import('@/pages/VerifyEmailPendingPage'),
    AdminLayout: () => import('@/pages/admin/AdminLayout'),
    AdminDashboardPage: () => import('@/pages/admin/AdminDashboardPage'),
    AdminProductsPage: () => import('@/pages/admin/AdminProductsPage'),
    AdminProductFormPage: () => import('@/pages/admin/AdminProductFormPage'),
    AdminCategoriesPage: () => import('@/pages/admin/AdminCategoriesPage'),
    AdminReviewsPage: () => import('@/pages/admin/AdminReviewsPage'),
    AdminFeedbackPage: () => import('@/pages/admin/AdminFeedbackPage'),
    AdminOrdersPage: () => import('@/pages/admin/AdminOrdersPage'),
    AdminDirectOrdersPage: () => import('@/pages/admin/AdminDirectOrdersPage'),
    AdminUsersPage: () => import('@/pages/admin/AdminUsersPage'),
    AdminSettingsPage: () => import('@/pages/admin/AdminSettingsPage'),
    AdminContentPage: () => import('@/pages/admin/AdminContentPage'),
    AdminMediaPage: () => import('@/pages/admin/AdminMediaPage'),
    AdminCouponsPage: () => import('@/pages/admin/AdminCouponsPage'),
    AdminBundlesPage: () => import('@/pages/admin/AdminBundlesPage'),
};

/** [path prefix, loader names]. More specific prefixes come first; matched on whole path segments. */
const ROUTES = [
    ['/shop', ['ShopPage']],
    ['/category', ['CategoryPage']],
    ['/product', ['ProductDetailPage']],
    ['/reviews', ['ReviewsPage']],
    ['/cart', ['CartPage']],
    ['/checkout', ['CheckoutPage']],
    ['/wishlist', ['WishlistPage']],
    ['/account', ['AccountPage']],
    ['/orders', ['OrdersPage', 'OrderDetailPage']],
    ['/about', ['AboutPage']],
    ['/contact', ['ContactPage']],
    ['/faq', ['FaqPage']],
    ['/privacy', ['PrivacyPage']],
    ['/terms', ['TermsPage']],
    ['/shipping-policy', ['ShippingPolicyPage']],
    ['/refund-policy', ['RefundPolicyPage']],
    ['/track-order', ['TrackOrderPage']],
    ['/login', ['LoginPage']],
    ['/forgot-password', ['ForgotPasswordPage']],
    ['/reset-password', ['ResetPasswordPage']],
    ['/verify-email-pending', ['VerifyEmailPendingPage']],
    ['/verify-email', ['VerifyEmailPage']],
];
const ADMIN_PAGES = {
    products: 'AdminProductsPage', categories: 'AdminCategoriesPage', reviews: 'AdminReviewsPage', feedback: 'AdminFeedbackPage',
    orders: 'AdminOrdersPage', 'direct-orders': 'AdminDirectOrdersPage', users: 'AdminUsersPage', coupons: 'AdminCouponsPage',
    bundles: 'AdminBundlesPage', content: 'AdminContentPage', media: 'AdminMediaPage', settings: 'AdminSettingsPage',
};

const started = new Set();
const load = (name) => {
    if (!name || started.has(name) || !pageLoaders[name]) return;
    started.add(name);
    pageLoaders[name]().catch(() => started.delete(name)); // a failed fetch can simply be tried again later
};

/** Starts downloading the code for the page that `pathname` leads to (no-op if already requested). */
export function prefetchPath(pathname) {
    if (pathname === ADMIN_PATH || pathname.startsWith(`${ADMIN_PATH}/`)) {
        load('AdminLayout');
        const [section, sub] = pathname.slice(ADMIN_PATH.length + 1).split('/');
        if (!section) load('AdminDashboardPage');
        else if (section === 'products' && sub) load('AdminProductFormPage');
        else load(ADMIN_PAGES[section]);
        return;
    }
    const hit = ROUTES.find(([prefix]) => pathname === prefix || pathname.startsWith(`${prefix}/`));
    if (hit) hit[1].forEach(load);
}

const connectionIsFrugal = () => {
    const c = navigator.connection;
    return Boolean(c && (c.saveData || /(^|-)2g$/.test(c.effectiveType || '')));
};

/**
 * Warms page code in three ways: when the pointer/finger approaches a link, when a link gets keyboard focus, and
 * (after the first screen has settled) for the pages most visitors open next. Skipped on data-saver / 2G connections.
 */
export function installRoutePrefetch() {
    if (connectionIsFrugal()) return () => {};
    const fromEvent = (event) => {
        const anchor = event.target instanceof Element ? event.target.closest('a[href]') : null;
        if (!anchor || (anchor.target && anchor.target !== '_self')) return;
        const url = new URL(anchor.href, window.location.href);
        if (url.origin === window.location.origin) prefetchPath(url.pathname);
    };
    const events = ['pointerover', 'touchstart', 'focusin'];
    events.forEach((name) => document.addEventListener(name, fromEvent, { passive: true }));

    const idle = window.requestIdleCallback || ((cb) => setTimeout(cb, 1500));
    const handle = idle(() => ['/shop', '/product/x', '/cart', '/login'].forEach(prefetchPath), { timeout: 4000 });
    return () => {
        events.forEach((name) => document.removeEventListener(name, fromEvent));
        (window.cancelIdleCallback || clearTimeout)(handle);
    };
}
