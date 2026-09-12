import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Quote, ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import SectionTitle from '@/components/ui/SectionTitle';
import { useReviews } from '@/hooks/useApi';
export default function CustomerReviews() {
    const { reviews, loading } = useReviews();
    const [active, setActive] = useState(0);
    useEffect(() => {
        if (reviews.length === 0)
            return;
        const timer = setInterval(() => {
            setActive((prev) => (prev + 1) % reviews.length);
        }, 6000);
        return () => clearInterval(timer);
    }, [reviews.length]);
    const goTo = (index) => {
        setActive((index + reviews.length) % reviews.length);
    };
    if (loading || reviews.length === 0)
        return null;
    const current = reviews[active];
    return (<section className="py-16 md:py-20 px-6 lg:px-8 bg-cream">
      <div className="max-w-4xl mx-auto">
        <SectionTitle subtitle="Testimonials" title="Loved by Thousands" description="Hear from our cherished customers across India"/>

        <div className="relative">
          <AnimatePresence mode="wait">
            <motion.div key={current.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.3 }} className="luxury-card p-10 md:p-14 text-center ornament-corner">
              <Quote size={36} className="text-gold/30 mx-auto mb-6" strokeWidth={1}/>

              <div className="flex justify-center gap-1 mb-6">
                {Array.from({ length: 5 }).map((_, j) => (<Star key={j} size={16} className={j < current.rating ? 'text-gold fill-gold' : 'text-border'}/>))}
              </div>

              <p className="font-serif text-xl md:text-2xl text-charcoal font-light leading-relaxed mb-10 max-w-2xl mx-auto">
                &ldquo;{current.comment}&rdquo;
              </p>

              <div className="flex items-center justify-center gap-4">
                {current.avatar && (<img src={current.avatar} alt={current.name} className="w-12 h-12 rounded-full object-cover ring-2 ring-gold/30"/>)}
                <div className="text-left">
                  <p className="font-medium text-charcoal">{current.name}</p>
                  <p className="text-xs text-soft-brown tracking-wide">Verified Buyer</p>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          <div className="flex items-center justify-center gap-6 mt-10">
            <button onClick={() => goTo(active - 1)} className="p-3 rounded-full border border-border/60 text-soft-brown hover:text-emerald hover:border-emerald/40 transition-all duration-500" aria-label="Previous review">
              <ChevronLeft size={18} strokeWidth={1.25}/>
            </button>

            <div className="flex gap-2">
              {reviews.map((_, i) => (<button key={i} onClick={() => goTo(i)} className={`h-1.5 rounded-full transition-all duration-500 ${i === active ? 'w-8 bg-gold' : 'w-1.5 bg-border hover:bg-gold/50'}`} aria-label={`Go to review ${i + 1}`}/>))}
            </div>

            <button onClick={() => goTo(active + 1)} className="p-3 rounded-full border border-border/60 text-soft-brown hover:text-emerald hover:border-emerald/40 transition-all duration-500" aria-label="Next review">
              <ChevronRight size={18} strokeWidth={1.25}/>
            </button>
          </div>

          <div className="text-center mt-8">
            <Link to="/reviews" className="text-sm text-emerald hover:text-emerald-dark tracking-wide">
              View all reviews →
            </Link>
          </div>
        </div>
      </div>
    </section>);
}
