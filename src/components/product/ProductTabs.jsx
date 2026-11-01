import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Check, ShieldCheck } from 'lucide-react';
import Badge from '@/components/ui/Badge';
import Rating from '@/components/ui/Rating';
import { imageUrl } from '@/services/api';
import { cn } from '@/utils/formatPrice';

function ReviewList({ reviews }) {
    if (reviews.length === 0) return <p className="text-muted">No reviews yet. Be the first!</p>;
    return (
        <ul className="max-h-80 space-y-5 overflow-y-auto pr-2">
            {reviews.map((review) => (
                <li key={review.id} className="border-b border-line pb-5 last:border-0">
                    <div className="mb-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                        <p className="text-small font-semibold text-ink">{review.name}</p>
                        <Rating value={review.rating} size={13} />
                        {review.isVerifiedPurchase && <Badge variant="success"><ShieldCheck size={12} className="mr-1" aria-hidden="true" /> Verified purchase</Badge>}
                    </div>
                    <p className="text-small text-muted">{review.comment}</p>
                    {review.images?.length > 0 && (
                        <div className="mt-2 flex gap-2">
                            {review.images.map((src) => (
                                <a key={src} href={imageUrl(src)} target="_blank" rel="noopener noreferrer" className="block size-14 overflow-hidden rounded-md border border-line">
                                    <img src={imageUrl(src)} alt="Customer photo" width="56" height="56" loading="lazy" onError={(e) => { e.currentTarget.parentElement.hidden = true; }} className="size-full object-cover" />
                                </a>
                            ))}
                        </div>
                    )}
                </li>
            ))}
        </ul>
    );
}

function HowToUse({ steps }) {
    return (
        <ol className="space-y-3">
            {steps.map((step, i) => (
                <li key={step} className="flex gap-3 text-small text-muted">
                    <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary-tint text-caption font-semibold text-primary-deep">{i + 1}</span>
                    <span className="pt-0.5">{step}</span>
                </li>
            ))}
        </ol>
    );
}

function Nutrition({ nutrition }) {
    const hasDv = nutrition.rows.some((r) => r.dailyValue);
    return (
        <div className="overflow-hidden rounded-lg border border-line">
            <table className="w-full text-small">
                <caption className="border-b border-line bg-canvas-alt px-4 py-2.5 text-left font-semibold text-ink">
                    {nutrition.servingSize ? `Per serving (${nutrition.servingSize})` : 'Nutrition information'}
                </caption>
                <thead className="sr-only">
                    <tr><th scope="col">Nutrient</th><th scope="col">Amount</th>{hasDv && <th scope="col">% Daily value</th>}</tr>
                </thead>
                <tbody>
                    {nutrition.rows.map((row) => (
                        <tr key={row.name} className="border-b border-line last:border-0">
                            <th scope="row" className="px-4 py-2 text-left font-normal text-muted">{row.name}</th>
                            <td className="px-4 py-2 text-right font-medium text-ink">{row.value}</td>
                            {hasDv && <td className="w-24 px-4 py-2 text-right text-muted">{row.dailyValue}</td>}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export default function ProductTabs({ product, reviews }) {
    // A link ending in #reviews (the after-delivery review email) opens straight on the reviews.
    const [active, setActive] = useState(() => (typeof window !== 'undefined' && window.location.hash === '#reviews' ? 'reviews' : 'description'));
    const rootRef = useRef(null);
    useEffect(() => {
        if (window.location.hash !== '#reviews') return undefined;
        const timer = setTimeout(() => rootRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 600);
        return () => clearTimeout(timer);
    }, []);
    const baseId = useId();

    // Tabs appear only when the product actually has that content.
    const tabs = useMemo(() => [
        { id: 'description', label: 'Description' },
        product.features?.length > 0 && { id: 'features', label: 'Features' },
        product.howToUse?.length > 0 && { id: 'how-to-use', label: 'How to use' },
        product.nutrition?.rows?.length > 0 && { id: 'nutrition', label: 'Nutrition' },
        { id: 'reviews', label: 'Reviews', count: reviews.length },
    ].filter(Boolean), [product, reviews.length]);

    const onKeyDown = (event) => {
        const index = tabs.findIndex((t) => t.id === active);
        const next = event.key === 'ArrowRight' ? index + 1 : event.key === 'ArrowLeft' ? index - 1 : null;
        if (next === null) return;
        event.preventDefault();
        const target = tabs[(next + tabs.length) % tabs.length];
        setActive(target.id);
        document.getElementById(`${baseId}-tab-${target.id}`)?.focus();
    };

    return (
        <div ref={rootRef} id="reviews" className="scroll-mt-28">
            <div role="tablist" aria-label="Product information" onKeyDown={onKeyDown} className="mb-5 flex gap-1 overflow-x-auto border-b border-line scrollbar-none">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        id={`${baseId}-tab-${tab.id}`}
                        role="tab"
                        type="button"
                        aria-selected={active === tab.id}
                        aria-controls={`${baseId}-panel-${tab.id}`}
                        tabIndex={active === tab.id ? 0 : -1}
                        onClick={() => setActive(tab.id)}
                        className={cn('-mb-px whitespace-nowrap border-b-2 px-4 pb-3 text-small font-medium transition-colors', active === tab.id ? 'border-primary text-primary' : 'border-transparent text-muted hover:text-ink')}
                    >
                        {tab.label}
                        {tab.count > 0 && <span className="ml-1.5 rounded-full bg-primary-tint px-1.5 py-0.5 text-caption text-primary-deep">{tab.count}</span>}
                    </button>
                ))}
            </div>

            <div id={`${baseId}-panel-${active}`} role="tabpanel" aria-labelledby={`${baseId}-tab-${active}`} className="animate-fade-in">
                {active === 'description' && <p className="text-muted">{product.description}</p>}
                {active === 'features' && (
                    <ul className="space-y-3">
                        {product.features.map((feature) => (
                            <li key={feature} className="flex items-start gap-3 text-small text-muted">
                                <Check size={16} className="mt-0.5 shrink-0 text-success" aria-hidden="true" /> {feature}
                            </li>
                        ))}
                    </ul>
                )}
                {active === 'how-to-use' && <HowToUse steps={product.howToUse} />}
                {active === 'nutrition' && <Nutrition nutrition={product.nutrition} />}
                {active === 'reviews' && <ReviewList reviews={reviews} />}
            </div>
        </div>
    );
}
