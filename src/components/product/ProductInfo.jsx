import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, ShieldCheck } from 'lucide-react';
import Rating from '@/components/ui/Rating';
import { imageUrl } from '@/services/api';
import { cn } from '@/utils/formatPrice';

function ReviewList({ reviews }) {
    if (reviews.length === 0) return <p className="text-small text-muted">No reviews yet. Be the first to share how it worked for you.</p>;
    return (
        <ul className="max-h-96 space-y-5 overflow-y-auto pr-2">
            {reviews.map((review) => (
                <li key={review.id} className="border-b border-line pb-5 last:border-0">
                    <div className="mb-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                        <p className="text-small font-bold text-ink">{review.name}</p>
                        <Rating value={review.rating} size={13} />
                        {review.isVerifiedPurchase && <span className="inline-flex items-center gap-1 rounded-full bg-success-tint px-2 py-0.5 text-caption font-semibold text-success"><ShieldCheck size={12} aria-hidden="true" /> Verified purchase</span>}
                    </div>
                    <p className="text-small text-muted">{review.comment}</p>
                    {review.images?.length > 0 && (
                        <div className="mt-2 flex gap-2">
                            {review.images.map((src) => (
                                <a key={src} href={imageUrl(src)} target="_blank" rel="noopener noreferrer" className="block size-14 overflow-hidden rounded-xl border border-line">
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

function Nutrition({ nutrition }) {
    const hasDv = nutrition.rows.some((r) => r.dailyValue);
    return (
        <div className="overflow-hidden rounded-2xl border border-line">
            <table className="w-full text-small">
                <caption className="border-b border-line bg-accent-tint px-4 py-2.5 text-left font-bold text-ink">{nutrition.servingSize ? `Per serving (${nutrition.servingSize})` : 'Nutrition information'}</caption>
                <thead className="sr-only"><tr><th scope="col">Nutrient</th><th scope="col">Amount</th>{hasDv && <th scope="col">% Daily value</th>}</tr></thead>
                <tbody>
                    {nutrition.rows.map((row) => (
                        <tr key={row.name} className="border-b border-line last:border-0">
                            <th scope="row" className="px-4 py-2 text-left font-normal text-muted">{row.name}</th>
                            <td className="px-4 py-2 text-right font-semibold text-ink">{row.value}</td>
                            {hasDv && <td className="w-24 px-4 py-2 text-right text-muted">{row.dailyValue}</td>}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function Section({ id, title, count, open, onToggle, children }) {
    const panelId = useId();
    return (
        <div className="border-b border-line" id={id}>
            <h3 className="font-sans">
                <button type="button" onClick={onToggle} aria-expanded={open} aria-controls={panelId} className="flex min-h-14 w-full items-center justify-between gap-3 text-left text-body font-bold text-ink">
                    <span>{title}{count > 0 && <span className="ml-2 rounded-full bg-accent px-2 py-0.5 text-caption font-bold text-primary-deep">{count}</span>}</span>
                    <ChevronDown size={20} className={cn('shrink-0 text-primary transition-transform duration-200', open && 'rotate-180')} aria-hidden="true" />
                </button>
            </h3>
            <div id={panelId} hidden={!open} className="pb-6">{children}</div>
        </div>
    );
}

/**
 * Everything about the product in stacked sections (never horizontal tabs, which hide content on a phone): description, benefits, how to
 * use, nutrition and reviews. Only sections that have content appear. A link ending in #reviews opens the reviews.
 */
export default function ProductInfo({ product, reviews }) {
    const wantsReviews = typeof window !== 'undefined' && window.location.hash === '#reviews';
    const [open, setOpen] = useState(wantsReviews ? 'reviews' : 'description');
    const rootRef = useRef(null);
    useEffect(() => {
        if (!wantsReviews) return undefined;
        const t = setTimeout(() => rootRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 600);
        return () => clearTimeout(t);
    }, [wantsReviews]);

    const sections = useMemo(() => [
        { id: 'description', title: 'About this product', body: <p className="text-small leading-relaxed text-muted">{product.description}</p> },
        product.features?.length > 0 && { id: 'features', title: 'Key benefits', body: (
            <ul className="space-y-3">{product.features.map((f) => <li key={f} className="flex items-start gap-3 text-small text-muted"><span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-success-tint text-success"><Check size={12} strokeWidth={3} aria-hidden="true" /></span>{f}</li>)}</ul>
        ) },
        product.howToUse?.length > 0 && { id: 'how-to-use', title: 'How to use', body: (
            <ol className="space-y-3">{product.howToUse.map((s, i) => <li key={s} className="flex gap-3 text-small text-muted"><span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary text-caption font-bold text-white">{i + 1}</span><span className="pt-0.5">{s}</span></li>)}</ol>
        ) },
        product.nutrition?.rows?.length > 0 && { id: 'nutrition', title: 'Nutrition', body: <Nutrition nutrition={product.nutrition} /> },
        { id: 'reviews', title: 'Reviews', count: reviews.length, body: <ReviewList reviews={reviews} /> },
    ].filter(Boolean), [product, reviews]);

    return (
        <div ref={rootRef} className="scroll-mt-28 border-t border-line">
            {sections.map((s) => <Section key={s.id} id={s.id === 'reviews' ? 'reviews' : undefined} title={s.title} count={s.count} open={open === s.id} onToggle={() => setOpen((o) => (o === s.id ? '' : s.id))}>{s.body}</Section>)}
        </div>
    );
}
