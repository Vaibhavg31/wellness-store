import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, MapPin, CheckCircle } from 'lucide-react';
import Input from '@/components/ui/Input';
import { lookupPincode, isValidPincode } from '@/utils/pincodeLookup';
import { formatIndianAddress } from '@/utils/formatAddress';

export default function DeliveryAddressForm({ value, onChange, errors = {}, compact = false }) {
    const [lookupState, setLookupState] = useState('idle');
    const debounceRef = useRef(null);
    const lastLookupRef = useRef('');
    const mountedRef = useRef(true);

    useEffect(() => () => { mountedRef.current = false; }, []);

    const update = (patch) => onChange({ ...value, ...patch });

    useEffect(() => {
        const digits = String(value.pincode || '').replace(/\D/g, '').slice(0, 6);
        if (digits !== value.pincode) {
            update({ pincode: digits });
            return;
        }

        if (debounceRef.current) clearTimeout(debounceRef.current);

        if (digits.length < 6) {
            setLookupState('idle');
            return;
        }

        if (lastLookupRef.current === digits && value.city && value.state) {
            setLookupState('found');
            return;
        }

        debounceRef.current = setTimeout(async () => {
            setLookupState('loading');
            const result = await lookupPincode(digits);
            if (!mountedRef.current) return;
            lastLookupRef.current = digits;

            if (result) {
                update({
                    city: result.city,
                    state: result.state,
                });
                setLookupState('found');
            } else {
                setLookupState('not-found');
            }
        }, 400);

        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, [value.pincode]); // eslint-disable-line react-hooks/exhaustive-deps

    const pincodeValid = isValidPincode(value.pincode);
    const preview = formatIndianAddress(value, { multiline: true });

    const inputClass = compact
        ? '!rounded-xl !px-4 !py-3 text-sm sm:!rounded-full sm:!px-5 sm:!py-3.5'
        : undefined;

    const labelClass = compact
        ? 'block text-[10px] sm:text-xs tracking-[0.12em] sm:tracking-[0.15em] uppercase text-slate mb-1.5 sm:mb-2 font-medium'
        : 'block text-xs tracking-[0.15em] uppercase text-slate mb-2 font-medium';

    return (
        <div className={compact ? 'space-y-3 sm:space-y-4' : 'space-y-4'}>
            <div>
                <label className={labelClass}>
                    Street Address
                </label>
                <textarea
                    value={value.address}
                    onChange={(e) => update({ address: e.target.value })}
                    rows={compact ? 2 : 3}
                    required
                    className={`w-full bg-cream/60 border focus:outline-none focus:border-turmeric focus:ring-1 focus:ring-turmeric/20 transition-all duration-300 resize-none text-ink placeholder:text-slate/45 font-light ${
                        compact
                            ? 'px-4 py-3 text-sm rounded-xl sm:px-5 sm:py-3.5 sm:text-base sm:rounded-2xl'
                            : 'px-5 py-3.5 rounded-2xl'
                    } ${errors.address ? 'border-red-400' : 'border-border'}`}
                    placeholder="House / Flat no., Building, Street, Area"
                />
                {errors.address && (
                    <p className="mt-1.5 text-xs text-red-500" role="alert">{errors.address}</p>
                )}
            </div>

            <Input
                label="Landmark (optional)"
                value={value.landmark || ''}
                onChange={(e) => update({ landmark: e.target.value })}
                placeholder="Near metro, mall, landmark, etc."
                className={inputClass}
            />

            <div className={`grid gap-3 ${compact ? 'sm:grid-cols-2 sm:gap-4' : 'sm:grid-cols-2 gap-4'}`}>
                <motion.div
                    initial={false}
                    animate={{ opacity: lookupState === 'found' ? 1 : 0.9 }}
                    transition={{ duration: 0.3 }}
                >
                    <Input
                        label="City / District"
                        value={value.city}
                        onChange={(e) => update({ city: e.target.value })}
                        placeholder="e.g. Mumbai"
                        required
                        error={errors.city}
                        className={inputClass}
                    />
                </motion.div>
                <motion.div
                    initial={false}
                    animate={{ opacity: lookupState === 'found' ? 1 : 0.9 }}
                    transition={{ duration: 0.3 }}
                >
                    <Input
                        label="State"
                        value={value.state || ''}
                        onChange={(e) => update({ state: e.target.value })}
                        placeholder="e.g. Maharashtra"
                        required
                        error={errors.state}
                        className={inputClass}
                    />
                </motion.div>
            </div>

            <div>
                <Input
                    label="PIN Code"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={value.pincode}
                    onChange={(e) => {
                        const digits = e.target.value.replace(/\D/g, '').slice(0, 6);
                        update({ pincode: digits });
                        if (digits.length < 6) {
                            setLookupState('idle');
                        }
                    }}
                    placeholder="6-digit PIN"
                    required
                    error={errors.pincode}
                    className={inputClass}
                />
                <AnimatePresence mode="wait">
                    {lookupState === 'loading' && (
                        <motion.p
                            key="loading"
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="mt-1.5 text-xs text-slate flex items-center gap-1.5"
                        >
                            <Loader2 size={12} className="animate-spin text-forest" />
                            Looking up city & state…
                        </motion.p>
                    )}
                    {lookupState === 'found' && pincodeValid && (
                        <motion.p
                            key="found"
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="mt-1.5 text-xs text-emerald-700 flex items-center gap-1"
                        >
                            <CheckCircle size={12} className="flex-shrink-0" />
                            <span className="break-words">
                                {value.city}{value.state ? `, ${value.state}` : ''}
                                <span className="hidden sm:inline"> (auto-filled from PIN)</span>
                            </span>
                        </motion.p>
                    )}
                    {lookupState === 'not-found' && pincodeValid && (
                        <motion.p
                            key="not-found"
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="mt-1.5 text-xs text-amber-700 leading-relaxed"
                        >
                            PIN not found. Enter city & state manually.
                        </motion.p>
                    )}
                </AnimatePresence>
                <p className="mt-1.5 text-[11px] text-slate/80 leading-relaxed">
                    {compact
                        ? 'Enter PIN last to auto-fill city & state.'
                        : 'Enter PIN last. We\'ll auto-fill city and state when possible.'}
                </p>
            </div>

            {value.address.trim() && pincodeValid && value.city && (
                <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-start gap-2.5 p-3.5 sm:p-4 rounded-xl bg-forest/5 border border-forest/10"
                >
                    <MapPin size={14} className="text-forest mt-0.5 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                        <p className="text-[10px] tracking-[0.12em] sm:tracking-[0.15em] uppercase text-forest/70 mb-1">Delivery preview</p>
                        <p className="text-xs sm:text-sm text-ink leading-relaxed break-words whitespace-pre-line">{preview}</p>
                    </div>
                </motion.div>
            )}
        </div>
    );
}
