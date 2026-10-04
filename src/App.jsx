import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { CartProvider } from '@/contexts/CartContext';
import { WishlistProvider } from '@/contexts/WishlistContext';
import { AuthProvider, ADMIN_PATH } from '@/contexts/AuthContext';
import { SignOutTransitionProvider } from '@/contexts/SignOutTransitionContext';
import { SiteContentProvider } from '@/contexts/SiteContentContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { loginUrl } from '@/utils/authRedirect';
import ScrollToTop from '@/components/layout/ScrollToTop';
import WhatsAppButton from '@/components/layout/WhatsAppButton';
import AnnouncementPopup from '@/components/layout/AnnouncementPopup';
import RouteProgress from '@/components/layout/RouteProgress';
import PageLoader from '@/components/layout/PageLoader';
import MainLayout from '@/layouts/MainLayout';
import Seo from '@/components/seo/Seo';
import HomePage from '@/pages/HomePage';

// Storefront pages
const ShopPage = lazy(() => import('@/pages/ShopPage'));
const ProductDetailPage = lazy(() => import('@/pages/ProductDetailPage'));
const CategoryPage = lazy(() => import('@/pages/CategoryPage'));
const ReviewsPage = lazy(() => import('@/pages/ReviewsPage'));
const CartPage = lazy(() => import('@/pages/CartPage'));
const CheckoutPage = lazy(() => import('@/pages/CheckoutPage'));
const WishlistPage = lazy(() => import('@/pages/WishlistPage'));
const AccountPage = lazy(() => import('@/pages/AccountPage'));
const OrdersPage = lazy(() => import('@/pages/OrdersPage'));
const OrderDetailPage = lazy(() => import('@/pages/OrderDetailPage'));
const AboutPage = lazy(() => import('@/pages/AboutPage'));
const ContactPage = lazy(() => import('@/pages/ContactPage'));
const FaqPage = lazy(() => import('@/pages/FaqPage'));
const PrivacyPage = lazy(() => import('@/pages/PrivacyPage'));
const TermsPage = lazy(() => import('@/pages/TermsPage'));
const ShippingPolicyPage = lazy(() => import('@/pages/ShippingPolicyPage'));
const RefundPolicyPage = lazy(() => import('@/pages/RefundPolicyPage'));
const TrackOrderPage = lazy(() => import('@/pages/TrackOrderPage'));
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'));

