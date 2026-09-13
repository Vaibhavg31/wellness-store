import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, MapPin, Phone, User, CreditCard, Package, Wallet, ChevronLeft, X, Plus } from 'lucide-react';
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
import UserAvatar from '@/components/ui/UserAvatar';
import VerifyAnimation from '@/components/ui/VerifyAnimation';
import CheckoutLoginGate from '@/components/checkout/CheckoutLoginGate';
import CheckoutInlineOtp, { normalizeCheckoutPhone } from '@/components/checkout/CheckoutInlineOtp';
import EmailVerificationBanner from '@/components/auth/EmailVerificationBanner';
import { DEV_SKIP_PHONE_VERIFY } from '@/hooks/useMsg91Otp';
import DeliveryAddressForm from '@/components/checkout/DeliveryAddressForm';
import CouponInput from '@/components/checkout/CouponInput';
import ActiveCoupons from '@/components/checkout/ActiveCoupons';
import PriceBreakdown from '@/components/checkout/PriceBreakdown';

const OTP_FLOW_KEY = 'krivea-checkout-otp-flow';
const MAX_SAVED_ADDRESSES = 3;

const STEPS = [
    { label: 'Bag',     icon: Package    },
    { label: 'Address', icon: MapPin     },
    { label: 'Payment', icon: CreditCard },
];

const razorpayKey = String(import.meta.env.VITE_RAZORPAY_KEY_ID || '');
const RAZORPAY_ENABLED = razorpayKey.startsWith('rzp_') && !razorpayKey.includes('xxxx');

