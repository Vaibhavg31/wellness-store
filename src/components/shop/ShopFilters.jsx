import { X } from 'lucide-react';
import { formatPrice, cn } from '@/utils/formatPrice';

/** One selectable row: a real radio input (keyboard + screen-reader friendly) drawn as a quiet list item with a count. */
function Option({ name, checked, onChange, label, count }) {
    return (
        <label className={cn('group flex min-h-10 cursor-pointer items-center gap-3 rounded-md px-2 -mx-2 text-small transition-colors hover:bg-canvas-alt', count === 0 && !checked && 'opacity-50')}>
            <input type="radio" name={name} checked={checked} onChange={onChange} className="peer sr-only" />
            <span
                aria-hidden="true"
                className="grid size-[18px] shrink-0 place-items-center rounded-full border border-line-strong bg-surface transition-colors peer-checked:border-primary peer-focus-visible:ring-2 peer-focus-visible:ring-primary/30 peer-focus-visible:ring-offset-2 after:size-2 after:scale-0 after:rounded-full after:bg-primary after:transition-transform peer-checked:after:scale-100"
            />
            <span className="min-w-0 flex-1 text-ink peer-checked:font-semibold peer-checked:text-primary-deep">{label}</span>
            {typeof count === 'number' && <span className="text-caption tabular-nums text-muted">{count}</span>}
        </label>
    );
}

function Group({ title, aside, children }) {
    return (
        <fieldset className="min-w-0 border-0 border-t border-line p-0 pt-5 first:border-t-0 first:pt-0">
            <legend className="float-left mb-2 w-full text-caption font-semibold uppercase tracking-[0.08em] text-muted">
                <span className="flex items-baseline justify-between gap-3">{title}{aside}</span>
            </legend>
            <div className="clear-both">{children}</div>
        </fieldset>
    );
}

/**
 * Filter controls shared by the desktop sidebar and the phone drawer. Counts are "faceted": each group's numbers
 * respect the other active filters, so a row never promises products that would not appear.
 */
export default function ShopFilters({ categories, tags, filters, counts, ceiling, maxPrice, onChange, idPrefix = 'f' }) {
    return (
        <div className="space-y-5">
            <Group title="Category">
                <Option name={`${idPrefix}-category`} checked={filters.category === 'all'} onChange={() => onChange('category', 'all')} label="All products" count={counts.categoryTotal} />
                {categories.map((c) => (
                    <Option key={c.slug} name={`${idPrefix}-category`} checked={filters.category === c.slug} onChange={() => onChange('category', c.slug)} label={c.label} count={counts.category[c.slug] ?? 0} />
                ))}
            </Group>

            {tags.length > 0 && (
                <Group title="Collection">
                    <Option name={`${idPrefix}-tag`} checked={filters.tag === 'all'} onChange={() => onChange('tag', 'all')} label="Everything" />
                    {tags.map((tag) => (
                        <Option key={tag} name={`${idPrefix}-tag`} checked={filters.tag === tag} onChange={() => onChange('tag', tag)} label={tag} count={counts.tag[tag] ?? 0} />
                    ))}
                </Group>
            )}

            <Group title="Price" aside={<span className="text-small font-semibold normal-case tracking-normal text-ink">Up to {formatPrice(maxPrice)}</span>}>
                <input
                    type="range"
                    min={0}
                    max={ceiling}
                    step={50}
                    value={maxPrice}
                    onChange={(e) => onChange('maxPrice', Number(e.target.value))}
                    className="price-range mt-2 w-full"
                    style={{ '--fill': `${ceiling ? (maxPrice / ceiling) * 100 : 100}%` }}
                    aria-label="Maximum price"
                />
                <div className="mt-1 flex justify-between text-caption text-muted"><span>{formatPrice(0)}</span><span>{formatPrice(ceiling)}</span></div>
            </Group>
        </div>
    );
}

/** The filters currently narrowing the list, each removable, plus a single "Clear all". */
export function ActiveFilters({ filters, categories, ceiling, onRemove, onClear }) {
    const items = [];
    if (filters.category !== 'all') items.push({ key: 'category', label: categories.find((c) => c.slug === filters.category)?.label ?? filters.category, reset: 'all' });
    if (filters.tag !== 'all') items.push({ key: 'tag', label: filters.tag, reset: 'all' });
    if (filters.maxPrice !== Infinity && filters.maxPrice < ceiling) items.push({ key: 'maxPrice', label: `Up to ${formatPrice(filters.maxPrice)}`, reset: Infinity });
    if (!items.length) return null;
    return (
        <ul className="flex flex-wrap items-center gap-2" aria-label="Active filters">
            {items.map((item) => (
                <li key={item.key}>
                    <button
                        type="button"
                        onClick={() => onRemove(item.key, item.reset)}
                        className="inline-flex h-8 items-center gap-1.5 rounded-full bg-primary-tint pl-3 pr-2 text-caption font-medium text-primary-deep transition-colors hover:bg-primary-tint/70"
                        aria-label={`Remove filter: ${item.label}`}
                    >
                        {item.label}<X size={14} aria-hidden="true" />
                    </button>
                </li>
            ))}
            <li><button type="button" onClick={onClear} className="inline-flex h-8 items-center px-2 text-caption font-medium text-muted underline underline-offset-4 hover:text-primary">Clear all</button></li>
        </ul>
    );
}
