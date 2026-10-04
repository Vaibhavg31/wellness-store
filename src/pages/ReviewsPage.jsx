import { useState } from 'react';
import { Link } from 'react-router-dom';
import PageHeader from '@/components/ui/PageHeader';
import Rating from '@/components/ui/Rating';
import Button from '@/components/ui/Button';
import UserAvatar from '@/components/ui/UserAvatar';
import Skeleton from '@/components/ui/Skeleton';
import Chip from '@/components/shop/Chip';
import { useReviews } from '@/hooks/useApi';

export default function ReviewsPage() {
    const { reviews, loading } = useReviews();
    const [rating, setRating] = useState(0);
    const filtered = rating ? reviews.filter((r) => r.rating === rating) : reviews;

    return (
        <>
            <PageHeader eyebrow="Customer voices" title="Reviews" description="Real experiences from verified customers." />
            <div className="container-page py-10 lg:py-14">
                <div className="mx-auto max-w-3xl">
                    <div className="mb-8 flex flex-wrap gap-2" role="group" aria-label="Filter by rating">
                        <Chip active={!rating} onClick={() => setRating(0)}>All</Chip>
                        {[5, 4, 3, 2, 1].map((r) => <Chip key={r} active={rating === r} onClick={() => setRating(r)}>{r} ★</Chip>)}
                    </div>

                    {loading ? (
                        <div className="space-y-4">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-32 rounded-lg" />)}</div>
                    ) : (
                        <ul className="space-y-4">
                            {filtered.map((review) => (
                                <li key={review.id} className="rounded-lg border border-line bg-surface p-6">
                                    <div className="flex items-start gap-4">
                                        <UserAvatar user={{ name: review.name, avatar: review.avatar }} size="lg" signedIn />
                                        <div className="min-w-0 flex-1">
                                            <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                                                <p className="font-semibold text-ink">{review.name}</p>
                                                <time dateTime={review.createdAt} className="text-caption text-muted">{new Date(review.createdAt).toLocaleDateString()}</time>
                                            </div>
                                            <Rating value={review.rating} />
                                            <p className="mt-3 text-muted">{review.comment}</p>
                                        </div>
                                    </div>
                                </li>
                            ))}
                            {filtered.length === 0 && <li className="py-10 text-center text-muted">No reviews match this filter.</li>}
                        </ul>
                    )}

                    <div className="mt-12 rounded-xl bg-primary-tint p-8 text-center">
                        <h2 className="text-h3">Bought something from us?</h2>
                        <p className="mx-auto mt-2 max-w-md text-muted">Open the product you purchased and share your experience — reviews are from verified buyers only.</p>
                        <Link to="/orders" className="mt-5 inline-block"><Button>Go to my orders</Button></Link>
                    </div>
                </div>
            </div>
        </>
    );
}
