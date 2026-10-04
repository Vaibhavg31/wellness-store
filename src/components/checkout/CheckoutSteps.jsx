import { Check, CreditCard, MapPin, ShoppingBag } from 'lucide-react';
import { cn } from '@/utils/formatPrice';

const STEPS = [
    { label: 'Bag', icon: ShoppingBag },
    { label: 'Address', icon: MapPin },
    { label: 'Payment', icon: CreditCard },
];

/** Progress indicator for the bag → address → payment flow. */
export default function CheckoutSteps({ activeIndex = 0 }) {
    return (
        <ol className="mb-8 flex items-center justify-center gap-2 sm:gap-3" aria-label="Checkout progress">
            {STEPS.map((step, i) => {
                const Icon = step.icon;
                const done = i < activeIndex;
                const active = i === activeIndex;
                return (
                    <li key={step.label} className="flex items-center gap-2 sm:gap-3" aria-current={active ? 'step' : undefined}>
                        <span className="flex items-center gap-2">
                            <span className={cn('grid size-9 place-items-center rounded-full border transition-colors', active ? 'border-primary bg-primary text-white' : done ? 'border-primary bg-primary-tint text-primary' : 'border-line-strong bg-surface text-muted')}>
                                {done ? <Check size={16} /> : <Icon size={16} strokeWidth={1.75} />}
                            </span>
                            <span className={cn('hidden text-small font-medium sm:inline', active ? 'text-ink' : 'text-muted')}>{step.label}</span>
                        </span>
                        {i < STEPS.length - 1 && <span className={cn('h-px w-6 sm:w-10', done ? 'bg-primary' : 'bg-line-strong')} aria-hidden="true" />}
                    </li>
                );
            })}
        </ol>
    );
}
