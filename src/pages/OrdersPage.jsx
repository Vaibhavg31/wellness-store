import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Package, RotateCcw } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { api, imageUrl } from '@/services/api';
import { formatPrice } from '@/utils/formatPrice';
import PageHeader from '@/components/ui/PageHeader';
import EmptyState from '@/components/ui/EmptyState';
import Skeleton from '@/components/ui/Skeleton';
import SignInPrompt from '@/components/auth/SignInPrompt';
import Chip from '@/components/shop/Chip';
import OrderStatusBadge from '@/components/orders/OrderStatusBadge';
import OrderJourney from '@/components/orders/OrderJourney';
import { useCart } from '@/contexts/CartContext';
import { useProducts } from '@/hooks/useApi';
import { useToast } from '@/contexts/ToastContext';
import { reorderItems, reorderSummaryMessage } from '@/utils/reorder';
import { formatOrderDate, isTerminalStatus, normalizeStatus, paymentLabel, shortOrderId } from '@/constants/orders';

const FILTERS = [
    { key: 'all', label: 'All' },
    { key: 'active', label: 'In progress' },
    { key: 'delivered', label: 'Delivered' },
    { key: 'cancelled', label: 'Cancelled' },
];

function OrderCard({ order }) {
    const firstItem = order.items?.[0];
    const itemCount = order.items?.length || 0;
    const { addToCart } = useCart();
    const { products } = useProducts();
    const { showToast } = useToast();

    const buyAgain = () => {
        const result = reorderItems(order, products, addToCart);
        showToast(reorderSummaryMessage(result), result.addedCount > 0 ? 'success' : 'error');
    };

    return (
        <li className="relative rounded-lg border border-line bg-surface p-5 transition-shadow hover:shadow-md sm:p-6">
            <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                    <p className="text-caption font-semibold uppercase tracking-wider text-muted">Order</p>
                    <p className="font-mono text-small text-ink">{shortOrderId(order.id)}</p>
                    <p className="mt-1 text-caption text-muted">{formatOrderDate(order.createdAt)}</p>
                </div>
                <OrderStatusBadge status={order.status} audience="user" />
            </div>

            <div className="mb-4 flex gap-3">
                {firstItem?.image && (
                    <div className="relative shrink-0">
                        <img src={imageUrl(firstItem.image)} alt="" width="64" height="80" loading="lazy" className="h-20 w-16 rounded-md bg-canvas-alt object-cover" />
                        {itemCount > 1 && <span className="absolute -bottom-1 -right-1 grid size-5 place-items-center rounded-full bg-primary text-[10px] font-semibold text-white">+{itemCount - 1}</span>}
                    </div>
                )}
                <div className="min-w-0 flex-1">
                    <Link to={`/orders/${order.id}`} className="line-clamp-2 font-medium text-ink after:absolute after:inset-0 hover:text-primary">{firstItem?.title || 'Your order'}</Link>
                    {itemCount > 1 && <p className="mt-1 text-caption text-muted">+ {itemCount - 1} more item{itemCount - 1 === 1 ? '' : 's'}</p>}
                    <p className="mt-2 font-display text-h4">{formatPrice(order.total)}</p>
                </div>
            </div>

            {!isTerminalStatus(order.status) && <div className="mb-4"><OrderJourney order={order} variant="compact" /></div>}

            <div className="flex items-center justify-between gap-3 border-t border-line pt-3">
                <p className="text-caption text-muted">{paymentLabel(order)}</p>
                <div className="flex items-center gap-4">
                    <button type="button" onClick={buyAgain} className="relative z-10 inline-flex items-center gap-1.5 text-small font-medium text-primary hover:underline"><RotateCcw size={14} aria-hidden="true" /> Buy again</button>
                    <span className="inline-flex items-center gap-1 text-small font-medium text-primary">Track <ChevronRight size={16} aria-hidden="true" /></span>
                </div>
            </div>
        </li>
    );
}

export default function OrdersPage() {
    const { token, isAuthenticated } = useAuth();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');

    useEffect(() => {
        if (!isAuthenticated || !token) {
            setLoading(false);
            return;
        }
        api.get('/api/orders', token).then(setOrders).catch(() => setOrders([])).finally(() => setLoading(false));
    }, [isAuthenticated, token]);

    const filtered = useMemo(() => {
        if (filter === 'active') return orders.filter((o) => !isTerminalStatus(o.status));
        if (filter === 'delivered') return orders.filter((o) => normalizeStatus(o.status) === 'delivered');
        if (filter === 'cancelled') return orders.filter((o) => ['cancelled', 'returned'].includes(normalizeStatus(o.status)));
        return orders;
    }, [orders, filter]);

    if (!isAuthenticated) {
        return <SignInPrompt icon={Package} title="Your orders" description="Sign in to track your orders from our warehouse to your doorstep." redirect="/orders" />;
    }

    const activeCount = orders.filter((o) => !isTerminalStatus(o.status)).length;

    return (
        <>
            <PageHeader
                crumbs={[{ label: 'Account', href: '/account' }, { label: 'Orders' }]}
                title="Your orders"
                description={activeCount > 0 ? `${activeCount} order${activeCount === 1 ? '' : 's'} on the way. Follow each journey below.` : 'Every order, all in one place.'}
            />
            <div className="container-page py-8 lg:py-12">
                <div className="mx-auto max-w-3xl">
                    {orders.length > 0 && (
                        <div className="mb-6 flex flex-wrap gap-2" role="group" aria-label="Filter orders">
                            {FILTERS.map((f) => <Chip key={f.key} active={filter === f.key} onClick={() => setFilter(f.key)}>{f.label}</Chip>)}
                        </div>
                    )}

                    {loading ? (
                        <div className="space-y-4"><Skeleton className="h-56 rounded-lg" /><Skeleton className="h-56 rounded-lg" /></div>
                    ) : filtered.length === 0 ? (
                        <EmptyState
                            icon={Package}
                            title={filter === 'all' ? 'No orders yet' : `No ${filter} orders`}
                            description={filter === 'all' ? "When you place an order, you'll see a live journey here." : 'Try a different filter to see other orders.'}
                            actionLabel={filter === 'all' ? 'Discover products' : undefined}
                            actionHref="/shop"
                        />
                    ) : (
                        <ul className="space-y-4">{filtered.map((order) => <OrderCard key={order.id} order={order} />)}</ul>
                    )}
                </div>
            </div>
        </>
    );
}
