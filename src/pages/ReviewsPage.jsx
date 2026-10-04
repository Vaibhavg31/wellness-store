import { useState } from 'react';
import { motion } from 'framer-motion';
import { Star } from 'lucide-react';
import SectionTitle from '@/components/ui/SectionTitle';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { useReviews, useProducts } from '@/hooks/useApi';
import { api } from '@/services/api';
export default function ReviewsPage() {
    const { reviews, loading, refetch } = useReviews();
    const { products } = useProducts();
    const [filterRating, setFilterRating] = useState(0);
    const [form, setForm] = useState({ productId: '', name: '', email: '', rating: 5, comment: '' });
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const filtered = filterRating
        ? reviews.filter((r) => r.rating === filterRating)
        : reviews;
    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await api.post('/api/reviews', form);
            setSubmitted(true);
            setForm({ productId: '', name: '', email: '', rating: 5, comment: '' });
            refetch();
        }
        catch (err) {
            alert(err instanceof Error ? err.message : 'Failed to submit review');
        }
        finally {
            setSubmitting(false);
        }
    };
    return (<div className="pb-20 px-4 sm:px-6 lg:px-8 pt-2 sm:pt-4">
      <div className="max-w-5xl mx-auto px-6 lg:px-8">
        <SectionTitle subtitle="Customer Voices" title="Reviews" description="Real experiences from our cherished customers"/>

        <div className="flex flex-wrap gap-2 mb-10 justify-center">
          <button onClick={() => setFilterRating(0)} className={`px-4 py-2 rounded-full text-xs uppercase tracking-wider ${!filterRating ? 'bg-primary text-canvas' : 'bg-canvas text-ink border border-line'}`}>
            All
          </button>
          {[5, 4, 3, 2, 1].map((r) => (<button key={r} onClick={() => setFilterRating(r)} className={`px-4 py-2 rounded-full text-xs uppercase tracking-wider ${filterRating === r ? 'bg-primary text-canvas' : 'bg-canvas text-ink border border-line'}`}>
              {r} ★
            </button>))}
        </div>

        {loading ? (<p className="text-center text-muted">Loading reviews...</p>) : (<div className="space-y-6 mb-20">
            {filtered.map((review, i) => (<motion.div key={review.id} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }} className="bg-canvas rounded-2xl p-6 md:p-8 shadow-sm">
                <div className="flex items-start gap-4">
                  {review.avatar && (<img src={review.avatar} alt="" className="w-12 h-12 rounded-full object-cover"/>)}
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-medium text-ink">{review.name}</p>
                      <p className="text-xs text-muted">{new Date(review.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div className="flex gap-0.5 mb-3">
                      {Array.from({ length: 5 }).map((_, j) => (<Star key={j} size={14} className={j < review.rating ? 'text-accent fill-accent' : 'text-line'}/>))}
                    </div>
                    <p className="text-muted leading-relaxed">{review.comment}</p>
                  </div>
                </div>
              </motion.div>))}
            {filtered.length === 0 && <p className="text-center text-muted py-8">No reviews match this filter.</p>}
          </div>)}

        <div className="bg-canvas rounded-2xl p-8 md:p-10 border border-line/40">
          <h2 className="font-display text-2xl text-ink mb-6">Write a Review</h2>
          {submitted ? (<p className="text-primary">Thank you! Your review has been submitted for approval.</p>) : (<form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs tracking-[0.15em] uppercase text-muted mb-2">Product</label>
                <select value={form.productId} onChange={(e) => setForm({ ...form, productId: e.target.value })} required className="w-full px-4 py-3 bg-canvas border border-sand/60 rounded-lg">
                  <option value="">Select a product</option>
                  {products.map((p) => (<option key={p.id} value={p.id}>{p.title}</option>))}
                </select>
              </div>
              <div className="grid sm:grid-cols-2 gap-5">
                <Input label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required/>
                <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required/>
              </div>
              <div>
                <label className="block text-xs tracking-[0.15em] uppercase text-muted mb-2">Rating</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((r) => (<button key={r} type="button" onClick={() => setForm({ ...form, rating: r })} className={`p-2 ${form.rating >= r ? 'text-accent' : 'text-line'}`}>
                      <Star size={20} fill={form.rating >= r ? 'currentColor' : 'none'}/>
                    </button>))}
                </div>
              </div>
              <div>
                <label className="block text-xs tracking-[0.15em] uppercase text-muted mb-2">Your Review</label>
                <textarea value={form.comment} onChange={(e) => setForm({ ...form, comment: e.target.value })} rows={4} required minLength={10} className="w-full px-4 py-3 bg-canvas border border-sand/60 rounded-lg resize-none" placeholder="Share your experience..."/>
              </div>
              <Button variant="turmeric" type="submit" disabled={submitting}>
                {submitting ? 'Submitting...' : 'Submit Review'}
              </Button>
            </form>)}
        </div>
      </div>
    </div>);
}
