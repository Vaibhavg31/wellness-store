import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { CartProvider } from '@/contexts/CartContext';
import { WishlistProvider } from '@/contexts/WishlistContext';
import { AuthProvider, ADMIN_PATH } from '@/contexts/AuthContext';
import { SignOutTransitionProvider } from '@/contexts/SignOutTransitionContext';
import { SiteContentProvider } from '@/contexts/SiteContentContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { loginUrl } from '@/utils/authRedirect';
import ScrollToTop from '@/components/layout/ScrollToTop';
import ThemeInjector from '@/components/layout/ThemeInjector';
import NavigationProgress from '@/components/layout/NavigationProgress';
import InitialAppLoader from '@/components/layout/InitialAppLoader';
import WhatsAppButton from '@/components/layout/WhatsAppButton';
import PageLoader from '@/components/layout/PageLoader';
import { AnimatedPage } from '@/components/layout/PageTransition';
import MainLayout from '@/layouts/MainLayout';

const HomePage = lazy(() => import('@/pages/HomePage'));
const ShopPage = lazy(() => import('@/pages/ShopPage'));
const ProductDetailPage = lazy(() => import('@/pages/ProductDetailPage'));
const CategoryPage = lazy(() => import('@/pages/CategoryPage'));
const ReviewsPage = lazy(() => import('@/pages/ReviewsPage'));
const CartPage = lazy(() => import('@/pages/CartPage'));
const CheckoutPage = lazy(() => import('@/pages/CheckoutPage'));
const WishlistPage = lazy(() => import('@/pages/WishlistPage'));
const LoginPage = lazy(() => import('@/pages/LoginPage'));
const ForgotPasswordPage = lazy(() => import('@/pages/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('@/pages/ResetPasswordPage'));
const VerifyEmailPage = lazy(() => import('@/pages/VerifyEmailPage'));
const VerifyEmailPendingPage = lazy(() => import('@/pages/VerifyEmailPendingPage'));
const AccountPage = lazy(() => import('@/pages/AccountPage'));
const OrdersPage = lazy(() => import('@/pages/OrdersPage'));
const OrderDetailPage = lazy(() => import('@/pages/OrderDetailPage'));
const AboutPage = lazy(() => import('@/pages/AboutPage'));
const ContactPage = lazy(() => import('@/pages/ContactPage'));
const FaqPage = lazy(() => import('@/pages/FaqPage'));
const PrivacyPage = lazy(() => import('@/pages/PrivacyPage'));
const TermsPage = lazy(() => import('@/pages/TermsPage'));
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'));
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

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

function SuspensePage({ children, message }) {
  return (
    <Suspense fallback={<PageLoader message={message} />}>
      {children}
    </Suspense>
  );
}

function AppProviders({ children }) {
  if (GOOGLE_CLIENT_ID) {
    return <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>{children}</GoogleOAuthProvider>;
  }
  return <>{children}</>;
}

export default function App() {
  return (
    <AppProviders>
        <AuthProvider>
          <SignOutTransitionProvider>
          <SiteContentProvider>
          <CartProvider>
            <WishlistProvider>
              <InitialAppLoader>
                <ThemeInjector />
                <BrowserRouter>
                <ToastProvider>
                  <ScrollToTop />
                  <NavigationProgress />
                  <WhatsAppButton />
                  <Routes>
                    <Route element={<MainLayout />}>
                      <Route index element={<SuspensePage message="Opening collection..."><HomePage /></SuspensePage>} />
                      <Route path="shop" element={<SuspensePage message="Loading shop..."><ShopPage /></SuspensePage>} />
                      <Route path="category/:slug" element={<SuspensePage message="Loading category..."><CategoryPage /></SuspensePage>} />
                      <Route path="product/:id" element={<SuspensePage message="Loading product..."><ProductDetailPage /></SuspensePage>} />
                      <Route path="reviews" element={<SuspensePage message="Loading reviews..."><ReviewsPage /></SuspensePage>} />
                      <Route path="cart" element={<SuspensePage message="Loading bag..."><CartPage /></SuspensePage>} />
                      <Route path="checkout" element={<SuspensePage message="Preparing checkout..."><CheckoutPage /></SuspensePage>} />
                      <Route path="wishlist" element={<SuspensePage message="Loading wishlist..."><WishlistPage /></SuspensePage>} />
                      <Route path="account" element={<SuspensePage message="Loading account..."><AccountPage /></SuspensePage>} />
                      <Route path="orders" element={<SuspensePage message="Loading orders..."><OrdersPage /></SuspensePage>} />
                      <Route path="orders/:id" element={<SuspensePage message="Loading order..."><OrderDetailPage /></SuspensePage>} />
                      <Route path="about" element={<SuspensePage message="Loading story..."><AboutPage /></SuspensePage>} />
                      <Route path="contact" element={<SuspensePage message="Loading contact..."><ContactPage /></SuspensePage>} />
                      <Route path="faq" element={<SuspensePage message="Loading FAQ..."><FaqPage /></SuspensePage>} />
                      <Route path="privacy" element={<SuspensePage message="Loading..."><PrivacyPage /></SuspensePage>} />
                      <Route path="terms" element={<SuspensePage message="Loading..."><TermsPage /></SuspensePage>} />
                    </Route>

                    <Route
                      path="login"
                      element={
                        <AnimatedPage>
                          <SuspensePage message="Signing in...">
                            <LoginPage />
                          </SuspensePage>
                        </AnimatedPage>
                      }
                    />
                    <Route
                      path="forgot-password"
                      element={
                        <AnimatedPage>
                          <SuspensePage message="Loading...">
                            <ForgotPasswordPage />
                          </SuspensePage>
                        </AnimatedPage>
                      }
                    />
                    <Route
                      path="reset-password"
                      element={
                        <AnimatedPage>
                          <SuspensePage message="Loading...">
                            <ResetPasswordPage />
                          </SuspensePage>
                        </AnimatedPage>
                      }
                    />
                    <Route
                      path="verify-email"
                      element={
                        <AnimatedPage>
                          <SuspensePage message="Verifying email...">
                            <VerifyEmailPage />
                          </SuspensePage>
                        </AnimatedPage>
                      }
                    />
                    <Route
                      path="verify-email-pending"
                      element={
                        <AnimatedPage>
                          <SuspensePage message="Loading...">
                            <VerifyEmailPendingPage />
                          </SuspensePage>
                        </AnimatedPage>
                      }
                    />

                    <Route path={`${ADMIN_PATH}/login`} element={<Navigate to={loginUrl(ADMIN_PATH)} replace />} />

                    <Route path={ADMIN_PATH} element={<SuspensePage message="Opening studio..."><AdminLayout /></SuspensePage>}>
                      <Route index element={<SuspensePage message="Loading dashboard..."><AdminDashboardPage /></SuspensePage>} />
                      <Route path="products" element={<SuspensePage message="Loading products..."><AdminProductsPage /></SuspensePage>} />
                      <Route path="products/new" element={<SuspensePage message="Loading form..."><AdminProductFormPage /></SuspensePage>} />
                      <Route path="products/:id" element={<SuspensePage message="Loading form..."><AdminProductFormPage /></SuspensePage>} />
                      <Route path="categories" element={<SuspensePage message="Loading categories..."><AdminCategoriesPage /></SuspensePage>} />
                      {/* Banner management moved into Content → Homepage; redirect old bookmarks/links there */}
                      <Route path="banners" element={<Navigate to={`${ADMIN_PATH}/content`} replace />} />
                      <Route path="reviews" element={<SuspensePage message="Loading reviews..."><AdminReviewsPage /></SuspensePage>} />
                      <Route path="feedback" element={<SuspensePage message="Loading feedback..."><AdminFeedbackPage /></SuspensePage>} />
                      <Route path="orders" element={<SuspensePage message="Loading orders..."><AdminOrdersPage /></SuspensePage>} />
                      <Route path="direct-orders" element={<SuspensePage message="Loading direct orders..."><AdminDirectOrdersPage /></SuspensePage>} />
                      <Route path="users" element={<SuspensePage message="Loading users..."><AdminUsersPage /></SuspensePage>} />
                      <Route path="coupons" element={<SuspensePage message="Loading coupons..."><AdminCouponsPage /></SuspensePage>} />
                      <Route path="content" element={<SuspensePage message="Loading content..."><AdminContentPage /></SuspensePage>} />
                      <Route path="media" element={<SuspensePage message="Loading media..."><AdminMediaPage /></SuspensePage>} />
                      <Route path="settings" element={<SuspensePage message="Loading settings..."><AdminSettingsPage /></SuspensePage>} />
                    </Route>

                    <Route
                      path="*"
                      element={
                        <AnimatedPage>
                          <SuspensePage message="Loading...">
                            <NotFoundPage />
                          </SuspensePage>
                        </AnimatedPage>
                      }
                    />
                  </Routes>
                </ToastProvider>
                </BrowserRouter>
              </InitialAppLoader>
            </WishlistProvider>
          </CartProvider>
          </SiteContentProvider>
          </SignOutTransitionProvider>
        </AuthProvider>
    </AppProviders>
  );
}
