import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import Button from '@/components/ui/Button';
import VerifyAnimation from '@/components/ui/VerifyAnimation';
import { api } from '@/services/api';
function normalizePhone(value) {
    const digits = String(value || '').replace(/\D/g, '');
    return digits.length > 10 ? digits.slice(-10) : digits;
}

function formatDisplayPhone(phone) {
    const d = normalizePhone(phone);
    if (d.length !== 10) return phone;
    return `+91 ${d.slice(0, 5)} ${d.slice(5)}`;
}

function sentKey(phoneDigits) {
    return `wellness-otp-sent-${phoneDigits}`;
}

/**
 * Inline checkout OTP — server-side MSG91 API (no captcha / widget).
 */
export default function CheckoutInlineOtp({
    phone,
    token,
    active,
    onVerified,
    onCancel,
}) {
    const [otpSent, setOtpSent] = useState(false);
    const [otp, setOtp] = useState('');
    const [sending, setSending] = useState(false);
    const [verifying, setVerifying] = useState(false);
    const [error, setError] = useState('');
    const [resendIn, setResendIn] = useState(0);
    const [verified, setVerified] = useState(false);
    const sendLockRef = useRef(false);
    const confirmLockRef = useRef(false);

    const phoneDigits = normalizePhone(phone);
    const displayPhone = formatDisplayPhone(phone);
    const otpSentStorageKey = sentKey(phoneDigits);

    useEffect(() => {
        if (active && phoneDigits.length === 10) {
            try {
                if (sessionStorage.getItem(otpSentStorageKey) === '1') {
                    setOtpSent(true);
                }
            } catch {
                /* ignore */
            }
        }
    }, [active, phoneDigits, otpSentStorageKey]);

    useEffect(() => {
        if (!active) {
            setOtpSent(false);
            setOtp('');
            setError('');
            setResendIn(0);
            sendLockRef.current = false;
            confirmLockRef.current = false;
            try {
                sessionStorage.removeItem(otpSentStorageKey);
            } catch {
                /* ignore */
            }
        }
    }, [active, otpSentStorageKey]);

    useEffect(() => {
        if (resendIn <= 0) return undefined;
        const t = setInterval(() => setResendIn((s) => Math.max(0, s - 1)), 1000);
        return () => clearInterval(t);
    }, [resendIn]);

    const markSent = () => {
        setOtpSent(true);
        setResendIn(30);
        setOtp('');
        setError('');
        try {
            sessionStorage.setItem(otpSentStorageKey, '1');
        } catch {
            /* ignore */
        }
    };

    const sendOtp = async () => {
        if (phoneDigits.length !== 10) {
            setError('Enter a valid 10-digit mobile number');
            return;
        }
        if (sendLockRef.current) {
            return;
        }

        sendLockRef.current = true;
        setError('');
        setSending(true);
        try {
            const res = await api.post('/api/auth/send-phone-otp', { phone: phoneDigits }, token);
            markSent();
            if (import.meta.env.DEV && res?.requestId) {
                console.info('[OTP] Server API request_id:', res.requestId);
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Could not send OTP';
            setOtpSent(false);
            try {
                sessionStorage.removeItem(otpSentStorageKey);
            } catch {
                /* ignore */
            }
            setError(message);
            if (message.toLowerCase().includes('too many')) {
                setOtpSent(true);
            }
        } finally {
            setSending(false);
            sendLockRef.current = false;
        }
    };

    const resendOtp = async () => {
        if (phoneDigits.length !== 10 || resendIn > 0 || sending) return;

        sendLockRef.current = true;
        setError('');
        setSending(true);
        try {
            await api.post('/api/auth/resend-phone-otp', { phone: phoneDigits }, token);
            setResendIn(30);
            setOtp('');
            setError('');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not resend OTP');
        } finally {
            setSending(false);
            sendLockRef.current = false;
        }
    };

    const confirmOtp = async (e) => {
        e?.preventDefault();
        if (confirmLockRef.current) return;

        if (otp.replace(/\D/g, '').length !== 6) {
            setError('Enter the full 6-digit OTP from your SMS');
            return;
        }

        confirmLockRef.current = true;
        setError('');
        setVerifying(true);
        try {
            const code = otp.replace(/\D/g, '');
            const res = await api.post('/api/auth/confirm-phone-otp', {
                phone: phoneDigits,
                otp: code,
            }, token);

            try {
                sessionStorage.removeItem(otpSentStorageKey);
                sessionStorage.removeItem('wellness-checkout-otp-flow');
            } catch {
                /* ignore */
            }
            setVerified(true);
            setTimeout(() => onVerified(res.phone), 700);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Invalid OTP');
        } finally {
            setVerifying(false);
            confirmLockRef.current = false;
        }
    };

    if (!active) return null;

    if (verified) {
        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mt-4 p-6 rounded-xl border border-primary/20 bg-primary/5 flex flex-col items-center text-center"
            >
                <VerifyAnimation size={64} className="text-primary mb-3" />
                <p className="text-sm font-medium text-ink">Mobile verified</p>
                <p className="text-xs text-muted mt-1">{displayPhone}</p>
            </motion.div>
        );
    }

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
            >
                <div className="mt-4 p-4 sm:p-5 rounded-xl border border-primary/15 bg-primary/[0.03]">
                    <div className="flex items-start justify-between gap-3 mb-3">
                        <div>
                            <p className="text-xs tracking-[0.15em] uppercase text-primary font-medium mb-1">
                                Mobile verification
                            </p>
                            <p className="text-sm text-ink">
                                {otpSent
                                    ? <>Enter the code sent to <span className="font-medium">{displayPhone}</span></>
                                    : <>Verify <span className="font-medium">{displayPhone}</span> with a one-time SMS code</>}
                            </p>
                        </div>
                        {onCancel && (
                            <button
                                type="button"
                                onClick={onCancel}
                                className="text-xs text-muted hover:text-primary transition-colors flex-shrink-0"
                            >
                                Change number
                            </button>
                        )}
                    </div>

                    {!otpSent && !sending && (
                        <Button
                            type="button"
                            variant="turmeric"
                            size="md"
                            className="w-full sm:w-auto bg-primary hover:bg-primary-deep text-canvas border-primary mb-3"
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                sendOtp();
                            }}
                        >
                            Send OTP to my phone
                        </Button>
                    )}

                    {sending && (
                        <div className="flex items-center gap-2 text-sm text-muted mb-3">
                            <Loader2 size={16} className="animate-spin text-primary" />
                            {otpSent ? 'Resending OTP…' : 'Sending OTP…'}
                        </div>
                    )}

                    {otpSent && (
                        <div className="space-y-4">
                            <div>
                                <label htmlFor="checkout-inline-otp" className="block text-xs tracking-[0.12em] uppercase text-muted mb-2">
                                    6-digit OTP
                                </label>
                                <input
                                    id="checkout-inline-otp"
                                    type="text"
                                    inputMode="numeric"
                                    autoComplete="one-time-code"
                                    maxLength={6}
                                    value={otp}
                                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            confirmOtp(e);
                                        }
                                    }}
                                    placeholder="000000"
                                    className="w-full text-center text-xl tracking-[0.35em] px-4 py-3 bg-canvas border border-line rounded-xl focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/25 font-medium text-ink"
                                    disabled={verifying}
                                    autoFocus
                                />
                            </div>

                            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                                <Button
                                    type="button"
                                    variant="turmeric"
                                    size="md"
                                    className="flex-1 bg-primary hover:bg-primary-deep text-canvas border-primary"
                                    disabled={verifying || otp.length !== 6}
                                    onClick={confirmOtp}
                                >
                                    {verifying ? 'Verifying…' : 'Confirm OTP'}
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="md"
                                    className="flex-1 border-primary/25 text-primary"
                                    disabled={sending || verifying || resendIn > 0}
                                    onClick={resendOtp}
                                >
                                    {resendIn > 0 ? `Resend in ${resendIn}s` : 'Resend OTP'}
                                </Button>
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="mt-3 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700" role="alert">
                            <p>{error}</p>
                        </div>
                    )}

                    <p className="mt-3 text-[11px] text-muted leading-relaxed">
                        SMS can take up to a minute. Check spam if you don&apos;t see it.
                    </p>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}

export { normalizePhone as normalizeCheckoutPhone };
