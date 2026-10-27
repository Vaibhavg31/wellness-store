import { Link } from 'react-router-dom';
import { Quote } from 'lucide-react';
import Rating from '@/components/ui/Rating';
import Reveal from '@/components/ui/Reveal';
import UserAvatar from '@/components/ui/UserAvatar';
import { useReviews } from '@/hooks/useApi';
import { cn } from '@/utils/formatPrice';

const COLUMNS = { 1: 'lg:grid-cols-1 lg:max-w-xl', 2: 'lg:grid-cols-2 lg:max-w-4xl', 3: 'lg:grid-cols-3 lg:max-w-none' };

/**
 * Social proof led by the number: the average rating and how many reviews stand behind it, then the words.
 * The row swipes on phones and sits as a grid sized to however many reviews exist, so it never has an empty slot.
 */
export default function Testimonials() {
    const { reviews, loading } = useReviews();
    if (loading || reviews.length === 0) return null;

    const average = reviews.reduce((sum, r) => sum + (Number(r.rating) || 0), 0) / reviews.length;
    const shown = reviews.slice(0, 6);
    const columns = COLUMNS[Math.min(shown.length, 3)];

    return (
        <section className="section bg-canvas" aria-labelledby="voices-title">
            <div className="container-page">
                <div className="mb-10 flex flex-col items-center text-center lg:mb-14">
                    <p className="font-display text-[3.5rem] font-semibold leading-none text-primary lg:text-[4.5rem]" aria-label={`Average rating ${average.toFixed(1)} out of 5`}>{average.toFixed(1)}</p>
                    <Rating value={average} size={20} className="mt-3" />
                    <h2 id="voices-title" className="mt-4 text-h3">Loved by people who use it daily</h2>
                    <p className="mt-1 text-small text-muted">From {reviews.length} customer {reviews.length === 1 ? 'review' : 'reviews'}</p>
                </div>

                <ul className={cn('scrollbar-none -mx-4 flex snap-x snap-mandatory scroll-pl-4 gap-4 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:scroll-pl-6 sm:px-6 lg:mx-auto lg:grid lg:gap-6 lg:overflow-visible lg:px-0', columns)}>
                    {shown.map((review, i) => (
                        <Reveal as="li" key={review.id} delay={(i % 3) * 70} className="w-[84%] shrink-0 snap-start sm:w-[55%] lg:w-auto">
                            <figure className="flex h-full flex-col rounded-xl bg-surface p-6 shadow-xs ring-1 ring-line sm:p-8">
                                <Quote size={28} className="mb-4 text-accent" aria-hidden="true" />
                                <blockquote className="flex-1 font-display text-h4 leading-snug text-ink">{review.comment}</blockquote>
                                <figcaption className="mt-6 flex items-center gap-3">
                                    <UserAvatar user={{ name: review.name, avatar: review.avatar }} size="md" signedIn />
                                    <span>
                                        <span className="block text-small font-semibold text-ink">{review.name}</span>
                                        <Rating value={review.rating} size={13} />
                                    </span>
                                </figcaption>
                            </figure>
                        </Reveal>
                    ))}
                </ul>

                <p className="mt-8 text-center">
                    <Link to="/reviews" className="inline-flex min-h-11 items-center text-small font-medium text-primary hover:underline">Read all reviews</Link>
                </p>
            </div>
        </section>
    );
}
