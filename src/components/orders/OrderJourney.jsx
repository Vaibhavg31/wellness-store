import { motion } from 'framer-motion';
import { Check, Truck, MapPin, XCircle, RotateCcw } from 'lucide-react';
import {
    FULFILLMENT_PIPELINE,
    buildStatusHistory,
    getFulfillmentProgress,
    getStatusLabel,
    isStepActive,
    isStepDone,
    normalizeStatus,
} from '@/constants/orders';

const STEP_META = {
    confirmed: { icon: Check, message: 'Payment confirmed. We\'re preparing your order' },
    out_for_delivery: { icon: Truck, message: 'On the way to you' },
    delivered: { icon: MapPin, message: 'Delivered. Enjoy your order' },
};

const TERMINAL_META = {
    cancelled: { icon: XCircle, message: 'This order was cancelled' },
    returned: { icon: RotateCcw, message: 'Return processed' },
};

function StepIcon({ step, active, done, terminal }) {
    const meta = TERMINAL_META[step] || STEP_META[step];
    const Icon = meta?.icon || Check;

    if (terminal) {
        return (
            <div className="w-11 h-11 rounded-full bg-red-50 border-2 border-red-200 flex items-center justify-center">
                <Icon size={18} className="text-red-600" />
            </div>
        );
    }

    if (done) {
        return (
            <motion.div
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                className="w-11 h-11 rounded-full bg-wine text-ivory flex items-center justify-center shadow-md shadow-wine/20"
            >
                <Check size={18} strokeWidth={2.5} />
            </motion.div>
        );
    }

    if (active) {
        return (
            <div className="relative">
                <motion.div
                    animate={{ scale: [1, 1.08, 1] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                    className="w-11 h-11 rounded-full bg-gradient-to-br from-wine to-wine-light text-ivory flex items-center justify-center ring-4 ring-wine/15"
                >
                    <Icon size={18} />
                </motion.div>
                <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-gold border-2 border-ivory animate-pulse" />
            </div>
        );
    }

    return (
        <div className="w-11 h-11 rounded-full bg-warm-beige/80 border border-border/60 flex items-center justify-center text-soft-brown/50">
            <Icon size={16} />
        </div>
    );
}

export default function OrderJourney({ order, variant = 'full' }) {
    const status = normalizeStatus(order.status);
    const isTerminal = status === 'cancelled' || status === 'returned';
    const history = buildStatusHistory(order);

    if (isTerminal) {
        const meta = TERMINAL_META[status];
        const Icon = meta.icon;
        const entry = history.find((h) => normalizeStatus(h.status) === status);

        return (
            <div className="rounded-2xl bg-gradient-to-br from-warm-beige/60 to-ivory border border-border/40 p-6 sm:p-8 text-center">
                <div className="w-16 h-16 rounded-full bg-red-50 border border-red-100 flex items-center justify-center mx-auto mb-4">
                    <Icon size={28} className="text-red-600" />
                </div>
                <p className="font-serif text-2xl text-charcoal mb-2">{getStatusLabel(status, 'user')}</p>
                <p className="text-soft-brown text-sm max-w-sm mx-auto">{meta.message}</p>
                {entry?.at && (
                    <p className="text-xs text-soft-brown/70 mt-3">
                        {new Date(entry.at).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                )}
            </div>
        );
    }

    const steps = FULFILLMENT_PIPELINE;

    if (variant === 'compact') {
        const activeStep = FULFILLMENT_PIPELINE.find((_, i) => isStepActive(status, i))
            || (status === 'confirmed' ? 'confirmed' : FULFILLMENT_PIPELINE[0]);
        const meta = STEP_META[activeStep];
        const progress = getFulfillmentProgress(status);

        return (
            <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-soft-brown">
                    <span>{getStatusLabel(activeStep, 'user')}</span>
                    <span>{Math.round(progress)}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-warm-beige overflow-hidden">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                        className="h-full rounded-full bg-gradient-to-r from-wine via-rose-gold to-gold"
                    />
                </div>
                {meta && <p className="text-xs text-soft-brown/80">{meta.message}</p>}
            </div>
        );
    }

    return (
        <div className="rounded-2xl bg-gradient-to-b from-ivory to-warm-beige/40 border border-border/40 p-6 sm:p-8 overflow-hidden relative">
            <div className="absolute top-0 right-0 w-40 h-40 bg-gold/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

            <p className="text-xs tracking-[0.25em] uppercase text-soft-brown mb-6">Your Journey</p>

            <div className="relative">
                {steps.map((step, i) => {
                    const done = isStepDone(status, i);
                    const active = isStepActive(status, i);
                    const meta = STEP_META[step];
                    const historyEntry = history.find((h) => normalizeStatus(h.status) === step);

                    return (
                        <div key={step} className="flex gap-4 pb-8 last:pb-0 relative">
                            {i < steps.length - 1 && (
                                <div
                                    className={`absolute left-[22px] top-11 w-0.5 h-[calc(100%-12px)] ${
                                        done ? 'bg-wine/40' : 'bg-border/60'
                                    }`}
                                />
                            )}

                            <StepIcon step={step} active={active} done={done} />

                            <div className={`flex-1 pt-1.5 ${!done && !active ? 'opacity-45' : ''}`}>
                                <p className={`font-medium ${active ? 'text-charcoal' : 'text-charcoal/80'}`}>
                                    {getStatusLabel(step, 'user')}
                                </p>
                                <p className="text-sm text-soft-brown mt-0.5">{meta.message}</p>
                                {historyEntry?.at && (done || active) && (
                                    <p className="text-[11px] text-soft-brown/60 mt-1.5">
                                        {new Date(historyEntry.at).toLocaleString('en-IN', {
                                            day: 'numeric',
                                            month: 'short',
                                            hour: '2-digit',
                                            minute: '2-digit',
                                        })}
                                    </p>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
