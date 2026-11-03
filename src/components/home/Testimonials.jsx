import { Link } from 'react-router-dom';
import { Quote } from 'lucide-react';
import Rating from '@/components/ui/Rating';
import UserAvatar from '@/components/ui/UserAvatar';
import { useReviews } from '@/hooks/useApi';

/**
 * Social proof: what customers wrote, with the average rating. A big score is only the headline from eight reviews up; before that the
 * words lead, because a number built on two or three reviews reads as thin proof.
 */
export default function Testimonials() {
    const { reviews, loading } = useReviews();
    if (loading || reviews.length === 0) return null;

    const average = reviews.reduce((sum, r) => sum + (Number(r.rating) || 0), 0) / reviews.length;
    const shown = reviews.slice(0, 6);

    return (
        <section className="bg-accent-tint py-14 lg:py-20" aria-labelledby="voices-title">
            <div className="container-page">
                <div className="mb-9 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <p className="eyebrow">Reviews</p>
                        <h2 id="voices-title" className="mt-2">{reviews.length >= 8 ? 'Loved by people who use it daily' : 'What our customers say'}</h2>
                    </div>
                    <p className="flex items-center gap-3 text-small text-muted">
                        <span className="font-display text-h2 leading-none text-primary" aria-label={`Average rating ${average.toFixed(1)} out of 5`}>{average.toFixed(1)}</span>
                        <span><Rating value={average} size={16} /><span className="block">{reviews.length} {reviews.length === 1 ? 'review' : 'reviews'}</span></span>
                    </p>
                </div>
                <ul className="scrollbar-none -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-pl-4 px-4 pb-2 sm:-mx-6 sm:scroll-pl-6 sm:px-6 lg:mx-0 lg:grid lg:grid-cols-3 lg:gap-6 lg:overflow-visible lg:px-0">
                    {shown.map((review) => (
                        <li key={review.id} className="w-[84%] shrink-0 snap-start sm:w-[55%] lg:w-auto">
                            <figure className="flex h-full flex-col rounded-[1.75rem] bg-surface p-7 shadow-xs ring-1 ring-line">
                                <Quote size={26} className="mb-3 text-gold" aria-hidden="true" />
                                <blockquote className="flex-1 font-display text-[1.125rem] leading-snug text-ink">{review.comment}</blockquote>
                                <figcaption className="mt-6 flex items-center gap-3">
                                    <UserAvatar user={{ name: review.name, avatar: review.avatar }} size="md" signedIn />
                                    <span>
                                        <span className="block text-small font-bold text-ink">{review.name}</span>
                                        <Rating value={review.rating} size={13} />
                                    </span>
                                </figcaption>
                            </figure>
                        </li>
                    ))}
                </ul>
                <p className="mt-8"><Link to="/reviews" className="inline-flex min-h-11 items-center text-small font-bold text-primary hover:underline">Read all reviews</Link></p>
            </div>
        </section>
    );
}
