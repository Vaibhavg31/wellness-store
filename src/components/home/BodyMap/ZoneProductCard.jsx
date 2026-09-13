import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ShoppingBag, Check } from 'lucide-react';
import { formatPrice } from '@/utils/formatPrice';
import { imageUrl } from '@/services/api';
import { useCart } from '@/contexts/CartContext';
import { useToast, showCartToast } from '@/contexts/ToastContext';

/** The recommended-product card shown under a zone's copy — shared between
 *  the desktop (scroll-scrubbed) and mobile (fade-in) Body Map layouts. */
export default function ZoneProductCard({ product }) {
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
        <div className="flex items-center gap-3 rounded-xl border border-white/15 bg-white/[0.06] backdrop-blur-sm p-3 hover:border-gold/50 transition-colors">
            <Link to={`/product/${product.id}`} className="flex items-center gap-3 flex-1 min-w-0">
                <img
                    src={imageUrl(product.images?.[0])}
                    alt=""
                    className="w-12 h-12 rounded-lg object-cover flex-shrink-0 bg-white/10"
                />
                <span className="text-left min-w-0">
                    <span className="block text-xs text-ivory/50">Fits this zone</span>
                    <span className="block text-sm text-ivory font-medium truncate">{product.title}</span>
                    <span className="block text-sm text-gold-light">{formatPrice(product.price)}</span>
                </span>
            </Link>
            <button
                type="button"
                onClick={handleAdd}
                disabled={justAdded}
                className={`flex-shrink-0 inline-flex items-center gap-1.5 rounded-lg px-3 py-2.5 text-xs font-medium transition-colors disabled:opacity-90 ${
                    justAdded ? 'bg-emerald text-ivory' : 'bg-gold text-charcoal hover:bg-gold-light'
                }`}
            >
                {justAdded ? <Check size={14} strokeWidth={2} /> : <ShoppingBag size={14} strokeWidth={1.5} />}
                {justAdded ? 'Added' : 'Add'}
            </button>
            <Link
                to={`/product/${product.id}`}
                className="flex-shrink-0 text-ivory/40 hover:text-gold-light transition-colors"
                aria-label={`View ${product.title}`}
            >
                <ArrowRight size={15} />
            </Link>
        </div>
    );
}
