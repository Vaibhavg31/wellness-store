import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Heart, ShoppingBag } from 'lucide-react';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import PageHeader from '@/components/ui/PageHeader';
import SearchField from '@/components/shop/SearchField';
import ProductGrid from '@/components/shop/ProductGrid';
import { useWishlist } from '@/contexts/WishlistContext';
import { useCart } from '@/contexts/CartContext';
import { useToast } from '@/contexts/ToastContext';

export default function WishlistPage() {
    const { items } = useWishlist();
    const { addToCart } = useCart();
    const { showToast } = useToast();
    const [search, setSearch] = useState('');

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return items;
        return items.filter((p) => `${p.title} ${p.category} ${p.description ?? ''}`.toLowerCase().includes(q));
    }, [items, search]);

    const addAll = () => {
        const added = items.filter((p) => addToCart(p)).length;
        if (added > 0) showToast(`${added} item${added > 1 ? 's' : ''} added to bag`, 'success');
    };

    if (items.length === 0) {
        return (
            <div className="container-page py-16">
                <EmptyState icon={Heart} title="Your wishlist is empty" description="Save products you love and return anytime. Your wishlist is stored on this device." actionLabel="Explore the shop" actionHref="/shop" />
            </div>
        );
    }

    return (
        <>
            <PageHeader eyebrow="Saved for later" title={`My wishlist (${items.length})`} />
            <div className="container-page py-8 lg:py-12">
                <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <SearchField value={search} onChange={setSearch} placeholder="Search saved items…" className="sm:w-80" />
                    <Button variant="outline" onClick={addAll}><ShoppingBag size={16} aria-hidden="true" /> Add all to bag</Button>
                </div>
                <ProductGrid products={filtered} emptyMessage="No saved items match your search." />
                <p className="mt-12 text-center">
                    <Link to="/cart" className="inline-flex items-center gap-2 text-small font-medium text-primary hover:underline">Go to bag <ArrowRight size={16} aria-hidden="true" /></Link>
                </p>
            </div>
        </>
    );
}
