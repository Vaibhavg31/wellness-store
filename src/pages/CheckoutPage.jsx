import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle, MapPin, Phone, User, CreditCard, ChevronLeft, ShoppingBag, X } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { useSiteContent } from '@/contexts/SiteContentContext';
import { formatPrice } from '@/utils/formatPrice';
import { imageUrl, api, ApiError } from '@/services/api';
import { openRazorpayCheckout } from '@/utils/razorpay';
import { isValidPincode } from '@/utils/pincodeLookup';
import { validateDeliveryAddress } from '@/utils/validateAddress';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import EmptyState from '@/components/ui/EmptyState';
import UserAvatar from '@/components/ui/UserAvatar';
import CheckoutSteps from '@/components/checkout/CheckoutSteps';
import CheckoutSection from '@/components/checkout/CheckoutSection';
import OrderPlaced from '@/components/checkout/OrderPlaced';
import PaymentOptions from '@/components/checkout/PaymentOptions';
import SavedAddressList from '@/components/checkout/SavedAddressList';
import CheckoutLoginGate from '@/components/checkout/CheckoutLoginGate';
import CheckoutInlineOtp, { normalizeCheckoutPhone } from '@/components/checkout/CheckoutInlineOtp';
import EmailVerificationBanner from '@/components/auth/EmailVerificationBanner';
import { DEV_SKIP_PHONE_VERIFY } from '@/hooks/useMsg91Otp';
import DeliveryAddressForm from '@/components/checkout/DeliveryAddressForm';
import CouponInput from '@/components/checkout/CouponInput';
import ActiveCoupons from '@/components/checkout/ActiveCoupons';
import PriceBreakdown from '@/components/checkout/PriceBreakdown';

const OTP_FLOW_KEY = 'wellness-checkout-otp-flow';
const MAX_SAVED_ADDRESSES = 3;

const razorpayKey = String(import.meta.env.VITE_RAZORPAY_KEY_ID || '');
const RAZORPAY_ENABLED = razorpayKey.startsWith('rzp_') && !razorpayKey.includes('xxxx');

function normalizePhone(value) {
    return normalizeCheckoutPhone(value);
}

function clearOtpFlow() {
    try {
        sessionStorage.removeItem(OTP_FLOW_KEY);
    } catch {
        /* ignore */
    }
}

function isAccountPhoneVerified(user, phoneDigits) {
    if (!user?.phoneVerified || phoneDigits.length !== 10) return false;
    return normalizePhone(user.phone || '') === phoneDigits;
}

