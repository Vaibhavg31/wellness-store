import { useState } from 'react';
import { MapPin, RotateCcw, Truck } from 'lucide-react';
import Button from '@/components/ui/Button';
import { useSiteContent } from '@/contexts/SiteContentContext';
import { isValidPincode, lookupPincode } from '@/utils/pincodeLookup';
import { formatPrice } from '@/utils/formatPrice';

const STORAGE_KEY = 'chikit-pincode';

function readSaved() {
    try {
        return localStorage.getItem(STORAGE_KEY) || '';
    } catch {
        return '';
    }
}

/** Pincode lookup that confirms the delivery area and restates delivery fee / free-delivery and return terms. */
export default function DeliveryCheck({ price }) {
    const { content } = useSiteContent();
    const { fee, freeThreshold, returnDays } = content.delivery;
    const [pincode, setPincode] = useState(readSaved);
    const [state, setState] = useState({ status: 'idle', place: null });

    const submit = async (event) => {
        event.preventDefault();
        if (!isValidPincode(pincode)) {
            setState({ status: 'invalid', place: null });
            return;
        }
        setState({ status: 'loading', place: null });
        const place = await lookupPincode(pincode);
        if (!place) {
            setState({ status: 'notfound', place: null });
            return;
        }
        try {
            localStorage.setItem(STORAGE_KEY, pincode);
        } catch {
            /* storage unavailable — the check still works */
        }
        setState({ status: 'ok', place });
    };

    const freeDelivery = price >= freeThreshold;

    return (
        <section aria-labelledby="delivery-check-title" className="mt-6 rounded-lg border border-line bg-surface p-4">
            <h2 id="delivery-check-title" className="mb-3 flex items-center gap-2 font-sans text-small font-semibold">
                <Truck size={16} className="text-primary" aria-hidden="true" /> Check delivery
            </h2>
            <form onSubmit={submit} className="flex gap-2" noValidate>
                <label htmlFor="pdp-pincode" className="sr-only">Delivery pincode</label>
                <input
                    id="pdp-pincode"
                    inputMode="numeric"
                    autoComplete="postal-code"
                    maxLength={6}
                    value={pincode}
                    onChange={(e) => { setPincode(e.target.value.replace(/\D/g, '')); setState({ status: 'idle', place: null }); }}
                    placeholder="Enter 6-digit pincode"
                    aria-invalid={state.status === 'invalid' || state.status === 'notfound'}
                    className="h-11 min-w-0 flex-1 rounded-full border border-line-strong bg-surface px-4 text-small text-ink placeholder:text-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                <Button type="submit" variant="outline" loading={state.status === 'loading'}>Check</Button>
            </form>

            <div aria-live="polite" className="mt-3 text-small">
                {state.status === 'invalid' && <p className="text-danger">Enter a valid 6-digit pincode.</p>}
                {state.status === 'notfound' && <p className="text-danger">We couldn&apos;t find that pincode. Please check and try again.</p>}
                {state.status === 'ok' && (
                    <p className="flex items-start gap-2 text-success">
                        <MapPin size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
                        <span>Delivering to <strong>{state.place.city}, {state.place.state}</strong>.</span>
                    </p>
                )}
            </div>

            <ul className="mt-3 space-y-1.5 border-t border-line pt-3 text-caption text-muted">
                <li className="flex items-center gap-2">
                    <Truck size={14} className="shrink-0 text-primary" aria-hidden="true" />
                    {freeDelivery ? 'Free delivery on this item.' : `Free delivery above ${formatPrice(freeThreshold)} · otherwise ${formatPrice(fee)}.`}
                </li>
                {returnDays > 0 && (
                    <li className="flex items-center gap-2">
                        <RotateCcw size={14} className="shrink-0 text-primary" aria-hidden="true" />
                        {returnDays}-day easy returns.
                    </li>
                )}
            </ul>
        </section>
    );
}
