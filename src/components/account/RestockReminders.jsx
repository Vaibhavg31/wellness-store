import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { useSiteContent } from '@/contexts/SiteContentContext';
import { useToast, showCartToast } from '@/contexts/ToastContext';
import { useProducts } from '@/hooks/useApi';
import { imageUrl } from '@/services/api';
import { normalizeStatus } from '@/constants/orders';

const DAY = 24 * 60 * 60 * 1000;

const deliveredAt = (order) => {
    const entry = [...(order.statusHistory || [])].reverse().find((h) => normalizeStatus(h.status) === 'delivered');
    return new Date(entry?.at || order.updatedAt || order.createdAt).getTime();
};

/**
 * "Time to restock": products delivered at least `restockReminderDays` ago that the shopper hasn't ordered since.
 * Wellness products run out; a nudge at roughly the right time is the cheapest repeat order there is.
 */
export default function RestockReminders({ orders }) {
    const { content } = useSiteContent();
    const { addToCart } = useCart();
    const { showToast } = useToast();
    const { products } = useProducts();
    const afterDays = content.extras.restockReminderDays;

    const due = useMemo(() => {
        if (!afterDays) return [];
        const latestByProduct = new Map(); // productId → { item, at } across every order, newest purchase wins
        for (const order of orders) {
            const status = normalizeStatus(order.status);
            if (status === 'cancelled' || status === 'returned') continue;
            const at = status === 'delivered' ? deliveredAt(order) : Date.now();
            for (const item of order.items || []) {
                const known = latestByProduct.get(item.productId);
                if (!known || at > known.at) latestByProduct.set(item.productId, { item, at, delivered: status === 'delivered' });
            }
        }
        return [...latestByProduct.values()]
            .filter(({ at, delivered }) => delivered && Date.now() - at >= afterDays * DAY)
            .map(({ item, at }) => ({ item, product: products.find((p) => p.id === item.productId), days: Math.floor((Date.now() - at) / DAY) }))
            .filter(({ product }) => product && product.stock > 0 && !product.hasVariants)
            .slice(0, 3);
    }, [orders, products, afterDays]);

    if (due.length === 0) return null;

    return (
        <section aria-labelledby="restock-title" className="mb-12">
            <h2 id="restock-title" className="mb-1 text-h3">Time to restock?</h2>
            <p className="mb-5 text-small text-muted">You ordered these a while ago. Running low?</p>
            <ul className="grid gap-3 sm:grid-cols-3">
                {due.map(({ product, days }) => (
                    <li key={product.id} className="flex items-center gap-3 rounded-lg border border-line bg-surface p-3">
                        <Link to={`/product/${product.id}`} className="shrink-0">
                            <img src={imageUrl(product.images[0], 160)} alt="" width="56" height="56" loading="lazy" className="size-14 rounded-md object-cover" />
                        </Link>
                        <div className="min-w-0 flex-1">
                            <Link to={`/product/${product.id}`} className="line-clamp-2 text-small font-medium text-ink hover:text-primary">{product.title}</Link>
                            <p className="text-caption text-muted">Delivered {days} days ago</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => { if (addToCart(product, 1)) showCartToast(showToast, product); }}
                            aria-label={`Reorder ${product.title}`}
                            className="grid size-9 shrink-0 place-items-center rounded-full border border-primary text-primary hover:bg-primary-tint"
                        >
                            <RefreshCw size={16} aria-hidden="true" />
                        </button>
                    </li>
                ))}
            </ul>
        </section>
    );
}
