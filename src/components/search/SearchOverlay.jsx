import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, TrendingUp, ArrowRight, Star } from 'lucide-react';
import { useDebounce } from '@/hooks';
import { useProducts } from '@/hooks/useApi';
import { getBestSellers, getFeaturedProducts } from '@/utils/products';
import { filterProducts } from '@/utils/filterProducts';
import { formatPrice } from '@/utils/formatPrice';
import { imageUrl } from '@/services/api';
import { useCategories } from '@/hooks/useApi';
function ProductRow({ product, onSelect, index, }) {
    return (<motion.li initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05, duration: 0.35 }}>
      <button onClick={() => onSelect(product.id)} className="w-full flex items-center gap-4 p-3 sm:p-4 rounded-xl hover:bg-sand/40 transition-all duration-300 text-left group">
        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-lg overflow-hidden flex-shrink-0 bg-cream">
          <img src={imageUrl(product.images[0])} alt={product.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"/>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-display text-sm sm:text-base text-ink truncate group-hover:text-slate transition-colors">
            {product.title}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px] tracking-[0.15em] uppercase text-slate/70 capitalize">
              {product.category}
            </span>
            {product.reviewCount > 0 && (
              <span className="flex items-center gap-0.5 text-[10px] text-slate">
                <Star size={9} className="text-turmeric fill-turmeric"/>
                {product.rating}
              </span>
            )}
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <span className="font-display text-sm text-ink">{formatPrice(product.price)}</span>
          {product.discount > 0 && (<p className="text-[10px] text-slate/50 line-through">{formatPrice(product.originalPrice)}</p>)}
        </div>
      </button>
    </motion.li>);
}
export default function SearchOverlay({ isOpen, onClose }) {
    const navigate = useNavigate();
    const inputRef = useRef(null);
    const [query, setQuery] = useState('');
    const debouncedQuery = useDebounce(query, 250);
    const { products } = useProducts();
    const { categories } = useCategories();
    const suggestedProducts = useMemo(() => {
        const best = getBestSellers(products);
        const featured = getFeaturedProducts(products);
        const merged = [...best, ...featured.filter((p) => !best.some((b) => b.id === p.id))];
        const pool = merged.length > 0 ? merged : products;
        return pool.slice(0, 4);
    }, [products]);
    const filters = {
        search: debouncedQuery,
        category: 'all',
        minPrice: 0,
        maxPrice: 100000,
        sort: 'popularity',
    };
    const results = debouncedQuery.trim()
        ? filterProducts(products, filters)
        : [];
    const displayProducts = debouncedQuery.trim() ? results : suggestedProducts;
    const isSearching = debouncedQuery.trim().length > 0;
    const handleSelect = (productId) => {
        onClose();
        setQuery('');
        navigate(`/product/${productId}`);
    };
    const handleCategory = (categoryId) => {
        onClose();
        setQuery('');
        navigate(`/shop?category=${categoryId}`);
    };
    const handleViewAll = () => {
        onClose();
        const q = query.trim();
        setQuery('');
        navigate(q ? `/shop?search=${encodeURIComponent(q)}` : '/shop');
    };
    useEffect(() => {
        if (!isOpen) {
            setQuery('');
            return;
        }
        const timer = setTimeout(() => inputRef.current?.focus(), 100);
        return () => clearTimeout(timer);
    }, [isOpen]);
    useEffect(() => {
        const onKey = (e) => {
            if (e.key === 'Escape')
                onClose();
        };
        if (isOpen)
            window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [isOpen, onClose]);
    return (<AnimatePresence>
      {isOpen && (<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} className="fixed inset-0 z-[90] bg-ink/60 flex items-start justify-center pt-20 sm:pt-28 px-4 pb-6" onClick={onClose} role="dialog" aria-modal="true" aria-label="Search products">
          <motion.div initial={{ opacity: 0, y: -24, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -16, scale: 0.98 }} transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }} className="w-full max-w-2xl bg-cream rounded-2xl soft-shadow-lg overflow-hidden border border-border/60" onClick={(e) => e.stopPropagation()}>
            {/* Search input */}
            <div className="flex items-center gap-3 px-4 sm:px-6 py-4 sm:py-5 border-b border-border/50 bg-cream/30">
              <div className="flex items-center flex-1 gap-3 px-4 py-3 rounded-full bg-cream border border-border/70 focus-within:border-turmeric/50 focus-within:ring-2 focus-within:ring-turmeric/10 transition-all duration-300">
                <Search size={18} className="text-slate flex-shrink-0" strokeWidth={1.25}/>
                <input ref={inputRef} type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search necklaces, rings, bracelets..." className="flex-1 bg-transparent text-sm sm:text-base font-light text-ink placeholder:text-slate/45 focus:outline-none min-w-0" aria-label="Search products"/>
                {query && (<button onClick={() => setQuery('')} className="p-1 rounded-full hover:bg-sand/60 text-slate transition-colors" aria-label="Clear search">
                    <X size={14}/>
                  </button>)}
              </div>
              <button onClick={onClose} className="p-2.5 rounded-full hover:bg-sand/50 text-slate transition-colors flex-shrink-0" aria-label="Close search">
                <X size={18} strokeWidth={1.25}/>
              </button>
            </div>

            {/* Category quick filters */}
            <div className="flex gap-2 px-4 sm:px-6 py-3 overflow-x-auto scrollbar-hide border-b border-border/30">
              {categories.map((cat) => (<button key={cat.id} onClick={() => handleCategory(cat.slug)} className="flex-shrink-0 px-4 py-1.5 rounded-full text-[10px] tracking-[0.15em] uppercase border border-border/70 text-slate hover:border-slate hover:text-slate hover:bg-sand/30 transition-all duration-300">
                  {cat.label}
                </button>))}
            </div>

            {/* Results / Suggestions */}
            <div className="max-h-[50vh] sm:max-h-[55vh] overflow-y-auto">
              <div className="flex items-center justify-between px-4 sm:px-6 pt-4 pb-2">
                <div className="flex items-center gap-2">
                  {isSearching ? (<Search size={13} className="text-slate" strokeWidth={1.25}/>) : (<TrendingUp size={13} className="text-slate" strokeWidth={1.25}/>)}
                  <span className="text-[10px] tracking-[0.2em] uppercase text-slate font-medium">
                    {isSearching
                ? `${results.length} Result${results.length !== 1 ? 's' : ''}`
                : 'Popular Picks'}
                  </span>
                </div>
                <button onClick={handleViewAll} className="flex items-center gap-1 text-[10px] tracking-[0.15em] uppercase text-slate hover:text-slate transition-colors">
                  View All
                  <ArrowRight size={12}/>
                </button>
              </div>

              {displayProducts.length > 0 ? (<ul className="px-2 sm:px-3 pb-3">
                  {displayProducts.slice(0, isSearching ? 6 : 4).map((product, i) => (<ProductRow key={product.id} product={product} onSelect={handleSelect} index={i}/>))}
                </ul>) : isSearching ? (<div className="px-6 py-10 text-center">
                  <p className="font-display text-lg text-ink mb-2">No results found</p>
                  <p className="text-sm text-slate font-light mb-6">
                    Try a different keyword or browse our collection
                  </p>
                  <Link to="/shop" onClick={onClose} className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-slate text-cream text-xs tracking-[0.15em] uppercase hover:bg-ink transition-colors">
                    Browse Shop
                    <ArrowRight size={14}/>
                  </Link>
                </div>) : null}
            </div>

            {/* Footer hint */}
            <div className="px-4 sm:px-6 py-3 border-t border-border/30 bg-cream/20 text-center">
              <p className="text-[10px] text-slate/60 tracking-wide">
                Press <kbd className="px-1.5 py-0.5 rounded bg-sand/50 text-slate text-[9px]">ESC</kbd> to close
              </p>
            </div>
          </motion.div>
        </motion.div>)}
    </AnimatePresence>);
}