function normalizePhone(value) {
    return normalizeCheckoutPhone(value);
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
            try {
                sessionStorage.removeItem(OTP_FLOW_KEY);
            } catch {
                /* ignore */
            }
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
                    try {
                        sessionStorage.removeItem(OTP_FLOW_KEY);
                    } catch {
                        /* ignore */
                    }
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
            <div className="min-h-[70vh] flex flex-col items-center justify-center px-6 text-center">
                <h1 className="font-display text-3xl mb-4">Nothing to checkout</h1>
                <p className="text-slate mb-6">Add items to your bag and come back when you&apos;re ready.</p>
                <Link to="/shop"><Button variant="turmeric">Continue Shopping</Button></Link>
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
        try {
            sessionStorage.removeItem(OTP_FLOW_KEY);
        } catch {
            /* ignore */
        }
    };

    const handlePhoneVerified = (phone10) => {
        updateUser({ phone: phone10, phoneVerified: true });
        setVerifiedPhone(phone10);
        setOtpActive(false);
        setError('');
        try {
            sessionStorage.removeItem(OTP_FLOW_KEY);
        } catch {
            /* ignore */
        }
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

    if (placed) {
        const paidOnline = placed.payment === 'razorpay';
        return (
            <div className="min-h-[80vh] flex items-center justify-center px-6">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
                    className="text-center max-w-md"
                >
                    <VerifyAnimation size={88} className="mx-auto mb-6 text-forest" />
                    <motion.h1
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4, duration: 0.4 }}
                        className="font-display text-3xl text-ink mb-3"
                    >
                        {paidOnline ? 'Payment Successful' : 'Order Confirmed'}
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.55 }}
                        className="text-slate font-light mb-2 leading-relaxed"
                    >
                        Thank you, {placed.shipping?.name}. Your order is confirmed.
                    </motion.p>
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.65 }}
                        className="text-sm text-ink mb-8"
                    >
                        Order ID: <span className="font-medium">{placed.id}</span>
                    </motion.p>
                    <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.75 }}
                        className="flex flex-col sm:flex-row gap-3 justify-center"
                    >
                        <Link to={`/orders/${placed.id}`}><Button variant="turmeric">Track Your Order</Button></Link>
                        <Link to="/shop"><Button variant="outline">Continue Shopping</Button></Link>
                    </motion.div>
                </motion.div>
            </div>
        );
    }

    const ctaLabel = loading
        ? (form.payment === 'razorpay' ? 'Opening Razorpay…' : 'Placing Order…')
        : phoneReady
            ? (form.payment === 'razorpay' ? 'Pay Securely' : 'Place Order')
            : 'Verify Mobile & Continue';

    const currentStep = addressComplete ? 2 : phoneReady ? 1 : 0;

    return (
        <div className="pb-12 lg:pb-20 px-4 sm:px-6 lg:px-8 min-h-screen bg-cream pt-2 sm:pt-4">
            <div className="max-w-6xl mx-auto">
                <Link
                    to="/cart"
                    className="inline-flex items-center gap-2 text-sm text-slate hover:text-forest mb-5 group transition-colors"
                >
                    <ChevronLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
                    Back to Bag
                </Link>

                <div className="mb-6 sm:mb-8">
                    <p className="text-[10px] tracking-[0.3em] uppercase text-forest mb-2">Secure Checkout</p>
                    <h1 className="font-display text-3xl md:text-4xl text-ink">Complete Your Order</h1>
                </div>

                <div className="flex items-center justify-center gap-2 sm:gap-4 mb-10" aria-label="Checkout progress">
                    {STEPS.map(({ label }, i) => {
                        const done = i < currentStep;
                        const current = i === currentStep;
                        return (
                            <div key={label} className="flex items-center gap-2 sm:gap-4">
                                <div className="flex items-center gap-2">
                                    <motion.span
                                        animate={{
                                            backgroundColor: done || current ? 'var(--color-forest)' : 'transparent',
                                        }}
                                        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium border transition-colors ${
                                            done || current
                                                ? 'border-forest text-cream'
                                                : 'border-forest/20 text-forest/40 bg-forest/5'
                                        }`}
                                        aria-current={current ? 'step' : undefined}
                                    >
                                        {done ? <CheckCircle size={14} /> : <span>{i + 1}</span>}
                                    </motion.span>
                                    <span className={`text-xs sm:text-sm transition-colors ${done || current ? 'text-ink font-medium' : 'text-slate/50'}`}>
                                        {label}
                                    </span>
                                </div>
                                {i < STEPS.length - 1 && (
                                    <div className={`w-8 sm:w-16 h-px transition-colors ${done ? 'bg-forest/40' : 'bg-border'}`} />
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Mobile / tablet — single sticky CTA (no duplicate bottom bar) */}
                <div className="lg:hidden sticky top-[var(--site-header-h,7rem)] z-30 -mx-4 sm:-mx-6 px-4 sm:px-6 py-3 mb-6 bg-cream/95 backdrop-blur-md border-b border-border/40 space-y-2">
                    {error && (
                        <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2" role="alert">
                            {error}
                        </p>
                    )}
                    <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                            <p className="text-[10px] tracking-[0.2em] uppercase text-slate">
                                {items.length} item{items.length !== 1 ? 's' : ''}
                            </p>
                            <p className="font-display text-xl text-forest leading-tight">{formatPrice(total)}</p>
                        </div>
                        <Button
                            variant="turmeric"
                            size="md"
                            type="button"
                            onClick={handlePlaceOrder}
                            disabled={loading || !canPlaceOrder}
                            className="flex-shrink-0 px-6 shadow-md shadow-forest/15"
                        >
                            {ctaLabel}
                        </Button>
                    </div>
                </div>

                <div className="mb-6 p-4 rounded-xl bg-forest/5 border border-forest/20 flex items-center gap-3">
                    <UserAvatar user={user} size="md" signedIn />
                    <p className="text-sm text-ink min-w-0">
                        Signed in as <span className="font-medium">{user?.name || user?.email}</span>
                        {isPhoneVerified && (
                            <motion.span
                                initial={{ opacity: 0, x: -4 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="text-emerald-700 inline-flex items-center gap-1 ml-1"
                            >
                                <CheckCircle size={12} /> Verified
                            </motion.span>
                        )}
                    </p>
                </div>

                {!emailVerified && (
                    <EmailVerificationBanner className="mb-6" />
                )}

                <form
                    className="grid lg:grid-cols-5 gap-8 lg:gap-10"
                    noValidate
                    onSubmit={(e) => {
                        e.preventDefault();
                        handlePlaceOrder();
                    }}
                >
                    <div className="lg:col-span-3 space-y-6 sm:space-y-8 order-2 lg:order-1">
                        <section className="bg-cream rounded-2xl p-4 sm:p-6 md:p-8 soft-shadow">
                            <div className="flex items-center gap-2.5 sm:gap-3 mb-4 sm:mb-6">
                                <User size={18} className="text-forest flex-shrink-0" />
                                <h2 className="font-display text-lg sm:text-xl text-ink">Contact Details</h2>
                            </div>
                            <div className="grid sm:grid-cols-2 gap-3 sm:gap-4">
                                <Input label="Full Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                                <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
                                <div className="sm:col-span-2" ref={otpSectionRef}>
                                    <div className="flex gap-2 items-end">
                                        <div className="flex-1 min-w-0">
                                            <Input
                                                label="Mobile Number"
                                                type="tel"
                                                value={form.phone}
                                                onChange={(e) => {
                                                    const next = e.target.value.replace(/[^\d+\s-]/g, '');
                                                    const nextDigits = normalizePhone(next);
                                                    setForm({ ...form, phone: next });
                                                    if (otpActive) return;
                                                    if (isAccountPhoneVerified(user, nextDigits)) {
                                                        setVerifiedPhone(nextDigits);
                                                        setOtpActive(false);
                                                        try {
                                                            sessionStorage.removeItem(OTP_FLOW_KEY);
                                                        } catch {
                                                            /* ignore */
                                                        }
                                                        return;
                                                    }
                                                    if (nextDigits !== verifiedPhone) {
                                                        setVerifiedPhone('');
                                                        setOtpActive(false);
                                                        try {
                                                            sessionStorage.removeItem(OTP_FLOW_KEY);
                                                        } catch {
                                                            /* ignore */
                                                        }
                                                    }
                                                }}
                                                placeholder="98765 43210"
                                                required
                                                disabled={otpActive && !isPhoneVerified}
                                            />
                                        </div>
                                        {normalizePhone(form.phone).length === 10 && !isPhoneVerified && !otpActive && !skipPhoneVerify && (
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="md"
                                                className="flex-shrink-0 mb-0.5 border-forest/30 text-forest whitespace-nowrap"
                                                onClick={openPhoneVerify}
                                            >
                                                Verify mobile
                                            </Button>
                                        )}
                                        {isPhoneVerified && (
                                            <motion.span
                                                initial={{ opacity: 0, scale: 0.9 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                className="flex-shrink-0 mb-3 inline-flex items-center gap-1 text-xs text-emerald-700 font-medium"
                                            >
                                                <CheckCircle size={14} />
                                                Verified
                                            </motion.span>
                                        )}
                                    </div>
                                    <p className="text-xs text-slate mt-2">
                                        {isPhoneVerified
                                            ? isAccountPhoneVerified(user, phoneDigits)
                                                ? 'Your account mobile is verified. No OTP needed for future orders.'
                                                : 'This number is verified for your order.'
                                            : skipPhoneVerify
                                                ? !otpEnabled
                                                    ? 'Mobile verification is currently disabled.'
                                                    : 'Dev mode: mobile verification is skipped.'
                                                : otpActive
                                                    ? 'Tap Send OTP below, then enter the code from SMS.'
                                                    : 'Verify your mobile once. It stays verified on your account.'}
                                    </p>

                                    {!skipPhoneVerify && (
                                        <CheckoutInlineOtp
                                            phone={form.phone}
                                            token={token}
                                            active={otpActive && !isPhoneVerified}
                                            onVerified={handlePhoneVerified}
                                            onCancel={closePhoneVerify}
                                        />
                                    )}
                                </div>
                            </div>
                        </section>

                        <section ref={addressSectionRef} className="bg-cream rounded-2xl p-4 sm:p-6 md:p-8 soft-shadow scroll-mt-[calc(var(--site-header-h,7rem)+5rem)]">
                            <div className="flex items-center gap-2.5 sm:gap-3 mb-4 sm:mb-6">
                                <MapPin size={18} className="text-forest flex-shrink-0" />
                                <h2 className="font-display text-lg sm:text-xl text-ink">Delivery Address</h2>
                            </div>
                            {savedAddresses.length > 0 && (
                                <div className="mb-5 sm:mb-6">
                                    <div className="flex items-center justify-between gap-2 mb-3">
                                        <p className="text-[10px] sm:text-xs tracking-[0.12em] sm:tracking-[0.15em] uppercase text-slate">
                                            Saved addresses
                                        </p>
                                        <span className="text-[10px] sm:text-xs text-slate/70 tabular-nums">
                                            {savedAddresses.length}/{MAX_SAVED_ADDRESSES}
                                        </span>
                                    </div>
                                    <div className="flex flex-col gap-2.5 sm:grid sm:grid-cols-2 sm:gap-3">
                                        {savedAddresses.map((addr) => {
                                            const selected = selectedAddressId === addr.id;
                                            return (
                                                <label
                                                    key={addr.id}
                                                    className={`relative flex items-start gap-3 p-3.5 sm:p-4 rounded-xl border cursor-pointer transition-all active:scale-[0.98] ${
                                                        selected
                                                            ? 'border-forest bg-forest/5 shadow-sm shadow-forest/10'
                                                            : 'border-border hover:border-forest/30 hover:bg-forest/[0.02]'
                                                    }`}
                                                >
                                                    <input
                                                        type="radio"
                                                        name="checkout-saved-address"
                                                        value={addr.id}
                                                        checked={selected}
                                                        onChange={() => applySavedAddress(addr)}
                                                        className="sr-only"
                                                    />
                                                    <span
                                                        className={`mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                                                            selected ? 'border-forest bg-forest' : 'border-forest/35 bg-cream'
                                                        }`}
                                                        aria-hidden="true"
                                                    >
                                                        {selected && <span className="h-2 w-2 rounded-full bg-cream" />}
                                                    </span>
                                                    <div className="min-w-0 flex-1 pr-1">
                                                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                                            <p className="text-sm font-medium text-ink">
                                                                {addr.label || 'Address'}
                                                            </p>
                                                            {addr.isDefault && (
                                                                <span className="text-[9px] uppercase tracking-wider text-forest bg-forest/10 px-1.5 py-0.5 rounded-full">
                                                                    Default
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="text-[13px] sm:text-xs text-slate mt-1.5 leading-relaxed break-words">
                                                            {addr.address}
                                                            {addr.landmark ? `, ${addr.landmark}` : ''}
                                                            <span className="text-ink/70"> · {addr.city}, {addr.pincode}</span>
                                                        </p>
                                                    </div>
                                                </label>
                                            );
                                        })}
                                    </div>
                                    <div className="mt-3 space-y-2">
                                        <button
                                            type="button"
                                            onClick={enterNewAddress}
                                            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 text-sm py-2.5 px-4 rounded-xl border border-forest/25 text-forest bg-forest/5 hover:bg-forest/10 active:bg-forest/15 transition-colors"
                                        >
                                            <Plus size={15} />
                                            Enter a new address
                                        </button>
                                        {savedAddresses.length < MAX_SAVED_ADDRESSES && (
                                            <p className="text-[11px] sm:text-xs text-slate/80 leading-relaxed px-0.5">
                                                New addresses are saved automatically when you place your order.
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}
                            <div className={`${savedAddresses.length > 0 ? 'border-t border-border/50 pt-4 sm:pt-5' : ''}`}>
                                <div className="flex items-center justify-between gap-2 mb-3 sm:mb-4">
                                    <p className="text-[10px] sm:text-xs tracking-[0.12em] sm:tracking-[0.15em] uppercase text-slate font-medium">
                                        {selectedAddressId ? 'Selected address' : 'Address details'}
                                    </p>
                                    {hasAddressInput && (
                                        <button
                                            type="button"
                                            onClick={clearAddressFields}
                                            className="inline-flex items-center gap-1 shrink-0 px-2.5 py-1.5 rounded-lg border border-border/70 bg-cream/60 text-[11px] sm:text-xs text-slate hover:text-forest hover:border-forest/30 active:bg-forest/5 transition-colors"
                                        >
                                            <X size={13} />
                                            Clear
                                        </button>
                                    )}
                                </div>
                                <DeliveryAddressForm
                                    value={form}
                                    onChange={handleAddressFormChange}
                                    errors={addressErrors}
                                    compact
                                />
                            </div>
                        </section>

                        <section className="bg-cream rounded-2xl p-5 sm:p-6 md:p-8 soft-shadow">
                            <div className="flex items-center gap-3 mb-6">
                                <CreditCard size={18} className="text-forest" />
                                <h2 className="font-display text-xl text-ink">Payment</h2>
                            </div>
                            <div className="space-y-3">
                                {razorpayAvailable && (
                                    <label className={`flex items-start gap-4 p-4 rounded-xl border cursor-pointer transition-colors ${form.payment === 'razorpay' ? 'border-forest bg-forest/5' : 'border-border hover:border-forest/40'}`}>
                                        <input
                                            type="radio"
                                            name="payment"
                                            value="razorpay"
                                            checked={form.payment === 'razorpay'}
                                            onChange={() => setForm({ ...form, payment: 'razorpay' })}
                                            className="mt-1 accent-forest"
                                        />
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <Wallet size={16} className="text-forest" />
                                                <p className="font-medium text-ink text-sm">Pay Online</p>
                                            </div>
                                            <p className="text-xs text-slate mt-0.5">UPI · Cards · Net Banking via Razorpay</p>
                                        </div>
                                    </label>
                                )}
                                {codAvailable && (
                                    <label className={`flex items-start gap-4 p-4 rounded-xl border cursor-pointer transition-colors ${form.payment === 'cod' ? 'border-forest bg-forest/5' : 'border-border hover:border-forest/40'}`}>
                                        <input
                                            type="radio"
                                            name="payment"
                                            value="cod"
                                            checked={form.payment === 'cod'}
                                            onChange={() => setForm({ ...form, payment: 'cod' })}
                                            className="mt-1 accent-forest"
                                        />
                                        <div>
                                            <p className="font-medium text-ink text-sm">Cash on Delivery</p>
                                            <p className="text-xs text-slate mt-0.5">Pay when your order arrives</p>
                                        </div>
                                    </label>
                                )}
                                {!razorpayAvailable && !codAvailable && (
                                    <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                                        No payment methods are available for the items in your bag. Please contact support.
                                    </p>
                                )}
                                {!razorpayAvailable && codAvailable && content.payments?.onlinePaymentEnabled === false && (
                                    <p className="text-xs text-slate/70 px-1">
                                        Online payment is turned off in store settings.
                                    </p>
                                )}
                                {!razorpayAvailable && codAvailable && content.payments?.onlinePaymentEnabled !== false && !RAZORPAY_ENABLED && (
                                    <p className="text-xs text-slate/70 px-1">
                                        Online payment will appear here once Razorpay keys are configured.
                                    </p>
                                )}
                            </div>
                        </section>

                        {/* Full-width place order — after payment (mobile / tablet) */}
                        <div className="lg:hidden space-y-4">
                            {error && (
                                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3" role="alert">
                                    {error}
                                </p>
                            )}
                            <div className="flex items-center justify-between px-1">
                                <span className="text-sm text-slate">Total payable</span>
                                <span className="font-display text-2xl text-forest">{formatPrice(total)}</span>
                            </div>
                            <Button
                                variant="turmeric"
                                size="lg"
                                type="button"
                                className="w-full"
                                onClick={handlePlaceOrder}
                                disabled={loading || !canPlaceOrder}
                            >
                                {ctaLabel}
                            </Button>
                        </div>
                    </div>

                    <div className="lg:col-span-2 order-1 lg:order-2 space-y-6">
                        <ActiveCoupons variant="sidebar" />

                        <div className="lg:sticky lg:top-[calc(var(--site-header-h,7rem)+1rem)] lg:z-10 bg-cream rounded-2xl p-5 sm:p-6 md:p-8 soft-shadow space-y-5">
                            <h2 className="font-display text-xl text-ink">Order Summary</h2>

                            <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                                {items.map((item) => (
                                    <div key={item.product.id} className="flex gap-3">
                                        <img src={imageUrl(item.product.images[0])} alt="" className="w-14 h-16 object-cover rounded-lg flex-shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm text-ink line-clamp-1">{item.product.title}</p>
                                            <p className="text-xs text-slate">Qty: {item.quantity}</p>
                                        </div>
                                        <p className="text-sm font-medium">{formatPrice(item.product.price * item.quantity)}</p>
                                    </div>
                                ))}
                            </div>

                            <div className="border-t border-border/60 pt-4 space-y-2 text-sm">
                                <CouponInput compact />
                                <PriceBreakdown totalClassName="text-forest" />
                            </div>

                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, y: -4 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="hidden lg:block p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm"
                                    role="alert"
                                >
                                    {error}
                                </motion.div>
                            )}

                            <div className="hidden lg:block">
                                <Button variant="turmeric" size="lg" className="w-full" type="button" onClick={handlePlaceOrder} disabled={loading || !canPlaceOrder}>
                                    {ctaLabel}
                                </Button>
                            </div>

                            <div className="hidden lg:flex items-center justify-center gap-2 text-[10px] text-slate">
                                <Phone size={11} className="text-forest" />
                                Mobile verified once per account
                            </div>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}
