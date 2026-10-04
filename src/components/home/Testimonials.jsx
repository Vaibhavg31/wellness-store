import { Link } from 'react-router-dom';
import { Quote } from 'lucide-react';
import SectionHeader from '@/components/ui/SectionHeader';
import Rating from '@/components/ui/Rating';
import UserAvatar from '@/components/ui/UserAvatar';
import { useReviews } from '@/hooks/useApi';

export default function Testimonials() {
    const { reviews, loading } = useReviews();
    if (loading || reviews.length === 0) return null;

    return (
        <section className="section bg-canvas">
            <div className="container-page">
                <SectionHeader eyebrow="Customer voices" title="Loved by our community" />
                <ul className="grid gap-5 md:grid-cols-3">
                    {reviews.slice(0, 3).map((review) => (
                        <li key={review.id} className="flex flex-col rounded-lg border border-line bg-surface p-6">
                            <Quote size={24} className="mb-3 text-accent" aria-hidden="true" />
                            <p className="flex-1 text-body text-ink">{review.comment}</p>
                            <div className="mt-5 flex items-center gap-3 border-t border-line pt-4">
                                <UserAvatar user={{ name: review.name, avatar: review.avatar }} size="md" signedIn />
                                <div>
                                    <p className="text-small font-semibold text-ink">{review.name}</p>
                                    <Rating value={review.rating} size={13} />
                                </div>
                            </div>
                        </li>
                    ))}
                </ul>
                <p className="mt-8 text-center">
                    <Link to="/reviews" className="text-small font-medium text-primary hover:underline">Read all reviews</Link>
                </p>
            </div>
        </section>
    );
}