// Auth pages (standalone, no site chrome)
const LoginPage = lazy(() => import('@/pages/LoginPage'));
const ForgotPasswordPage = lazy(() => import('@/pages/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('@/pages/ResetPasswordPage'));
const VerifyEmailPage = lazy(() => import('@/pages/VerifyEmailPage'));
const VerifyEmailPendingPage = lazy(() => import('@/pages/VerifyEmailPendingPage'));

// Admin
const AdminLayout = lazy(() => import('@/pages/admin/AdminLayout'));
const AdminDashboardPage = lazy(() => import('@/pages/admin/AdminDashboardPage'));
const AdminProductsPage = lazy(() => import('@/pages/admin/AdminProductsPage'));
const AdminProductFormPage = lazy(() => import('@/pages/admin/AdminProductFormPage'));
const AdminCategoriesPage = lazy(() => import('@/pages/admin/AdminCategoriesPage'));
const AdminReviewsPage = lazy(() => import('@/pages/admin/AdminReviewsPage'));
const AdminFeedbackPage = lazy(() => import('@/pages/admin/AdminFeedbackPage'));
const AdminOrdersPage = lazy(() => import('@/pages/admin/AdminOrdersPage'));
const AdminDirectOrdersPage = lazy(() => import('@/pages/admin/AdminDirectOrdersPage'));
const AdminUsersPage = lazy(() => import('@/pages/admin/AdminUsersPage'));
const AdminSettingsPage = lazy(() => import('@/pages/admin/AdminSettingsPage'));
const AdminContentPage = lazy(() => import('@/pages/admin/AdminContentPage'));
const AdminMediaPage = lazy(() => import('@/pages/admin/AdminMediaPage'));
const AdminCouponsPage = lazy(() => import('@/pages/admin/AdminCouponsPage'));
const AdminBundlesPage = lazy(() => import('@/pages/admin/AdminBundlesPage'));

const STOREFRONT_ROUTES = [
    { path: 'shop', Page: ShopPage },
    { path: 'category/:slug', Page: CategoryPage },
    { path: 'product/:id', Page: ProductDetailPage },
    { path: 'reviews', Page: ReviewsPage },
    { path: 'cart', title: 'Your Bag', Page: CartPage, noindex: true },
    { path: 'checkout', title: 'Checkout', Page: CheckoutPage, noindex: true },
    { path: 'wishlist', title: 'Wishlist', Page: WishlistPage, noindex: true },
    { path: 'account', title: 'My Account', Page: AccountPage, noindex: true },
    { path: 'orders', title: 'My Orders', Page: OrdersPage, noindex: true },
    { path: 'orders/:id', title: 'Order Details', Page: OrderDetailPage, noindex: true },
    { path: 'about', Page: AboutPage },
    { path: 'contact', Page: ContactPage },
    { path: 'faq', Page: FaqPage },
    { path: 'privacy', Page: PrivacyPage },
    { path: 'terms', Page: TermsPage },
    { path: 'shipping-policy', Page: ShippingPolicyPage },
    { path: 'refund-policy', Page: RefundPolicyPage },
    { path: 'track-order', Page: TrackOrderPage },
];

const AUTH_ROUTES = [
    { path: 'login', Page: LoginPage },
    { path: 'forgot-password', Page: ForgotPasswordPage },
    { path: 'reset-password', Page: ResetPasswordPage },
    { path: 'verify-email', Page: VerifyEmailPage },
    { path: 'verify-email-pending', Page: VerifyEmailPendingPage },
];

const ADMIN_ROUTES = [
    { path: 'products', Page: AdminProductsPage },
    { path: 'products/new', Page: AdminProductFormPage },
    { path: 'products/:id', Page: AdminProductFormPage },
    { path: 'categories', Page: AdminCategoriesPage },
    { path: 'reviews', Page: AdminReviewsPage },
    { path: 'feedback', Page: AdminFeedbackPage },
    { path: 'orders', Page: AdminOrdersPage },
    { path: 'direct-orders', Page: AdminDirectOrdersPage },
    { path: 'users', Page: AdminUsersPage },
    { path: 'coupons', Page: AdminCouponsPage },
    { path: 'bundles', Page: AdminBundlesPage },
    { path: 'content', Page: AdminContentPage },
    { path: 'media', Page: AdminMediaPage },
    { path: 'settings', Page: AdminSettingsPage },
];

// Private, transactional and admin routes are kept out of search results.
const lazyElement = (Page, { noindex = false, title } = {}) => (
    <>
        {noindex && <Seo noindex title={title} />}
        <Suspense fallback={<PageLoader />}>
            <Page />
        </Suspense>
    </>
);

export default function App() {
    return (
            <AuthProvider>
                <SignOutTransitionProvider>
                    <SiteContentProvider>
                        <CartProvider>
                            <WishlistProvider>
                                <BrowserRouter>
                                    <ToastProvider>
                                        <ScrollToTop />
                                        <RouteProgress />
                                        <AnnouncementPopup />
                                        <Routes>
                                            <Route element={<MainLayout />}>
                                                <Route index element={<HomePage />} />
                                                {STOREFRONT_ROUTES.map(({ path, Page, noindex, title }) => (
                                                    <Route key={path} path={path} element={lazyElement(Page, { noindex, title })} />
                                                ))}
                                            </Route>

                                            {AUTH_ROUTES.map(({ path, Page }) => (
                                                <Route key={path} path={path} element={lazyElement(Page, { noindex: true, title: 'Sign in' })} />
                                            ))}

                                            <Route path={`${ADMIN_PATH}/login`} element={<Navigate to={loginUrl(ADMIN_PATH)} replace />} />
                                            <Route path={ADMIN_PATH} element={lazyElement(AdminLayout, { noindex: true, title: 'Studio Admin' })}>
                                                <Route index element={lazyElement(AdminDashboardPage)} />
                                                {/* Banner management lives in Content → Homepage; keep old bookmarks working */}
                                                <Route path="banners" element={<Navigate to={`${ADMIN_PATH}/content`} replace />} />
                                                {ADMIN_ROUTES.map(({ path, Page }) => (
                                                    <Route key={path} path={path} element={lazyElement(Page)} />
                                                ))}
                                            </Route>

                                            <Route path="*" element={lazyElement(NotFoundPage, { noindex: true, title: 'Page not found' })} />
                                        </Routes>
                                        {/* Last in DOM order so the skip link stays the first keyboard tab stop */}
                                        <WhatsAppButton />
                                    </ToastProvider>
                                </BrowserRouter>
                            </WishlistProvider>
                        </CartProvider>
                    </SiteContentProvider>
                </SignOutTransitionProvider>
            </AuthProvider>
    );
}
