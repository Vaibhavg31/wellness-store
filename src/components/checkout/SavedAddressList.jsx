import { Plus } from 'lucide-react';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { cn } from '@/utils/formatPrice';

export default function SavedAddressList({ addresses, selectedId, onSelect, onNew, max }) {
    return (
        <div className="mb-6">
            <div className="mb-3 flex items-center justify-between gap-2">
                <p className="text-small font-semibold text-ink">Saved addresses</p>
                <span className="text-caption tabular-nums text-muted">{addresses.length}/{max}</span>
            </div>
            <fieldset className="grid gap-3 sm:grid-cols-2">
                <legend className="sr-only">Choose a saved address</legend>
                {addresses.map((addr) => {
                    const selected = selectedId === addr.id;
                    return (
                        <label key={addr.id} className={cn('relative flex cursor-pointer items-start gap-3 rounded-lg border-2 p-4 transition-colors focus-within:ring-2 focus-within:ring-primary/30', selected ? 'border-primary bg-primary-soft' : 'border-line hover:border-primary/50')}>
                            <input type="radio" name="checkout-saved-address" value={addr.id} checked={selected} onChange={() => onSelect(addr)} className="mt-1 size-4 accent-primary" />
                            <span className="min-w-0 flex-1">
                                <span className="flex flex-wrap items-center gap-2">
                                    <span className="text-small font-medium text-ink">{addr.label || 'Address'}</span>
                                    {addr.isDefault && <Badge variant="tint">Default</Badge>}
                                </span>
                                <span className="mt-1.5 block break-words text-small text-muted">
                                    {addr.address}{addr.landmark ? `, ${addr.landmark}` : ''}
                                    <span className="text-ink"> · {addr.city}, {addr.pincode}</span>
                                </span>
                            </span>
                        </label>
                    );
                })}
            </fieldset>
            <div className="mt-3 space-y-2">
                <Button variant="secondary" size="sm" onClick={onNew}><Plus size={15} aria-hidden="true" /> Enter a new address</Button>
                {addresses.length < max && <p className="text-caption text-muted">New addresses are saved automatically when you place your order.</p>}
            </div>
        </div>
    );
}
