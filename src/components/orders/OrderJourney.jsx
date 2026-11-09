import { motion } from 'framer-motion';
import { Check, ClipboardCheck, PackageCheck, Truck, MapPin, XCircle, RotateCcw } from 'lucide-react';
import { buildStatusHistory, getStatusLabel, isAwaitingPayment, normalizeStatus } from '@/constants/orders';

/**
 * The order tracker. Four steps, like the big marketplaces: Order placed → Confirmed → Out for delivery → Delivered.
 * Every step before the current one is done (ticked), the current one is highlighted, the rest are still to come.
 * (It used to start at "Confirmed", so a just-placed order showed every step greyed out, and a cash-on-delivery order
 * read "Payment confirmed".)
 */
const STEPS = ['placed', 'confirmed', 'out_for_delivery', 'delivered'];
const ICONS = { placed: ClipboardCheck, confirmed: PackageCheck, out_for_delivery: Truck, delivered: MapPin };
const PROGRESS = { placed: 10, confirmed: 40, out_for_delivery: 75, delivered: 100 };

function stepMessage(step, order, current) {
    const paidOnline = order.payment === 'razorpay' && order.paymentStatus === 'paid';
    switch (step) {
        case 'placed':
            if (isAwaitingPayment(order)) return 'Waiting for your payment';
            return current ? 'We have your order and will confirm it shortly' : 'We received your order';
        case 'confirmed':
            return paidOnline ? 'Payment received. We are packing your order' : 'We are packing your order';
        case 'out_for_delivery':
            return 'On the way to you';
        default:
            return 'Delivered. Enjoy your order';
    }
}

const TERMINAL_META = {
    cancelled: { icon: XCircle, message: 'This order was cancelled' },
    returned: { icon: RotateCcw, message: 'Return processed' },
};

const fmtWhen = (at) => new Date(at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

function StepIcon({ step, active, done }) {
    const Icon = ICONS[step] || Check;
    if (done) {
        return (
            <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="flex size-11 items-center justify-center rounded-full bg-primary text-canvas shadow-md shadow-primary/20">
                <Check size={18} strokeWidth={2.5} aria-hidden="true" />
            </motion.div>
        );
    }
    if (active) {
        return (
            <div className="relative">
                <motion.div
                    animate={{ scale: [1, 1.08, 1] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                    className="flex size-11 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-hover text-canvas ring-4 ring-primary/15 motion-reduce:animate-none"
                >
                    <Icon size={18} aria-hidden="true" />
                </motion.div>
                <span className="absolute -right-0.5 -top-0.5 size-3 rounded-full border-2 border-canvas bg-accent motion-safe:animate-pulse" />
            </div>
        );
    }
    return (
        <div className="flex size-11 items-center justify-center rounded-full border border-line bg-canvas-alt text-muted/60">
            <Icon size={16} aria-hidden="true" />
        </div>
    );
}

export default function OrderJourney({ order, variant = 'full' }) {
    const status = normalizeStatus(order.status);
    const history = buildStatusHistory(order);

    if (status === 'cancelled' || status === 'returned') {
        const meta = TERMINAL_META[status];
        const Icon = meta.icon;
        const entry = [...history].reverse().find((h) => normalizeStatus(h.status) === status);
        return (
            <div className="rounded-2xl border border-line/40 bg-gradient-to-br from-canvas-alt to-canvas p-6 text-center sm:p-8">
                <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full border border-danger/30 bg-danger-tint">
                    <Icon size={28} className="text-danger" aria-hidden="true" />
                </div>
                <p className="mb-2 font-display text-2xl text-ink">{getStatusLabel(status, 'user')}</p>
                <p className="mx-auto max-w-sm text-sm text-muted">{meta.message}</p>
                {entry?.at && <p className="mt-3 text-xs text-muted">{fmtWhen(entry.at)}</p>}
            </div>
        );
    }

    const current = Math.max(0, STEPS.indexOf(status));
    const delivered = status === 'delivered';

    if (variant === 'compact') {
        const step = STEPS[current];
        return (
            <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-muted">
                    <span className="font-medium text-ink">{isAwaitingPayment(order) ? 'Awaiting payment' : getStatusLabel(step, 'user')}</span>
                    <span>Step {current + 1} of {STEPS.length}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-canvas-alt" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={PROGRESS[step]} aria-label="Order progress">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${PROGRESS[step]}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                        className="h-full rounded-full bg-gradient-to-r from-primary via-accent to-accent"
                    />
                </div>
                <p className="text-xs text-muted">{stepMessage(step, order, true)}</p>
            </div>
        );
    }

    return (
        <div className="relative overflow-hidden rounded-2xl border border-line/40 bg-gradient-to-b from-canvas to-canvas-alt p-6 sm:p-8">
            <h2 className="mb-6 font-sans text-xs uppercase tracking-[0.25em] text-muted">Your journey</h2>
            <ol className="relative">
                {STEPS.map((step, i) => {
                    const done = i < current || delivered;
                    const active = i === current && !delivered;
                    const entry = [...history].reverse().find((h) => normalizeStatus(h.status) === step) || (step === 'placed' ? { at: order.createdAt } : null);
                    return (
                        <li key={step} className="relative flex gap-4 pb-8 last:pb-0" aria-current={active ? 'step' : undefined}>
                            {i < STEPS.length - 1 && (
                                <div aria-hidden="true" className={`absolute left-[22px] top-11 h-[calc(100%-12px)] w-0.5 ${done ? 'bg-primary/40' : 'bg-line'}`} />
                            )}
                            <StepIcon step={step} active={active} done={done} />
                            <div className={`flex-1 pt-1.5 ${!done && !active ? 'opacity-55' : ''}`}>
                                <p className={`font-medium ${active ? 'text-ink' : 'text-ink/80'}`}>
                                    {getStatusLabel(step, 'user')}
                                    <span className="sr-only">{done ? ' (done)' : active ? ' (current step)' : ' (to come)'}</span>
                                </p>
                                <p className="mt-0.5 text-sm text-muted">{stepMessage(step, order, active)}</p>
                                {entry?.at && (done || active) && <p className="mt-1.5 text-[11px] text-muted">{fmtWhen(entry.at)}</p>}
                            </div>
                        </li>
                    );
                })}
            </ol>
        </div>
    );
}
