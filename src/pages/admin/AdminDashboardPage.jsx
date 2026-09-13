import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Package, Star, MessageSquare, FolderOpen, ShoppingBag, PenLine, Tag, Gift, IndianRupee, AlertTriangle, TrendingUp, Clock } from 'lucide-react';
import { api } from '@/services/api';
import { useAdminAuth, ADMIN_PATH } from '@/contexts/AuthContext';
import { formatPrice } from '@/utils/formatPrice';
import { sumOrderRevenue, orderCountsTowardRevenue } from '@/utils/orderRevenue';
import { AdminPageHeader, AdminPromoCard, AdminQuickLink, AdminStatusPill, AdminEmptyState } from '@/components/admin/AdminUi';
import { getStatusLabel, formatOrderDate, shortOrderId, normalizeStatus } from '@/constants/orders';

const LOW_STOCK_THRESHOLD = 5;

const STATUS_TONE = {
    placed: 'forest',
    confirmed: 'warning',
    out_for_delivery: 'forest',
    delivered: 'success',
    cancelled: 'danger',
    returned: 'danger',
};

export default function AdminDashboardPage() {
    const { adminToken } = useAdminAuth();
    const [stats, setStats] = useState({
        products: 0,
        categories: 0,
        reviews: 0,
        feedback: 0,
        orders: 0,
        coupons: 0,
        bundles: 0,
        unread: 0,
        revenue: 0,
    });
    const [products, setProducts] = useState([]);
    const [orders, setOrders] = useState([]);

    useEffect(() => {
        if (!adminToken) return;

        // allSettled, not all: one endpoint failing (e.g. bundles/coupons on
        // a database that hasn't run every migration yet) used to zero out
        // every single stat on the dashboard instead of just its own tile.
        Promise.allSettled([
            api.get('/api/products/admin/all', adminToken),
            api.get('/api/categories/admin/all', adminToken),
            api.get('/api/reviews/admin/all', adminToken),
            api.get('/api/feedback', adminToken),
            api.get('/api/orders/admin/all', adminToken),
            api.get('/api/coupons/admin/all', adminToken),
            api.get('/api/bundles/admin/all', adminToken),
        ]).then((results) => {
            const value = (r, fallback) => (r.status === 'fulfilled' && r.value !== undefined ? r.value : fallback);
            const [productRes, categoryRes, reviewRes, feedbackRes, orderRes, couponRes, bundleRes] = results;

            const productArr  = value(productRes, []);
            const categoryArr = value(categoryRes, []);
            const reviewArr   = value(reviewRes, []);
            const feedbackArr = value(feedbackRes, []);
            const orderList   = value(orderRes, []);
            const couponArr   = value(couponRes, []);
            const bundleArr   = value(bundleRes, []);

            setProducts(Array.isArray(productArr) ? productArr : []);
            setOrders(Array.isArray(orderList) ? orderList : []);
            setStats({
                products: Array.isArray(productArr) ? productArr.length : 0,
                categories: Array.isArray(categoryArr) ? categoryArr.length : 0,
                reviews: Array.isArray(reviewArr) ? reviewArr.length : 0,
                feedback: Array.isArray(feedbackArr) ? feedbackArr.length : 0,
                orders: Array.isArray(orderList) ? orderList.length : 0,
                coupons: Array.isArray(couponArr) ? couponArr.filter((c) => c.isEnabled).length : 0,
                bundles: Array.isArray(bundleArr) ? bundleArr.filter((b) => b.isPublished).length : 0,
                unread: Array.isArray(feedbackArr) ? feedbackArr.filter((f) => !f.isRead).length : 0,
                revenue: sumOrderRevenue(Array.isArray(orderList) ? orderList : []),
            });

            results.forEach((r) => {
                if (r.status === 'rejected') {
                    // eslint-disable-next-line no-console
                    console.warn('[AdminDashboard] a stats request failed:', r.reason);
                }
            });
        });
    }, [adminToken]);

    const recentOrders = useMemo(() => {
        return [...orders]
            .sort((a, b) => new Date(b.createdAt ?? 0) - new Date(a.createdAt ?? 0))
            .slice(0, 5);
    }, [orders]);

    const lowStockProducts = useMemo(() => {
        return products
            .filter((p) => Number(p.stock ?? 0) <= LOW_STOCK_THRESHOLD)
            .sort((a, b) => Number(a.stock ?? 0) - Number(b.stock ?? 0))
            .slice(0, 6);
    }, [products]);

    const outOfStockCount = useMemo(
        () => products.filter((p) => Number(p.stock ?? 0) <= 0).length,
        [products],
    );

    const bestSellers = useMemo(() => {
        const totals = new Map();
        for (const order of orders) {
            if (!orderCountsTowardRevenue(order)) continue;
            for (const item of order.items ?? []) {
                const key = item.productId || item.title;
                if (!key) continue;
                const existing = totals.get(key) ?? { title: item.title, quantity: 0, revenue: 0 };
                existing.quantity += Number(item.quantity ?? 0);
                existing.revenue += Number(item.quantity ?? 0) * Number(item.price ?? 0);
                totals.set(key, existing);
            }
        }
        return [...totals.values()]
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 5);
    }, [orders]);

    const cards = [
        { label: 'Revenue', value: formatPrice(stats.revenue), icon: IndianRupee, href: `${ADMIN_PATH}/orders`, highlight: true },
        { label: 'Products', value: stats.products, icon: Package, href: `${ADMIN_PATH}/products` },
        { label: 'Categories', value: stats.categories, icon: FolderOpen, href: `${ADMIN_PATH}/categories` },
        { label: 'Orders', value: stats.orders, icon: ShoppingBag, href: `${ADMIN_PATH}/orders` },
        { label: 'Low Stock', value: lowStockProducts.length, sub: outOfStockCount > 0 ? `${outOfStockCount} out of stock` : undefined, icon: AlertTriangle, href: `${ADMIN_PATH}/products` },
        { label: 'Coupons', value: stats.coupons, sub: 'active', icon: Tag, href: `${ADMIN_PATH}/coupons` },
        { label: 'Bundles', value: stats.bundles, sub: 'published', icon: Gift, href: `${ADMIN_PATH}/bundles` },
        { label: 'Reviews', value: stats.reviews, icon: Star, href: `${ADMIN_PATH}/reviews` },
        { label: 'Feedback', value: stats.feedback, sub: stats.unread > 0 ? `${stats.unread} unread` : undefined, icon: MessageSquare, href: `${ADMIN_PATH}/feedback` },
    ];

    return (
        <div>
            <AdminPageHeader
                title="Dashboard"
                subtitle="Overview of your Wellness Store"
            />

            <AdminPromoCard
                to={`${ADMIN_PATH}/content`}
                icon={PenLine}
                title="Content Manager"
                description="Edit headlines, images, FAQs, promos and more — no code needed."
            />

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {cards.map((card) => (
                    <AdminQuickLink
                        key={card.label}
                        to={card.href}
                        icon={card.icon}
                        label={card.label}
                        value={card.value}
                        sub={card.sub}
                        highlight={card.highlight}
                    />
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6">
                <div className="admin-table-shell p-4">
                    <div className="flex items-center gap-2 mb-3">
                        <Clock size={16} className="text-forest" strokeWidth={1.75} />
                        <h3 className="font-semibold text-ink text-sm">Recent Orders</h3>
                    </div>
                    {recentOrders.length === 0 ? (
                        <AdminEmptyState icon={ShoppingBag} title="No orders yet" />
                    ) : (
                        <ul className="divide-y divide-admin-border-light">
                            {recentOrders.map((order) => {
                                const status = normalizeStatus(order.status);
                                return (
                                    <li key={order.id}>
                                        <Link
                                            to={`${ADMIN_PATH}/orders`}
                                            className="flex items-center justify-between gap-3 py-2.5 hover:bg-admin-surface-alt -mx-1 px-1 rounded-lg transition-colors"
                                        >
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium text-ink truncate">
                                                    {order.shipping?.name || order.email || shortOrderId(order.id)}
                                                </p>
                                                <p className="text-xs text-admin-muted mt-0.5">
                                                    {shortOrderId(order.id)} · {formatOrderDate(order.createdAt)}
                                                </p>
                                            </div>
                                            <div className="text-right shrink-0">
                                                <p className="text-sm font-semibold text-ink tabular-nums">{formatPrice(order.total)}</p>
                                                <AdminStatusPill tone={STATUS_TONE[status] ?? 'default'}>
                                                    {getStatusLabel(status)}
                                                </AdminStatusPill>
                                            </div>
                                        </Link>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>

                <div className="admin-table-shell p-4">
                    <div className="flex items-center gap-2 mb-3">
                        <AlertTriangle size={16} className="text-forest" strokeWidth={1.75} />
                        <h3 className="font-semibold text-ink text-sm">Low Stock Alerts</h3>
                    </div>
                    {lowStockProducts.length === 0 ? (
                        <AdminEmptyState icon={Package} title="All products well stocked" />
                    ) : (
                        <ul className="divide-y divide-admin-border-light">
                            {lowStockProducts.map((product) => {
                                const stock = Number(product.stock ?? 0);
                                return (
                                    <li key={product.id}>
                                        <Link
                                            to={`${ADMIN_PATH}/products/${product.id}`}
                                            className="flex items-center justify-between gap-3 py-2.5 hover:bg-admin-surface-alt -mx-1 px-1 rounded-lg transition-colors"
                                        >
                                            <p className="text-sm font-medium text-ink truncate">{product.title}</p>
                                            <AdminStatusPill tone={stock <= 0 ? 'danger' : 'warning'}>
                                                {stock <= 0 ? 'Out of stock' : `${stock} left`}
                                            </AdminStatusPill>
                                        </Link>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>
            </div>

            <div className="admin-table-shell p-4 mt-4">
                <div className="flex items-center gap-2 mb-3">
                    <TrendingUp size={16} className="text-forest" strokeWidth={1.75} />
                    <h3 className="font-semibold text-ink text-sm">Best Selling Products</h3>
                </div>
                {bestSellers.length === 0 ? (
                    <AdminEmptyState icon={TrendingUp} title="No sales data yet" />
                ) : (
                    <ul className="divide-y divide-admin-border-light">
                        {bestSellers.map((item, idx) => (
                            <li key={item.title + idx} className="flex items-center justify-between gap-3 py-2.5">
                                <div className="flex items-center gap-3 min-w-0">
                                    <span className="w-6 h-6 rounded-md bg-forest/8 text-forest text-xs font-semibold flex items-center justify-center shrink-0">
                                        {idx + 1}
                                    </span>
                                    <p className="text-sm font-medium text-ink truncate">{item.title}</p>
                                </div>
                                <div className="text-right shrink-0">
                                    <p className="text-sm font-semibold text-ink tabular-nums">{formatPrice(item.revenue)}</p>
                                    <p className="text-xs text-admin-muted mt-0.5">{item.quantity} sold</p>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}
