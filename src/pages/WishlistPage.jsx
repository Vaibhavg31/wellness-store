import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { Heart, ShoppingBag, ArrowRight, Check } from 'lucide-react';
import { useWishlist } from '@/contexts/WishlistContext';
import { useCart } from '@/contexts/CartContext';
import { useToast, showCartToast } from '@/contexts/ToastContext';
import { formatPrice } from '@/utils/formatPrice';
import { imageUrl } from '@/services/api';
import Button from '@/components/ui/Button';
import ProductSearchBar from '@/components/search/ProductSearchBar';

const itemVariants = {
    hidden: { opacity: 0, y: 12 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] } },
    exit: { opacity: 0, x: -24, scale: 0.98, transition: { duration: 0.28, ease: [0.4, 0, 0.2, 1] } },
};

function WishlistItem({ product, onRemove, onAddToCart, onMoveToCart }) {
    const [removing, setRemoving] = useState(false);
    const [added, setAdded] = useState(false);

    const handleRemove = () => {
        setRemoving(true);
        setTimeout(() => {
            onRemove(product.id);
        }, 280);
    };

    const handleAdd = () => {
        onAddToCart(product);
        setAdded(true);
        setTimeout(() => setAdded(false), 1800);
    };

    return (
        <motion.div
            layout
            variants={itemVariants}
            initial="hidden"
            animate={removing ? 'exit' : 'visible'}
            exit="exit"
            className="flex flex-col sm:flex-row gap-4 sm:gap-6 p-4 sm:p-5 bg-cream rounded-xl border border-border/40 items-start sm:items-center"
        >
            <Link to={`/product/${product.id}`} className="flex-shrink-0 overflow-hidden rounded-lg">
                <motion.img
                    whileHover={{ scale: 1.03 }}
                    transition={{ duration: 0.4 }}
                    src={imageUrl(product.images[0])}
                    alt={product.title}
                    className="w-24 h-28 object-cover"
                />
            </Link>

            <div className="flex-1 min-w-0">
                <Link to={`/product/${product.id}`}>
                    <h3 className="font-display text-lg text-ink hover:text-forest transition-colors line-clamp-2">
                        {product.title}
                    </h3>
                </Link>
                <p className="text-sm text-slate capitalize mt-1">{product.category}</p>
                <p className="font-display text-lg text-ink mt-2">{formatPrice(product.price)}</p>
            </div>

            <div className="flex flex-wrap gap-2 w-full sm:w-auto items-center">
                <Button
                    variant="turmeric"
                    size="sm"
                    onClick={handleAdd}
                    className="gap-1.5 min-w-[110px] transition-all"
                >
                    <AnimatePresence mode="wait">
                        {added ? (
                            <motion.span
                                key="added"
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0 }}
                                className="inline-flex items-center gap-1"
                            >
                                <Check size={14} /> Added
                            </motion.span>
                        ) : (
                            <motion.span
                                key="add"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="inline-flex items-center gap-1"
                            >
                                <ShoppingBag size={14} /> Add to Bag
                            </motion.span>
                        )}
                    </AnimatePresence>
                </Button>

                <Button variant="outline" size="sm" onClick={() => onMoveToCart(product)}>
                    Move to Bag
                </Button>

                <motion.button
                    whileTap={{ scale: 0.88 }}
                    onClick={handleRemove}
                    disabled={removing}
                    className="p-2.5 rounded-full text-slate hover:text-forest hover:bg-forest/5 transition-colors"
                    aria-label="Remove from wishlist"
                >
                    <motion.div
                        animate={removing ? { scale: [1, 1.2, 0], opacity: [1, 0.6, 0] } : { scale: 1, opacity: 1 }}
                        transition={{ duration: 0.28 }}
                    >
                        <Heart size={18} fill="currentColor" className="text-forest" />
                    </motion.div>
                </motion.button>
            </div>
        </motion.div>
    );
}

export default function WishlistPage() {
    const { items, removeFromWishlist } = useWishlist();
    const { addToCart } = useCart();
    const { showToast } = useToast();
    const [search, setSearch] = useState('');

    const filteredItems = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return items;
        return items.filter((p) =>
            p.title?.toLowerCase().includes(q)
            || p.category?.toLowerCase().includes(q)
            || p.description?.toLowerCase().includes(q),
        );
    }, [items, search]);

    const handleAddToCart = (product) => {
        if (addToCart(product)) {
            showCartToast(showToast, product);
        }
    };

    const handleMoveToCart = (product) => {
        if (addToCart(product)) {
            removeFromWishlist(product.id);
            showCartToast(showToast, product, 'Moved to bag');
        }
    };

    const handleRemove = (productId) => {
        removeFromWishlist(productId);
        showToast('Removed from wishlist', 'info');
    };

    const handleAddAllToCart = () => {
        let count = 0;
        items.forEach((p) => {
            if (addToCart(p)) count += 1;
        });
        if (count > 0) {
            showToast(`${count} item${count > 1 ? 's' : ''} added to bag`, 'success');
        }
    };

    if (items.length === 0) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45 }}
                className="pb-20 text-center px-6 min-h-[60vh] flex flex-col items-center justify-center"
            >
                <div className="w-16 h-16 rounded-full bg-forest/5 flex items-center justify-center mb-6">
                    <Heart size={28} className="text-forest/40" strokeWidth={1} />
                </div>
                <h1 className="font-display text-3xl font-light mb-4">Your Wishlist is Empty</h1>
                <p className="text-slate font-light mb-2 max-w-md mx-auto leading-relaxed">
                    Save pieces you love and return anytime. Your wishlist is stored on this device.
                </p>
                <Link to="/shop" className="inline-block mt-8">
                    <Button variant="turmeric" size="lg">Explore Collection</Button>
                </Link>
            </motion.div>
        );
    }

    return (
        <div className="pb-20 px-4 sm:px-6 lg:px-8 min-h-screen bg-cream pt-2 sm:pt-4">
            <div className="max-w-5xl mx-auto">
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
                    <div>
                        <p className="text-[10px] tracking-[0.3em] uppercase text-forest mb-2">Saved for later</p>
                        <h1 className="font-display text-3xl md:text-4xl text-ink">
                            My Wishlist ({items.length})
                        </h1>
                    </div>
                    <Button variant="outline" size="sm" onClick={handleAddAllToCart} className="gap-2 self-start">
                        <ShoppingBag size={16} />
                        Add All to Bag
                    </Button>
                </div>

                <ProductSearchBar
                    value={search}
                    onChange={setSearch}
                    placeholder="Search saved items…"
                    className="mb-6"
                />

                {filteredItems.length === 0 && search.trim() ? (
                    <p className="text-center text-slate py-12 text-sm">No items match your search.</p>
                ) : (
                <LayoutGroup>
                    <motion.div layout className="space-y-4">
                        <AnimatePresence mode="popLayout">
                            {filteredItems.map((product) => (
                                <WishlistItem
                                    key={product.id}
                                    product={product}
                                    onRemove={handleRemove}
                                    onAddToCart={handleAddToCart}
                                    onMoveToCart={handleMoveToCart}
                                />
                            ))}
                        </AnimatePresence>
                    </motion.div>
                </LayoutGroup>
                )}

                <div className="mt-10 text-center">
                    <Link to="/cart" className="inline-flex items-center gap-2 text-sm text-forest font-medium hover:text-forest-light transition-colors">
                        Go to Bag <ArrowRight size={16} />
                    </Link>
                </div>
            </div>
        </div>
    );
}
