import { lazy, Suspense, useEffect } from 'react';
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
import { PREVIEW_PATH } from '@/utils/productPreview';
import PageLoader from '@/components/layout/PageLoader';
import RouteGroup from '@/components/layout/RouteGroup';
import { installRoutePrefetch, pageLoaders } from '@/utils/routeLoaders';
import MainLayout from '@/layouts/MainLayout';
import Seo from '@/components/seo/Seo';
import HomePage from '@/pages/HomePage';

// Storefront pages
const ShopPage = lazy(pageLoaders.ShopPage);
const ProductDetailPage = lazy(pageLoaders.ProductDetailPage);
const CategoryPage = lazy(pageLoaders.CategoryPage);
const ReviewsPage = lazy(pageLoaders.ReviewsPage);
const CartPage = lazy(pageLoaders.CartPage);
const CheckoutPage = lazy(pageLoaders.CheckoutPage);
const WishlistPage = lazy(pageLoaders.WishlistPage);
const AccountPage = lazy(pageLoaders.AccountPage);
const OrdersPage = lazy(pageLoaders.OrdersPage);
const OrderDetailPage = lazy(pageLoaders.OrderDetailPage);
const AboutPage = lazy(pageLoaders.AboutPage);
const ContactPage = lazy(pageLoaders.ContactPage);
const FaqPage = lazy(pageLoaders.FaqPage);
const PrivacyPage = lazy(pageLoaders.PrivacyPage);
const TermsPage = lazy(pageLoaders.TermsPage);
const ShippingPolicyPage = lazy(pageLoaders.ShippingPolicyPage);
const RefundPolicyPage = lazy(pageLoaders.RefundPolicyPage);
const TrackOrderPage = lazy(pageLoaders.TrackOrderPage);
const NotFoundPage = lazy(pageLoaders.NotFoundPage);
const ProductPreviewFramePage = lazy(pageLoaders.ProductPreviewFramePage);

// Auth pages (standalone, no site chrome)
const LoginPage = lazy(pageLoaders.LoginPage);
const ForgotPasswordPage = lazy(pageLoaders.ForgotPasswordPage);
const ResetPasswordPage = lazy(pageLoaders.ResetPasswordPage);
const VerifyEmailPage = lazy(pageLoaders.VerifyEmailPage);
const VerifyEmailPendingPage = lazy(pageLoaders.VerifyEmailPendingPage);

// Admin
const AdminLayout = lazy(pageLoaders.AdminLayout);
const AdminDashboardPage = lazy(pageLoaders.AdminDashboardPage);
const AdminProductsPage = lazy(pageLoaders.AdminProductsPage);
const AdminProductFormPage = lazy(pageLoaders.AdminProductFormPage);
const AdminCategoriesPage = lazy(pageLoaders.AdminCategoriesPage);
const AdminReviewsPage = lazy(pageLoaders.AdminReviewsPage);
const AdminFeedbackPage = lazy(pageLoaders.AdminFeedbackPage);
const AdminOrdersPage = lazy(pageLoaders.AdminOrdersPage);
const AdminDirectOrdersPage = lazy(pageLoaders.AdminDirectOrdersPage);
const AdminUsersPage = lazy(pageLoaders.AdminUsersPage);
const AdminSettingsPage = lazy(pageLoaders.AdminSettingsPage);
const AdminContentPage = lazy(pageLoaders.AdminContentPage);
const AdminMediaPage = lazy(pageLoaders.AdminMediaPage);
const AdminCouponsPage = lazy(pageLoaders.AdminCouponsPage);
const AdminBundlesPage = lazy(pageLoaders.AdminBundlesPage);

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
    { path: 'login', title: 'Sign in', Page: LoginPage },
    { path: 'forgot-password', title: 'Forgot password', Page: ForgotPasswordPage },
    { path: 'reset-password', title: 'Reset password', Page: ResetPasswordPage },
    { path: 'verify-email', title: 'Verify your email', Page: VerifyEmailPage },
    { path: 'verify-email-pending', title: 'Check your inbox', Page: VerifyEmailPendingPage },
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
// There is deliberately no <Suspense> here: the persistent boundaries (below, and inside each layout) let the current
// page stay on screen while the next page's code loads, instead of flashing a loading screen between pages.
const lazyElement = (Page, { noindex = false, title } = {}) => (
    <>
        {noindex && <Seo noindex title={title} />}
        <Page />
    </>
);

export default function App() {
    useEffect(() => installRoutePrefetch(), []);

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
                                        <Suspense fallback={<PageLoader fullscreen />}>
                                        <RouteGroup>
                                        <Routes>
                                            <Route element={<MainLayout />}>
                                                <Route index element={<HomePage />} />
                                                {STOREFRONT_ROUTES.map(({ path, Page, noindex, title }) => (
                                                    <Route key={path} path={path} element={lazyElement(Page, { noindex, title })} />
                                                ))}
                                            </Route>

                                            {AUTH_ROUTES.map(({ path, Page, title }) => (
                                                <Route key={path} path={path} element={lazyElement(Page, { noindex: true, title })} />
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

                                            <Route path={PREVIEW_PATH} element={lazyElement(ProductPreviewFramePage, { noindex: true, title: 'Product preview' })} />

                                            <Route path="*" element={lazyElement(NotFoundPage, { noindex: true, title: 'Page not found' })} />
                                        </Routes>
                                        </RouteGroup>
                                        </Suspense>
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
