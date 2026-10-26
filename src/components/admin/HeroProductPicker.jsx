import { ChevronDown, ChevronUp, X } from 'lucide-react';
import { imageUrl } from '@/services/api';
import { AdminSelect } from '@/components/admin/AdminUi';

const HERO_PRODUCT_LIMIT = 5;

/** Chosen products as small rows (photo, name, move, remove), plus one dropdown to add another. */
export default function HeroProductPicker({ products, value, onChange }) {
    const byId = new Map(products.map((p) => [p.id, p]));
    const chosen = value.map((id) => byId.get(id)).filter(Boolean);
    const available = products.filter((p) => p.isPublished !== false && p.images?.[0] && !value.includes(p.id));
    const ids = chosen.map((p) => p.id);
    const move = (from, to) => {
        const next = [...ids];
        next.splice(to, 0, next.splice(from, 1)[0]);
        onChange(next);
    };

    return (
        <div className="space-y-3">
            {chosen.length === 0 ? (
                <p className="rounded-xl border border-dashed border-admin-border bg-admin-surface-alt px-4 py-3 text-sm text-admin-muted">
                    Automatic: showing your best sellers and new arrivals.
                </p>
            ) : (
                <ol className="space-y-2">
                    {chosen.map((p, i) => (
                        <li key={p.id} className="flex items-center gap-3 rounded-xl border border-admin-border bg-admin-surface p-2">
                            <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary">{i + 1}</span>
                            <img src={imageUrl(p.images?.[0], 96)} alt="" className="size-12 shrink-0 rounded-lg bg-admin-surface-alt object-cover" />
                            <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink">{p.title}</span>
                            <button type="button" onClick={() => move(i, i - 1)} disabled={i === 0} aria-label={`Move ${p.title} up`} className="rounded-lg p-1.5 text-admin-muted hover:bg-admin-surface-alt hover:text-ink disabled:opacity-30"><ChevronUp size={16} /></button>
                            <button type="button" onClick={() => move(i, i + 1)} disabled={i === chosen.length - 1} aria-label={`Move ${p.title} down`} className="rounded-lg p-1.5 text-admin-muted hover:bg-admin-surface-alt hover:text-ink disabled:opacity-30"><ChevronDown size={16} /></button>
                            <button type="button" onClick={() => onChange(ids.filter((id) => id !== p.id))} aria-label={`Remove ${p.title}`} className="rounded-lg p-1.5 text-danger hover:bg-danger/10"><X size={16} /></button>
                        </li>
                    ))}
                </ol>
            )}
            {chosen.length < HERO_PRODUCT_LIMIT && available.length > 0 && (
                <AdminSelect
                    aria-label="Add a product to the hero showcase"
                    value=""
                    onChange={(e) => { if (e.target.value) onChange([...ids, e.target.value]); }}
                    className="w-full"
                    options={[{ value: '', label: 'Add a product…' }, ...available.map((p) => ({ value: p.id, label: p.title }))]}
                />
            )}
            {chosen.length >= HERO_PRODUCT_LIMIT && <p className="text-xs text-admin-muted">The showcase holds up to {HERO_PRODUCT_LIMIT} products. Remove one to add another.</p>}
        </div>
    );
}
