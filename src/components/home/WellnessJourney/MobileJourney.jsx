import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, ShoppingBag, Check } from 'lucide-react';
import { formatPrice } from '@/utils/formatPrice';
import { imageUrl } from '@/services/api';
import { useCart } from '@/contexts/CartContext';
import { useToast, showCartToast } from '@/contexts/ToastContext';
import journeyGlow from '@/assets/wellness-journey-glow.png';
import { bestMatchForGoal } from '../wellnessRituals';
import { STAGES } from './journeyStages';

function StageProduct({ product }) {
    const { addToCart } = useCart();
    const { showToast } = useToast();
    const [justAdded, setJustAdded] = useState(false);

    if (!product) return null;

    const handleAdd = () => {
        if (addToCart(product)) {
            showCartToast(showToast, product);
            setJustAdded(true);
            setTimeout(() => setJustAdded(false), 1800);
        } else {
            showToast('You already have the maximum available quantity in your bag', 'error');
        }
    };

    return (
        <div className="flex items-center gap-3 rounded-lg border border-white/15 bg-white/[0.06] p-2.5">
            <Link to={`/product/${product.id}`} className="flex items-center gap-3 flex-1 min-w-0">
                <img
                    src={imageUrl(product.images?.[0])}
                    alt=""
                    className="w-10 h-10 rounded-md object-cover flex-shrink-0 bg-white/10"
                />
                <span className="min-w-0">
                    <span className="block text-sm text-ivory/90 truncate">{product.title}</span>
                    <span className="block text-xs text-gold-light">{formatPrice(product.price)}</span>
                </span>
            </Link>
            <button
                type="button"
                onClick={handleAdd}
                disabled={justAdded}
                className={`flex-shrink-0 inline-flex items-center gap-1 rounded-md px-2.5 py-2 text-xs font-medium transition-colors ${
                    justAdded ? 'bg-emerald text-ivory' : 'bg-gold text-charcoal hover:bg-gold-light'
                }`}
            >
                {justAdded ? <Check size={13} strokeWidth={2} /> : <ShoppingBag size={13} strokeWidth={1.5} />}
            </button>
            <Link to={`/product/${product.id}`} className="flex-shrink-0 text-ivory/40" aria-label={`View ${product.title}`}>
                <ArrowRight size={14} />
            </Link>
        </div>
    );
}

/** Simpler stacked reveal for mobile — no pin/scrub, just fade-in on view.
 *  The rail on the left fills stage-by-stage as a stand-in for the desktop
 *  vitality meter — same "low → full" read, without needing a continuous
 *  scroll-scrub this layout doesn't have. */
export default function MobileJourney({ products }) {
    return (
        <div className="relative overflow-hidden bg-gradient-to-b from-[#0A3D25] via-[#0F5132] to-[#0A3D25] py-16 px-6">
            <img
                src={journeyGlow}
                alt=""
                aria-hidden="true"
                className="absolute inset-0 w-full h-full object-cover opacity-30 mix-blend-screen pointer-events-none"
            />
            <div className="relative max-w-md mx-auto space-y-10">
                <div className="absolute left-[19px] top-3 bottom-3 w-px bg-white/10" aria-hidden="true" />
                <motion.div
                    className="absolute left-[19px] top-3 w-px bg-gradient-to-b from-gold-light to-gold origin-top"
                    style={{ bottom: '3px' }}
                    initial={{ scaleY: 0 }}
                    whileInView={{ scaleY: 1 }}
                    viewport={{ once: true, margin: '-40px', amount: 0.8 }}
                    transition={{ duration: 1.2, ease: 'easeOut' }}
                    aria-hidden="true"
                />
                {STAGES.map((stage, i) => {
                    const Icon = stage.icon;
                    const product = bestMatchForGoal(products, stage.goalId);
                    return (
                        <motion.div
                            key={stage.id}
                            initial={{ opacity: 0, y: 24 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: '-40px' }}
                            transition={{ duration: 0.5, delay: i * 0.03 }}
                            className="relative pl-12"
                        >
                            <span className="absolute left-0 top-0 w-10 h-10 rounded-full bg-white/10 border border-white/15 flex items-center justify-center">
                                <Icon size={16} className="text-gold-light" />
                            </span>
                            <p className="type-eyebrow text-gold-light mb-1">{stage.time}</p>
                            <h3 className="font-serif text-xl text-ivory mb-2">{stage.title}</h3>
                            <p className="text-ivory/60 text-sm font-light leading-relaxed mb-3">{stage.copy}</p>
                            <StageProduct product={product} />
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
}