export default function CheckoutPage() {
    const { items, total, couponCode, clearCart } = useCart();
    const { user, token, isAuthenticated, updateUser, logout } = useAuth();
    const { content } = useSiteContent();

    const razorpayAvailable = useMemo(() => {
        const globalOnline = content.payments?.onlinePaymentEnabled !== false;
        const cartAllowsOnline = items.every((i) => i.product.onlinePaymentEnabled !== false);
        return RAZORPAY_ENABLED && globalOnline && cartAllowsOnline;
    }, [content.payments, items]);

    const codAvailable = useMemo(() => {
        const globalCod = content.payments?.codEnabled !== false;
        const cartAllowsCod = items.every((i) => i.product.codEnabled !== false);
        return globalCod && cartAllowsCod;
    }, [content.payments, items]);

    const otpEnabled = content.services?.otpEnabled !== false;
    const skipPhoneVerify = DEV_SKIP_PHONE_VERIFY || !otpEnabled;

    const defaultPayment = razorpayAvailable ? 'razorpay' : codAvailable ? 'cod' : 'cod';

    const [placed, setPlaced] = useState(null);

    // The success view below renders in place (no route change), so the
    // pathname-based ScrollToTop never fires — without this, the customer
    // stays scrolled wherever they were on the form (often the footer) and
    // never sees the confirmation.
    useEffect(() => {
        if (placed) window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }, [placed]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [otpActive, setOtpActive] = useState(false);
    const [verifiedPhone, setVerifiedPhone] = useState('');
    const [addressErrors, setAddressErrors] = useState({});
    const [savedAddresses, setSavedAddresses] = useState(user?.addresses || []);
    const [selectedAddressId, setSelectedAddressId] = useState('');
    const otpSectionRef = useRef(null);
    const addressSectionRef = useRef(null);
    const skipVerifyRequestRef = useRef('');

    const [form, setForm] = useState({
        name: user?.name || '',
        email: user?.email || '',
        phone: user?.phone || '',
        address: '',
        city: '',
        state: '',
        landmark: '',
        pincode: '',
        payment: defaultPayment,
    });

    useEffect(() => {
        setForm((prev) => {
            if (prev.payment === 'razorpay' && razorpayAvailable) return prev;
            if (prev.payment === 'cod' && codAvailable) return prev;
            return { ...prev, payment: defaultPayment };
        });
    }, [razorpayAvailable, codAvailable, defaultPayment]);

    useEffect(() => {
        if (user) {
            setForm((prev) => ({
                ...prev,
                name: prev.name || user.name || '',
                email: prev.email || user.email || '',
                phone: prev.phone || user.phone || '',
            }));
            const accountPhone = normalizePhone(user.phone || '');
            if (user.phoneVerified && accountPhone.length === 10) {
                setVerifiedPhone(accountPhone);
            }
        }
    }, [user]);

    useEffect(() => {
        if (!token) return;
        api.get('/api/users/addresses', token)
            .then((list) => {
                setSavedAddresses(list);
                const lastUsedId = user?.lastUsedAddressId;
                const lastUsed = lastUsedId ? list.find((a) => a.id === lastUsedId) : null;
                const defaultAddr = list.find((a) => a.isDefault) || list[0];
                const prefillAddr = lastUsed || defaultAddr;
                if (prefillAddr) {
                    setSelectedAddressId(prefillAddr.id);
                    setForm((prev) => {
                        if (prev.address.trim()) return prev;
                        return {
                            ...prev,
                            name: prefillAddr.name || prev.name,
                            phone: prefillAddr.phone || prev.phone,
                            address: prefillAddr.address || '',
                            landmark: prefillAddr.landmark || '',
                            city: prefillAddr.city || '',
                            state: prefillAddr.state || '',
                            pincode: prefillAddr.pincode || '',
                        };
                    });
                }
            })
            .catch(() => {});
    }, [token, user?.lastUsedAddressId]);

    const applySavedAddress = (addr) => {
        setSelectedAddressId(addr.id);
        setForm((prev) => ({
            ...prev,
            name: addr.name || prev.name,
            phone: addr.phone || prev.phone,
            address: addr.address || '',
            landmark: addr.landmark || '',
            city: addr.city || '',
            state: addr.state || '',
            pincode: addr.pincode || '',
        }));
        setAddressErrors({});
    };

    const clearAddressFields = () => {
        setSelectedAddressId('');
        setForm((prev) => ({
            ...prev,
            address: '',
            landmark: '',
            city: '',
            state: '',
            pincode: '',
        }));
        setAddressErrors({});
    };

    const enterNewAddress = () => {
        clearAddressFields();
    };

    const hasAddressInput = Boolean(
        form.address.trim() ||
        form.landmark?.trim() ||
        form.city.trim() ||
        form.state?.trim() ||
        form.pincode.trim(),
    );

    const handleAddressFormChange = (next) => {
        if (selectedAddressId) {
            const saved = savedAddresses.find((a) => a.id === selectedAddressId);
            if (saved) {
                const edited =
                    next.address !== (saved.address || '') ||
                    (next.landmark || '') !== (saved.landmark || '') ||
                    next.city !== (saved.city || '') ||
                    (next.state || '') !== (saved.state || '') ||
                    next.pincode !== (saved.pincode || '');
                if (edited) {
                    setSelectedAddressId('');
                }
            }
        }
        setForm(next);
    };

    useEffect(() => {
        const phoneDigits = normalizePhone(form.phone);
        if (isAccountPhoneVerified(user, phoneDigits)) {
            setVerifiedPhone(phoneDigits);
            setOtpActive(false);
            clearOtpFlow();
            return;
        }

        try {
            const raw = sessionStorage.getItem(OTP_FLOW_KEY);
            if (!raw) return;
            const saved = JSON.parse(raw);
            if (saved?.phone === phoneDigits && phoneDigits.length === 10) {
                setOtpActive(true);
            }
        } catch {
            /* ignore corrupt session data */
        }
    }, [form.phone, user]);

    useEffect(() => {
        if (!skipPhoneVerify || !token) return undefined;

        const digits = normalizePhone(form.phone);
        if (digits.length !== 10) {
            skipVerifyRequestRef.current = '';
            return undefined;
        }
        if (skipVerifyRequestRef.current && skipVerifyRequestRef.current !== digits) {
            skipVerifyRequestRef.current = '';
        }
        if (isAccountPhoneVerified(user, digits) || verifiedPhone === digits) return undefined;
        if (skipVerifyRequestRef.current === digits) return undefined;

        skipVerifyRequestRef.current = digits;
        let cancelled = false;

        api.post('/api/auth/confirm-phone-otp', { phone: digits, otp: '' }, token)
            .then((res) => {
                if (!cancelled) {
                    updateUser({ phone: res.phone, phoneVerified: true });
                    setVerifiedPhone(res.phone);
                    setOtpActive(false);
                    setError('');
                    clearOtpFlow();
                }
            })
            .catch((err) => {
                if (!cancelled) {
                    skipVerifyRequestRef.current = '';
                    setError(err instanceof Error ? err.message : 'Could not verify mobile number');
                }
            });

        return () => {
            cancelled = true;
        };
    }, [form.phone, token, user, verifiedPhone, updateUser, skipPhoneVerify]);

    const phoneDigits = normalizePhone(form.phone);
    const isPhoneVerified = phoneDigits.length === 10 && (
        isAccountPhoneVerified(user, phoneDigits) ||
        verifiedPhone === phoneDigits
    );
    const phoneReady = isPhoneVerified || (skipPhoneVerify && phoneDigits.length === 10);
    const emailVerified = user?.emailVerified !== false;

    const addressComplete = Boolean(
        form.address.trim() &&
        form.city.trim() &&
        form.state?.trim() &&
        isValidPincode(form.pincode),
    );

    const submitOrder = useCallback(async () => {
        const shippingAddress = form.landmark?.trim()
            ? `${form.address.trim()}, ${form.landmark.trim()}`
            : form.address.trim();

        const order = await api.post('/api/orders', {
            items: items.map((item) => ({
                productId: item.product.id,
                variantId: item.product.variantId || undefined,
                bundleId: item.product.bundleId || undefined,
                title: item.product.title,
                price: item.product.price,
                quantity: item.quantity,
                image: item.product.images[0],
            })),
            couponCode: couponCode || undefined,
            customerEmail: form.email,
            addressBook: {
                selectedId: selectedAddressId || undefined,
                address: form.address.trim(),
                landmark: form.landmark?.trim() || '',
            },
            shipping: {
                name: form.name,
                phone: form.phone,
                address: shippingAddress,
                landmark: form.landmark?.trim() || undefined,
                city: form.city,
                state: form.state,
                pincode: form.pincode,
            },
            payment: form.payment,
        }, token);

        const refreshUser = async () => {
            try {
                const me = await api.get('/api/auth/me', token);
                updateUser(me);
            } catch {
                /* ignore */
            }
        };

        if (form.payment === 'razorpay') {
            const key = order.razorpayKeyId || import.meta.env.VITE_RAZORPAY_KEY_ID;
            try {
                const payment = await openRazorpayCheckout({
                    key,
                    orderId: order.razorpayOrderId,
                    amount: order.razorpayAmount ?? Math.round(order.total * 100),
                    customerName: form.name,
                    email: form.email,
                    phone: normalizePhone(form.phone),
                    description: `Order ${order.id}`,
                });

                const verified = await api.post('/api/orders/verify-payment', {
                    orderId: order.id,
                    razorpayOrderId: payment.razorpay_order_id,
                    razorpayPaymentId: payment.razorpay_payment_id,
                    razorpaySignature: payment.razorpay_signature,
                }, token);

                setPlaced(verified);
                clearCart();
                await refreshUser();
            } catch (payErr) {
                try {
                    await api.post('/api/orders/cancel-pending', { orderId: order.id }, token);
                } catch {
                    /* best-effort stock restore */
                }
                throw payErr instanceof Error
                    ? payErr
                    : new Error('Payment was not completed. Your bag was not charged.');
            }
            return;
        }

        setPlaced(order);
        clearCart();
        await refreshUser();
    }, [items, couponCode, form, token, clearCart, selectedAddressId, updateUser]);

    if (items.length === 0 && !placed) {
        return (
            <div className="container-page py-16">
                <EmptyState icon={ShoppingBag} title="Nothing to checkout" description="Add items to your bag and come back when you're ready." actionLabel="Continue shopping" actionHref="/shop" />
            </div>
        );
    }

    if (!isAuthenticated) {
        return <CheckoutLoginGate />;
    }

    const openPhoneVerify = () => {
        const digits = normalizePhone(form.phone);
        if (digits.length !== 10) {
            setError('Enter a valid 10-digit mobile number');
            return;
        }
        setError('');
        setOtpActive(true);
        try {
            sessionStorage.setItem(OTP_FLOW_KEY, JSON.stringify({ phone: digits }));
        } catch {
            /* ignore */
        }
        requestAnimationFrame(() => {
            otpSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        });
    };

    const closePhoneVerify = () => {
        setOtpActive(false);
        clearOtpFlow();
    };

    const handlePhoneVerified = (phone10) => {
        updateUser({ phone: phone10, phoneVerified: true });
        setVerifiedPhone(phone10);
        setOtpActive(false);
        setError('');
        clearOtpFlow();
    };

    const validateAddress = () => {
        const errs = validateDeliveryAddress(form);
        setAddressErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const canPlaceOrder = razorpayAvailable || codAvailable;

    const handlePlaceOrder = async () => {
        setError('');
        if (!canPlaceOrder) {
            setError('No payment methods are available for your order.');
            return;
        }

        if (!emailVerified) {
            setError('Please verify your email before placing an order. Check your inbox or resend the verification email below.');
            return;
        }

        const digits = normalizePhone(form.phone);
        if (digits.length !== 10) {
            setError('Enter a valid 10-digit mobile number');
            return;
        }

        if (!phoneReady) {
            if (skipPhoneVerify) {
                setError('Enter a valid 10-digit mobile number');
                return;
            }
            if (otpActive) {
                setError('Please enter and confirm the OTP sent to your phone.');
            } else {
                openPhoneVerify();
            }
            return;
        }

        if (!form.name.trim() || !form.email.trim()) {
            setError('Please fill in your name and email.');
            return;
        }
        if (!validateAddress()) {
            setError('Please complete your delivery address.');
            requestAnimationFrame(() => {
                addressSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            });
            return;
        }

        setLoading(true);
        try {
            await submitOrder();
        } catch (err) {
            if (err instanceof ApiError && err.status === 401) {
                logout();
                setError('Your session expired. Please sign in again to place your order.');
                return;
            }
            setError(err instanceof Error ? err.message : 'Failed to place order');
        } finally {
            setLoading(false);
        }
    };

    if (placed) return <OrderPlaced placed={placed} />;

    const ctaLabel = loading
        ? (form.payment === 'razorpay' ? 'Opening Razorpay…' : 'Placing order…')
        : phoneReady
            ? (form.payment === 'razorpay' ? 'Pay securely' : 'Place order')
            : 'Verify mobile & continue';

    const currentStep = addressComplete ? 2 : phoneReady ? 1 : 0;
    const placeOrderDisabled = loading || !canPlaceOrder;

    const onPhoneChange = (e) => {
        const next = e.target.value.replace(/[^\d+\s-]/g, '');
        const nextDigits = normalizePhone(next);
        setForm({ ...form, phone: next });
        if (otpActive) return;
        if (isAccountPhoneVerified(user, nextDigits)) {
            setVerifiedPhone(nextDigits);
            setOtpActive(false);
            clearOtpFlow();
            return;
        }
        if (nextDigits !== verifiedPhone) {
            setVerifiedPhone('');
            setOtpActive(false);
            clearOtpFlow();
        }
    };

    return (
        <div className="container-page py-8 lg:py-12">
            <Link to="/cart" className="group mb-5 inline-flex items-center gap-2 text-small text-muted hover:text-primary">
                <ChevronLeft size={16} className="transition-transform group-hover:-translate-x-0.5" aria-hidden="true" /> Back to bag
            </Link>

            <div className="mb-6">
                <p className="eyebrow mb-2">Secure checkout</p>
                <h1 className="text-h2">Complete your order</h1>
            </div>

            <CheckoutSteps activeIndex={currentStep} />

            {/* Mobile / tablet — single sticky CTA */}
            <div className="sticky top-16 z-30 -mx-4 mb-6 space-y-2 border-b border-line bg-canvas/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:hidden">
                {error && <p className="rounded-md bg-danger-tint px-3 py-2 text-caption text-danger" role="alert">{error}</p>}
                <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                        <p className="text-caption text-muted">{items.length} item{items.length !== 1 ? 's' : ''}</p>
                        <p className="font-display text-h4 leading-tight text-primary">{formatPrice(total)}</p>
                    </div>
                    <Button onClick={handlePlaceOrder} disabled={placeOrderDisabled} className="shrink-0">{ctaLabel}</Button>
                </div>
            </div>

            <p className="mb-6 flex items-center gap-3 rounded-lg bg-primary-tint p-4 text-small text-ink">
                <UserAvatar user={user} size="md" signedIn />
                <span className="min-w-0">
                    Signed in as <strong>{user?.name || user?.email}</strong>
                    {isPhoneVerified && <span className="ml-2 inline-flex items-center gap-1 font-medium text-success"><CheckCircle size={14} aria-hidden="true" /> Verified</span>}
                </span>
            </p>

            {!emailVerified && <EmailVerificationBanner className="mb-6" />}

            <form className="grid gap-8 lg:grid-cols-5 lg:gap-10" noValidate onSubmit={(e) => { e.preventDefault(); handlePlaceOrder(); }}>
                <div className="order-2 space-y-6 lg:order-1 lg:col-span-3">
                    <CheckoutSection icon={User} title="Contact details">
                        <div className="grid gap-4 sm:grid-cols-2">
                            <Input label="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoComplete="name" required />
                            <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} autoComplete="email" required />
                            <div className="sm:col-span-2" ref={otpSectionRef}>
                                <div className="flex items-end gap-2">
                                    <div className="min-w-0 flex-1">
                                        <Input label="Mobile number" type="tel" value={form.phone} onChange={onPhoneChange} placeholder="98765 43210" autoComplete="tel" required disabled={otpActive && !isPhoneVerified} />
                                    </div>
                                    {normalizePhone(form.phone).length === 10 && !isPhoneVerified && !otpActive && !skipPhoneVerify && (
                                        <Button variant="outline" onClick={openPhoneVerify} className="shrink-0">Verify mobile</Button>
                                    )}
                                    {isPhoneVerified && <span className="mb-3 inline-flex shrink-0 items-center gap-1 text-small font-medium text-success"><CheckCircle size={16} aria-hidden="true" /> Verified</span>}
                                </div>
                                <p className="mt-2 text-small text-muted">
                                    {isPhoneVerified
                                        ? isAccountPhoneVerified(user, phoneDigits)
                                            ? 'Your account mobile is verified. No OTP needed for future orders.'
                                            : 'This number is verified for your order.'
                                        : skipPhoneVerify
                                            ? !otpEnabled ? 'Mobile verification is currently disabled.' : 'Dev mode: mobile verification is skipped.'
                                            : otpActive
                                                ? 'Tap Send OTP below, then enter the code from SMS.'
                                                : 'Verify your mobile once. It stays verified on your account.'}
                                </p>

                                {!skipPhoneVerify && (
                                    <CheckoutInlineOtp phone={form.phone} token={token} active={otpActive && !isPhoneVerified} onVerified={handlePhoneVerified} onCancel={closePhoneVerify} />
                                )}
                            </div>
                        </div>
                    </CheckoutSection>

                    <CheckoutSection ref={addressSectionRef} icon={MapPin} title="Delivery address" className="scroll-mt-40">
                        {savedAddresses.length > 0 && (
                            <SavedAddressList addresses={savedAddresses} selectedId={selectedAddressId} onSelect={applySavedAddress} onNew={enterNewAddress} max={MAX_SAVED_ADDRESSES} />
                        )}
                        <div className={savedAddresses.length > 0 ? 'border-t border-line pt-5' : ''}>
                            <div className="mb-4 flex items-center justify-between gap-2">
                                <p className="text-small font-semibold text-ink">{selectedAddressId ? 'Selected address' : 'Address details'}</p>
                                {hasAddressInput && (
                                    <Button variant="ghost" size="sm" onClick={clearAddressFields}><X size={14} aria-hidden="true" /> Clear</Button>
                                )}
                            </div>
                            <DeliveryAddressForm value={form} onChange={handleAddressFormChange} errors={addressErrors} compact />
                        </div>
                    </CheckoutSection>

                    <CheckoutSection icon={CreditCard} title="Payment">
                        <PaymentOptions
                            value={form.payment}
                            onChange={(payment) => setForm({ ...form, payment })}
                            razorpayAvailable={razorpayAvailable}
                            codAvailable={codAvailable}
                            onlineEnabledInSettings={content.payments?.onlinePaymentEnabled !== false}
                            razorpayConfigured={RAZORPAY_ENABLED}
                        />
                    </CheckoutSection>

                    <div className="space-y-4 lg:hidden">
                        {error && <p className="rounded-lg bg-danger-tint px-4 py-3 text-small text-danger" role="alert">{error}</p>}
                        <p className="flex items-center justify-between px-1">
                            <span className="text-small text-muted">Total payable</span>
                            <span className="font-display text-h3 text-primary">{formatPrice(total)}</span>
                        </p>
                        <Button size="lg" className="w-full" onClick={handlePlaceOrder} disabled={placeOrderDisabled}>{ctaLabel}</Button>
                    </div>
                </div>

                <aside className="order-1 space-y-6 lg:order-2 lg:col-span-2" aria-label="Order summary">
                    <ActiveCoupons variant="sidebar" />

                    <div className="space-y-5 rounded-lg border border-line bg-surface p-5 sm:p-6 lg:sticky lg:top-28 lg:p-8">
                        <h2 className="font-sans text-h4">Order summary</h2>

                        <ul className="max-h-64 space-y-3 overflow-y-auto pr-1">
                            {items.map((item) => (
                                <li key={`${item.product.id}-${item.product.variantId || ''}`} className="flex gap-3">
                                    <img src={imageUrl(item.product.images[0])} alt="" width="56" height="64" className="h-16 w-14 shrink-0 rounded-md object-cover" />
                                    <div className="min-w-0 flex-1">
                                        <p className="line-clamp-1 text-small text-ink">{item.product.title}</p>
                                        <p className="text-small text-muted">Qty: {item.quantity}</p>
                                    </div>
                                    <p className="text-small font-medium">{formatPrice(item.product.price * item.quantity)}</p>
                                </li>
                            ))}
                        </ul>

                        <div className="space-y-2 border-t border-line pt-4 text-small">
                            <CouponInput compact />
                            <PriceBreakdown totalClassName="text-primary" />
                        </div>

                        {error && <p className="hidden rounded-lg bg-danger-tint p-3 text-small text-danger lg:block" role="alert">{error}</p>}

                        <div className="hidden lg:block">
                            <Button size="lg" className="w-full" onClick={handlePlaceOrder} disabled={placeOrderDisabled}>{ctaLabel}</Button>
                        </div>
                        <p className="hidden items-center justify-center gap-2 text-caption text-muted lg:flex"><Phone size={14} className="text-primary" aria-hidden="true" /> Mobile verified once per account</p>
                    </div>
                </aside>
            </form>
        </div>
    );
}
