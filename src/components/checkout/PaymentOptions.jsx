import { Wallet } from 'lucide-react';
import { cn } from '@/utils/formatPrice';

function Option({ value, current, onChange, title, description, icon: Icon }) {
    const selected = current === value;
    return (
        <label className={cn('flex cursor-pointer items-start gap-4 rounded-lg border-2 p-4 transition-colors focus-within:ring-2 focus-within:ring-primary/30', selected ? 'border-primary bg-primary-soft' : 'border-line hover:border-primary/50')}>
            <input type="radio" name="payment" value={value} checked={selected} onChange={() => onChange(value)} className="mt-1 size-4 accent-primary" />
            <span>
                <span className="flex items-center gap-2 font-medium text-ink">{Icon && <Icon size={16} className="text-primary" aria-hidden="true" />} {title}</span>
                <span className="mt-0.5 block text-small text-muted">{description}</span>
            </span>
        </label>
    );
}

export default function PaymentOptions({ value, onChange, razorpayAvailable, codAvailable, onlineEnabledInSettings, razorpayConfigured }) {
    return (
        <fieldset className="space-y-3">
            <legend className="sr-only">Payment method</legend>
            {razorpayAvailable && <Option value="razorpay" current={value} onChange={onChange} icon={Wallet} title="Pay online" description="UPI · Cards · Net banking via Razorpay" />}
            {codAvailable && <Option value="cod" current={value} onChange={onChange} title="Cash on delivery" description="Pay when your order arrives" />}
            {!razorpayAvailable && !codAvailable && (
                <p className="rounded-lg bg-danger-tint px-4 py-3 text-small text-danger" role="alert">No payment methods are available for the items in your bag. Please contact support.</p>
            )}
            {!razorpayAvailable && codAvailable && !onlineEnabledInSettings && <p className="px-1 text-caption text-muted">Online payment is turned off in store settings.</p>}
            {!razorpayAvailable && codAvailable && onlineEnabledInSettings && !razorpayConfigured && <p className="px-1 text-caption text-muted">Online payment will appear here once Razorpay keys are configured.</p>}
        </fieldset>
    );
}
