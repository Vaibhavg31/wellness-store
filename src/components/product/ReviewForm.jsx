import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Camera, ShieldCheck, Star, X } from 'lucide-react';
import Button from '@/components/ui/Button';
import Textarea from '@/components/ui/Textarea';
import { api } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { loginUrl } from '@/utils/authRedirect';
import { cn } from '@/utils/formatPrice';

const MAX_IMAGES = 4;

/** Write-a-review panel. Only signed-in customers who bought the product can post (verified server-side). */
export default function ReviewForm({ product, onSubmitted }) {
    const { pathname } = useLocation();
    const { isAuthenticated, token } = useAuth();
    const [eligibility, setEligibility] = useState({ loading: true, eligible: false, reason: null });
    const [form, setForm] = useState({ rating: 5, comment: '' });
    const [images, setImages] = useState([]); // [{ file, previewUrl }]
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [done, setDone] = useState(false);
    const imagesRef = useRef(images);
    imagesRef.current = images;

    useEffect(() => {
        if (!isAuthenticated) {
            setEligibility({ loading: false, eligible: false, reason: 'signed_out' });
            return undefined;
        }
        let cancelled = false;
        setEligibility((prev) => ({ ...prev, loading: true }));
        api.get(`/api/reviews/eligibility?productId=${encodeURIComponent(product.id)}`, token)
            .then((res) => { if (!cancelled) setEligibility({ loading: false, eligible: !!res.eligible, reason: res.reason || null }); })
            .catch(() => { if (!cancelled) setEligibility({ loading: false, eligible: false, reason: null }); });
        return () => { cancelled = true; };
    }, [product.id, isAuthenticated, token]);

    useEffect(() => () => imagesRef.current.forEach((img) => URL.revokeObjectURL(img.previewUrl)), []);

    const pickImages = (event) => {
        const files = Array.from(event.target.files || []).slice(0, MAX_IMAGES - images.length);
        if (files.length === 0) return;
        setImages((prev) => [...prev, ...files.map((file) => ({ file, previewUrl: URL.createObjectURL(file) }))].slice(0, MAX_IMAGES));
        event.target.value = '';
    };

    const removeImage = (previewUrl) => {
        URL.revokeObjectURL(previewUrl);
        setImages((prev) => prev.filter((p) => p.previewUrl !== previewUrl));
    };

    const submit = async (event) => {
        event.preventDefault();
        setError('');
        setSubmitting(true);
        try {
            const uploaded = images.length > 0 ? await api.uploadReviewImages(images.map((r) => r.file), token) : [];
            await api.post('/api/reviews', { productId: product.id, rating: form.rating, comment: form.comment, images: uploaded }, token);
            setDone(true);
            setForm({ rating: 5, comment: '' });
            setImages([]);
            setEligibility({ loading: false, eligible: false, reason: 'already_reviewed' });
            onSubmitted?.();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to submit review. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    let body;
    if (done) {
        body = <p className="font-medium text-success" role="status">Thank you! Your review has been submitted for approval.</p>;
    } else if (eligibility.loading) {
        body = <div className="skeleton h-24 rounded-lg" aria-hidden="true" />;
    } else if (eligibility.reason === 'already_reviewed') {
        body = <p className="text-muted">You have already reviewed this product — thank you for sharing your experience!</p>;
    } else if (eligibility.reason === 'signed_out') {
        body = (
            <div className="max-w-lg">
                <p className="mb-4 text-muted">Sign in and purchase this product to write a review — reviews here are only from verified buyers.</p>
                <Link to={loginUrl(pathname)}><Button>Sign in</Button></Link>
            </div>
        );
    } else if (eligibility.reason === 'not_purchased') {
        body = <p className="max-w-lg text-muted">Only customers who have purchased this product can write a review. Once your order for {product.title} is placed, you can share your experience here.</p>;
    } else if (eligibility.eligible) {
        body = (
            <form onSubmit={submit} className="max-w-lg space-y-5">
                <p className="inline-flex items-center gap-1.5 rounded-full bg-success-tint px-3 py-1 text-caption font-semibold text-success"><ShieldCheck size={14} aria-hidden="true" /> Verified purchase</p>
                <fieldset>
                    <legend className="mb-2 text-small font-medium text-ink">Rating</legend>
                    <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((r) => (
                            <button key={r} type="button" onClick={() => setForm({ ...form, rating: r })} aria-label={`${r} star${r > 1 ? 's' : ''}`} aria-pressed={form.rating === r} className={cn('rounded p-1', form.rating >= r ? 'text-accent' : 'text-line-strong')}>
                                <Star size={26} fill={form.rating >= r ? 'currentColor' : 'none'} />
                            </button>
                        ))}
                    </div>
                </fieldset>
                <Textarea label="Your review" value={form.comment} onChange={(e) => setForm({ ...form, comment: e.target.value })} rows={4} required minLength={10} placeholder="Share your experience…" />
                <div>
                    <p className="mb-2 text-small font-medium text-ink">Add photos <span className="font-normal text-muted">(optional, up to {MAX_IMAGES})</span></p>
                    <div className="flex flex-wrap gap-2.5">
                        {images.map((img) => (
                            <div key={img.previewUrl} className="relative size-16 overflow-hidden rounded-md border border-line">
                                <img src={img.previewUrl} alt="" className="size-full object-cover" />
                                <button type="button" onClick={() => removeImage(img.previewUrl)} aria-label="Remove photo" className="absolute right-0.5 top-0.5 grid size-5 place-items-center rounded-full bg-ink/80 text-white"><X size={12} /></button>
                            </div>
                        ))}
                        {images.length < MAX_IMAGES && (
                            <label className="flex size-16 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-md border-2 border-dashed border-line-strong text-muted transition-colors focus-within:border-primary hover:border-primary hover:text-primary">
                                <Camera size={18} aria-hidden="true" />
                                <span className="text-caption">Add</span>
                                <input type="file" accept="image/*" multiple className="sr-only" onChange={pickImages} />
                            </label>
                        )}
                    </div>
                </div>
                {error && <p className="text-small text-danger" role="alert">{error}</p>}
                <Button type="submit" loading={submitting}>Submit review</Button>
            </form>
        );
    } else {
        body = <p className="text-muted">Reviews are open to verified buyers only.</p>;
    }

    return (
        <section className="rounded-xl border border-line bg-surface p-6 sm:p-8" aria-labelledby="write-review">
            <h2 id="write-review" className="mb-6 text-h3">Write a review</h2>
            {body}
        </section>
    );
}
