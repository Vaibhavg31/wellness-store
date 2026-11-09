import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Heart, ShoppingBag } from 'lucide-react';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import PopularPicks from '@/components/shop/PopularPicks';
import PageHeader from '@/components/ui/PageHeader';
import SearchField from '@/components/shop/SearchField';
import ProductGrid from '@/components/shop/ProductGrid';
import { useWishlist } from '@/contexts/WishlistContext';
import { useCart } from '@/contexts/CartContext';
import { useToast } from '@/contexts/ToastContext';
import { useProducts } from '@/hooks/useApi';
import { imageUrl } from '@/services/api';

export default function WishlistPage() {
    const { items, removeFromWishlist } = useWishlist();
    const { addToCart } = useCart();
    const { showToast } = useToast();
    const [search, setSearch] = useState('');
    const { products, loading, error } = useProducts();

    // The wishlist keeps a copy of each product from the day it was saved. Shown with today's price and stock from the
    // shop, and a product the shop has removed or hidden is listed apart (it used to look normal, and "Add all to bag"
    // put it in the bag).
    const { live, gone } = useMemo(() => {
        if (loading || error) return { live: items, gone: [] };
        const byId = new Map(products.map((p) => [p.id, p]));
        const out = { live: [], gone: [] };
        for (const saved of items) {
            const fresh = byId.get(saved.id);
            if (fresh) out.live.push(fresh); else out.gone.push(saved);
        }
        return out;
    }, [items, products, loading, error]);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return live;
        return live.filter((p) => `${p.title} ${p.category} ${p.description ?? ''}`.toLowerCase().includes(q));
    }, [live, search]);

    const addAll = () => {
        const added = live.filter((p) => addToCart(p)).length;
        if (added > 0) showToast(`${added} item${added > 1 ? 's' : ''} added to bag`, 'success');
    };

    if (items.length === 0) {
        return (
            <div className="container-page py-16">
                <EmptyState as="h1" icon={Heart} title="Your wishlist is empty" description="Save products you love and return anytime. Your wishlist is stored on this device." actionLabel="Explore the shop" actionHref="/shop" />
                <PopularPicks />
            </div>
        );
    }

    return (
        <>
            <PageHeader eyebrow="Saved for later" title={`My wishlist (${items.length})`} />
            <div className="container-page py-8 lg:py-12">
                <h2 className="sr-only">Saved products</h2>
                <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <SearchField value={search} onChange={setSearch} placeholder="Search saved items…" className="sm:w-80" />
                    <Button variant="outline" onClick={addAll}><ShoppingBag size={16} aria-hidden="true" /> Add all to bag</Button>
                </div>
                <ProductGrid products={filtered} emptyMessage={live.length ? 'No saved items match your search.' : 'None of your saved items are on sale right now.'} />
                {gone.length > 0 && (
                    <section className="mt-12" aria-labelledby="wishlist-gone">
                        <h2 id="wishlist-gone" className="font-sans text-h4">No longer available</h2>
                        <p className="mt-1 text-small text-muted">These products are not on sale any more.</p>
                        <ul className="mt-4 divide-y divide-line rounded-xl border border-line bg-surface">
                            {gone.map((p) => (
                                <li key={p.id} className="flex items-center gap-3 p-3">
                                    <img src={imageUrl(p.images?.[0], 160)} alt="" width="48" height="48" loading="lazy" onError={(e) => { e.currentTarget.hidden = true; }} className="size-12 shrink-0 rounded-md bg-canvas-alt object-contain opacity-60 mix-blend-multiply" />
                                    <span className="min-w-0 flex-1 truncate text-small text-muted">{p.title}</span>
                                    <Button variant="ghost" size="sm" onClick={() => removeFromWishlist(p.id)} aria-label={`Remove ${p.title} from wishlist`}>Remove</Button>
                                </li>
                            ))}
                        </ul>
                    </section>
                )}
                <p className="mt-12 text-center">
                    <Link to="/cart" className="inline-flex items-center gap-2 text-small font-medium text-primary hover:underline">Go to bag <ArrowRight size={16} aria-hidden="true" /></Link>
                </p>
            </div>
        </>
    );
}
