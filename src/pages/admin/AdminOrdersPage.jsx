import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ArrowUpDown,
    CheckCircle2,
    ChevronRight,
    Download,
    Package,
    Printer,
    RefreshCw,
    RotateCcw,
    Truck,
    XCircle,
} from 'lucide-react';
import { formatIndianAddress } from '@/utils/formatAddress';
import { Link, useSearchParams } from 'react-router-dom';
import { useAdminAuth, ADMIN_PATH } from '@/contexts/AuthContext';
import { api } from '@/services/api';
import { formatPrice } from '@/utils/formatPrice';
import { sumOrderRevenue } from '@/utils/orderRevenue';
import Button from '@/components/ui/Button';
import Drawer from '@/components/ui/Drawer';
import ExportFormatModal from '@/components/admin/ExportFormatModal';
import {
    AdminPageHeader,
    AdminStatStrip,
    AdminTableShell,
    AdminFilterBar,
    AdminSearchInput,
    AdminSelect,
    AdminDateRange,
    AdminClearButton,
    AdminLoadingState,
    AdminEmptyState,
    AdminErrorBanner,
    adminControlClass,
} from '@/components/admin/AdminUi';
import OrderStatusBadge from '@/components/orders/OrderStatusBadge';
import OrderLineItems from '@/components/orders/OrderLineItems';
import OrderTimeline from '@/components/orders/OrderTimeline';
import {
    ADMIN_STATUS_OPTIONS,
    formatOrderDate,
    getNextStatus,
    getStatusLabel,
    isTerminalStatus,
    normalizeStatus,
    isDirectOrder,
    orderSourceLabel,
    paymentLabel,
    shortOrderId,
} from '@/constants/orders';
import { printOrderStickers } from '@/utils/printOrderStickers';

const STATUS_FILTER_OPTIONS = [
    { value: '', label: 'All statuses' },
    { value: 'placed', label: 'New (placed)' },
    ...ADMIN_STATUS_OPTIONS.map((s) => ({ value: s.value, label: s.adminLabel })),
];

const SOURCE_FILTER_OPTIONS = [
    { value: '', label: 'All sources' },
    { value: 'website', label: 'Website checkout' },
    { value: 'direct', label: 'Direct orders' },
];

const PAYMENT_FILTER_OPTIONS = [
    { value: '', label: 'All payments' },
    { value: 'cod', label: 'Cash on Delivery' },
    { value: 'razorpay', label: 'Online (Razorpay)' },
];

const BULK_ACTIONS = [
    { status: 'confirmed', label: 'Confirmed', icon: CheckCircle2 },
    { status: 'out_for_delivery', label: 'Out for Delivery', icon: Truck },
    { status: 'delivered', label: 'Delivered', icon: CheckCircle2 },
    { status: 'cancelled', label: 'Cancelled', icon: XCircle },
];

function SectionCard({ title, children }) {
    return (
        <section>
            <p className="text-[11px] font-medium tracking-[0.15em] uppercase text-admin-muted mb-2.5">{title}</p>
            <div className="rounded-xl bg-admin-surface-alt border border-admin-border p-4 sm:p-5">
                {children}
            </div>
        </section>
    );
}

function CustomerSummary({ order }) {
    const s = order.shipping || {};
    const addressLine = formatIndianAddress(s);

    return (
        <dl className="grid gap-3.5 text-sm">
            <div className="grid sm:grid-cols-2 gap-3.5">
                <div>
                    <dt className="text-[10px] uppercase tracking-wider text-admin-muted mb-0.5">Name</dt>
                    <dd className="text-ink font-medium">{s.name || '—'}</dd>
                </div>
                <div>
                    <dt className="text-[10px] uppercase tracking-wider text-admin-muted mb-0.5">Phone</dt>
                    <dd className="text-ink">{s.phone || '—'}</dd>
                </div>
            </div>
            <div>
                <dt className="text-[10px] uppercase tracking-wider text-admin-muted mb-0.5">Email</dt>
                <dd className="text-ink break-all">{order.email || '—'}</dd>
            </div>
            <div>
                <dt className="text-[10px] uppercase tracking-wider text-admin-muted mb-0.5">Address</dt>
                <dd className="text-ink leading-relaxed">{addressLine || '—'}</dd>
            </div>
        </dl>
    );
}

function OrderDetailPanel({ order, adminToken, onUpdated }) {
    const [updating, setUpdating] = useState(false);

    const nextStatus = getNextStatus(order.status);

    const updateStatus = async (status, note) => {
        setUpdating(true);
        try {
            await api.put(`/api/orders/${order.id}/status`, { status, note }, adminToken);
            await onUpdated();
        } finally {
            setUpdating(false);
        }
    };

    return (
        <div className="space-y-5">
            <div className="rounded-xl border border-admin-border bg-canvas-alt p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                        <OrderStatusBadge status={order.status} />
                        {isDirectOrder(order) && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-primary-tint text-primary-deep border border-primary/20">
                                {orderSourceLabel(order)}
                            </span>
                        )}
                        {order.refundStatus === 'refunded' && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-warning-tint text-warning border border-warning/30">
                                Refunded
                            </span>
                        )}
                    </div>
                    <div className="text-right">
                        <p className="font-display text-2xl text-ink leading-none">{formatPrice(order.total)}</p>
                        <p className="text-xs text-admin-muted mt-1">{paymentLabel(order)}</p>
                    </div>
                </div>
                <p className="text-[11px] text-admin-muted font-mono mt-3 truncate" title={order.id}>
                    {order.id}
                </p>
            </div>

            {!isTerminalStatus(order.status) && (
                <div className="grid grid-cols-2 gap-2.5">
                    {nextStatus ? (
                        <Button
                            variant="turmeric"
                            size="sm"
                            disabled={updating}
                            onClick={() => updateStatus(nextStatus, `Moved to ${getStatusLabel(nextStatus)}`)}
                            className="w-full normal-case tracking-normal text-xs gap-1.5"
                        >
                            <ChevronRight size={14} />
                            Advance to {getStatusLabel(nextStatus)}
                        </Button>
                    ) : (
                        <div />
                    )}
                    {normalizeStatus(order.status) !== 'cancelled' && (
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={updating}
                            onClick={() => updateStatus('cancelled', 'Cancelled by admin')}
                            className="w-full normal-case tracking-normal text-xs gap-1.5 text-danger border-danger/30 hover:bg-danger-tint hover:text-danger"
                        >
                            <XCircle size={14} />
                            Cancel order
                        </Button>
                    )}
                </div>
            )}

            <SectionCard title="Customer">
                <CustomerSummary order={order} />
            </SectionCard>

            <SectionCard title="Items">
                <OrderLineItems items={order.items} plain />
                <div className="mt-4 pt-4 border-t border-admin-border text-sm space-y-2">
                    <div className="flex justify-between text-admin-muted">
                        <span>Subtotal</span>
                        <span>{formatPrice(order.subtotal)}</span>
                    </div>
                    {(order.discountAmount > 0 || order.couponCode) && (
                        <div className="flex justify-between text-primary">
                            <span>Coupon{order.couponCode ? ` (${order.couponCode})` : ''}</span>
                            <span>−{formatPrice(order.discountAmount || 0)}</span>
                        </div>
                    )}
                    <div className="flex justify-between text-admin-muted">
                        <span>Delivery</span>
                        <span>{order.deliveryFee > 0 ? formatPrice(order.deliveryFee) : 'Free'}</span>
                    </div>
                    <div className="flex justify-between font-semibold text-ink pt-1 border-t border-admin-border-light">
                        <span>Total</span>
                        <span>{formatPrice(order.total)}</span>
                    </div>
                </div>
            </SectionCard>

            <SectionCard title="Status history">
                <OrderTimeline order={order} />
            </SectionCard>

            <section>
                <p className="text-[11px] font-medium tracking-[0.15em] uppercase text-admin-muted mb-2.5">Manual status</p>
                <select
                    value={order.status}
                    disabled={updating}
                    onChange={(e) => updateStatus(e.target.value)}
                    className="w-full text-sm border border-admin-border rounded-lg px-3 py-2.5 bg-admin-surface"
                >
                    {!ADMIN_STATUS_OPTIONS.some((s) => s.value === order.status) && (
                        <option value={order.status}>{getStatusLabel(order.status)} (current)</option>
                    )}
                    {ADMIN_STATUS_OPTIONS.map((s) => (
                        <option key={s.value} value={s.value}>{s.adminLabel}</option>
                    ))}
                </select>
            </section>
        </div>
    );
}

export default function AdminOrdersPage() {
    const { adminToken } = useAdminAuth();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selected, setSelected] = useState(new Set());
    const [detailOrder, setDetailOrder] = useState(null);
    const [bulkLoading, setBulkLoading] = useState(false);
    const [bulkStatus, setBulkStatus] = useState('');
    const [exporting, setExporting] = useState(false);
    const [exportModalOpen, setExportModalOpen] = useState(false);

    const [searchParams] = useSearchParams();
    const [filters, setFilters] = useState({
        search: searchParams.get('search') || '',
        status: searchParams.get('status') || '',
        payment: '',
        source: '',
        from: '',
        to: '',
        sort: 'createdAt',
        order: 'desc',
    });

    const [searchInput, setSearchInput] = useState(searchParams.get('search') || '');

    useEffect(() => {
        const t = setTimeout(() => {
            setFilters((f) => ({ ...f, search: searchInput }));
        }, 300);
        return () => clearTimeout(t);
    }, [searchInput]);

    const buildQuery = useCallback((f) => {
        const params = new URLSearchParams();
        if (f.search) params.set('search', f.search);
        if (f.status) params.set('status', f.status);
        if (f.payment) params.set('payment', f.payment);
        if (f.source) params.set('source', f.source);
        if (f.from) params.set('from', f.from);
        if (f.to) params.set('to', f.to);
        if (f.sort) params.set('sort', f.sort);
        if (f.order) params.set('order', f.order);
        const qs = params.toString();
        return qs ? `?${qs}` : '';
    }, []);

    const fetchOrders = useCallback(async (f = filters, { silent = false } = {}) => {
        if (!adminToken) {
            setLoading(false);
            setError('Admin session missing. Please sign in again.');
            return;
        }

        if (!silent) setLoading(true);
        setError('');
        try {
            const data = await api.get(`/api/orders/admin/all${buildQuery(f)}`, adminToken);
            const list = Array.isArray(data) ? data : [];
            setOrders(list);
            setSelected(new Set());
            setDetailOrder((current) => {
                if (!current) return null;
                return list.find((o) => o.id === current.id) || current;
            });
        } catch (err) {
            setOrders([]);
            const msg = err instanceof Error ? err.message : 'Failed to load orders';
            setError(msg.includes('401') || msg.includes('Unauthorized') || msg.includes('expired')
                ? 'Session expired. Sign out and sign in again to view orders.'
                : msg);
        } finally {
            setLoading(false);
        }
    }, [adminToken, buildQuery, filters]);

    useEffect(() => {
        fetchOrders(filters);
    }, [adminToken, filters.status, filters.payment, filters.source, filters.from, filters.to, filters.sort, filters.order, filters.search]); // eslint-disable-line react-hooks/exhaustive-deps

    const stats = useMemo(() => {
        const counts = { placed: 0, active: 0, delivered: 0, cancelled: 0 };
        orders.forEach((o) => {
            const s = normalizeStatus(o.status);
            if (s === 'placed') counts.placed++;
            else if (s === 'delivered') counts.delivered++;
            else if (s === 'cancelled' || s === 'returned') counts.cancelled++;
            else if (!isTerminalStatus(o.status)) counts.active++;
        });
        return { ...counts, revenue: sumOrderRevenue(orders) };
    }, [orders]);

    const allSelected = orders.length > 0 && selected.size === orders.length;
    const someSelected = selected.size > 0;

    const toggleAll = () => {
        setSelected(allSelected ? new Set() : new Set(orders.map((o) => o.id)));
    };

    const toggleOne = (id) => {
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    // One-click progress for a single order straight from the list (placed → confirmed → out for delivery → delivered).
    const [advancingId, setAdvancingId] = useState('');
    const advanceOrder = async (order) => {
        const next = getNextStatus(order.status);
        if (!adminToken || !next) return;
        setAdvancingId(order.id);
        setError('');
        try {
            await api.put(`/api/orders/${order.id}/status`, { status: next, note: `Moved to ${getStatusLabel(next)}` }, adminToken);
            await fetchOrders(filters, { silent: true });
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not update the order');
        } finally {
            setAdvancingId('');
        }
    };

    const bulkAction = async (status) => {
        if (!adminToken || selected.size === 0 || !status) return;
        setBulkLoading(true);
        try {
            await api.post('/api/orders/admin/bulk-status', {
                ids: [...selected],
                status,
                note: `Bulk ${getStatusLabel(status)}`,
            }, adminToken);
            setBulkStatus('');
            await fetchOrders(filters, { silent: true });
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Bulk update failed');
        } finally {
            setBulkLoading(false);
        }
    };

    const bulkRefund = async () => {
        if (!adminToken || selected.size === 0) return;
        if (!confirm(`Refund ${selected.size} order(s)?`)) return;
        setBulkLoading(true);
        try {
            await api.post('/api/orders/admin/bulk-refund', { ids: [...selected] }, adminToken);
            await fetchOrders(filters, { silent: true });
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Refund failed');
        } finally {
            setBulkLoading(false);
        }
    };

    const printStickers = (orderIds) => {
        const ids = orderIds ?? [...selected];
        const toPrint = orders.filter((order) => ids.includes(order.id));
        if (toPrint.length === 0) return;

        try {
            printOrderStickers(toPrint);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not open print dialog');
        }
    };

    const toggleSort = (field) => {
        setFilters((f) => ({
            ...f,
            sort: field,
            order: f.sort === field && f.order === 'desc' ? 'asc' : 'desc',
        }));
    };

    const clearFilters = () => {
        setSearchInput('');
        setFilters({
            search: '',
            status: '',
            payment: '',
            source: '',
            from: '',
            to: '',
            sort: 'createdAt',
            order: 'desc',
        });
    };

    const hasActiveFilters = filters.status || filters.payment || filters.source || filters.from || filters.to || filters.search;

    const exportOrders = async (format) => {
        if (!adminToken) return;
        setExporting(true);
        setError('');
        try {
            const from = filters.from || 'all';
            const to = filters.to || 'all';
            const ext = format === 'pdf' ? 'pdf' : 'csv';
            const query = buildQuery(filters);
            const formatParam = query ? `${query}&format=${format}` : `?format=${format}`;
            await api.download(
                `/api/orders/admin/export${formatParam}`,
                adminToken,
                `chikit-orders-${from}-to-${to}.${ext}`,
            );
            setExportModalOpen(false);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Export failed');
        } finally {
            setExporting(false);
        }
    };

    return (
        <div>
            <AdminPageHeader
                title="Orders"
                subtitle="Manage fulfillment, shipping, and refunds"
                actions={(
                    <>
                        <Link to={`${ADMIN_PATH}/direct-orders`}>
                            <Button variant="turmeric" size="sm" className="gap-2 normal-case tracking-normal">
                                Direct order
                            </Button>
                        </Link>
                        <Button variant="outline" size="sm" onClick={() => setExportModalOpen(true)} disabled={exporting || loading} className="gap-2">
                            <Download size={14} className={exporting ? 'animate-pulse' : ''} />
                            Export
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => fetchOrders()} disabled={loading} className="gap-2">
                            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                            Refresh
                        </Button>
                    </>
                )}
            />

            <AdminStatStrip
                columns={5}
                stats={[
                    { label: 'Revenue', value: formatPrice(stats.revenue), tone: 'turmeric' },
                    { label: 'New', value: stats.placed, tone: 'blue' },
                    { label: 'In progress', value: stats.active, tone: 'amber' },
                    { label: 'Delivered', value: stats.delivered, tone: 'emerald' },
                    { label: 'Cancelled', value: stats.cancelled, tone: 'red' },
                ]}
            />

            <AdminFilterBar>
                <AdminSearchInput value={searchInput} onChange={setSearchInput} placeholder="Search ID, customer, email, phone…" />
                <AdminSelect value={filters.status} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))} options={STATUS_FILTER_OPTIONS} aria-label="Filter by status" />
                <AdminSelect value={filters.source} onChange={(e) => setFilters((f) => ({ ...f, source: e.target.value }))} options={SOURCE_FILTER_OPTIONS} aria-label="Filter by source" />
                <AdminSelect value={filters.payment} onChange={(e) => setFilters((f) => ({ ...f, payment: e.target.value }))} options={PAYMENT_FILTER_OPTIONS} aria-label="Filter by payment" />
                <AdminDateRange
                    from={filters.from}
                    to={filters.to}
                    onFromChange={(e) => setFilters((f) => ({ ...f, from: e.target.value }))}
                    onToChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))}
                />
                {hasActiveFilters && <AdminClearButton onClick={clearFilters} />}
                {someSelected && (
                    <div className="w-full flex flex-wrap items-center gap-2 pt-2 mt-1 border-t border-admin-border-light">
                        <span className="text-sm text-ink font-medium">{selected.size} selected</span>
                        <select value={bulkStatus} onChange={(e) => setBulkStatus(e.target.value)} disabled={bulkLoading} className={`${adminControlClass} min-w-[10rem] w-auto py-1.5`}>
                            <option value="">Change status…</option>
                            {ADMIN_STATUS_OPTIONS.map((s) => (
                                <option key={s.value} value={s.value}>{s.adminLabel}</option>
                            ))}
                        </select>
                        <button type="button" disabled={bulkLoading || !bulkStatus} onClick={() => bulkAction(bulkStatus)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary text-canvas hover:bg-primary-hover disabled:opacity-50">
                            Apply
                        </button>
                        {BULK_ACTIONS.map(({ status, label, icon: Icon }) => (
                            <button key={status} type="button" disabled={bulkLoading} onClick={() => bulkAction(status)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-admin-surface-alt border border-admin-border-light hover:bg-canvas-alt disabled:opacity-50">
                                <Icon size={12} />
                                {label}
                            </button>
                        ))}
                        <button type="button" disabled={bulkLoading} onClick={bulkRefund} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-warning-tint text-warning border border-warning/30 hover:bg-warning-tint disabled:opacity-50">
                            <RotateCcw size={12} />
                            Refund
                        </button>
                        <button type="button" onClick={() => printStickers()} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-ink text-canvas hover:bg-ink/90">
                            <Printer size={12} />
                            Print {selected.size === 1 ? 'label' : 'labels'}
                        </button>
                    </div>
                )}
            </AdminFilterBar>

            <AdminErrorBanner message={error} />

            <AdminTableShell>
                {loading ? (
                    <AdminLoadingState />
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm min-w-[900px]">
                            <thead>
                                <tr className="border-b border-admin-border text-left bg-admin-surface-alt">
                                    <th className="p-4 w-10">
                                        <input
                                            type="checkbox"
                                            checked={allSelected}
                                            onChange={toggleAll}
                                            aria-label="Select all orders"
                                        />
                                    </th>
                                    <th className="p-4 font-medium text-admin-muted">Order</th>
                                    <th className="p-4 font-medium text-admin-muted">Customer</th>
                                    <th className="p-4 font-medium text-admin-muted">Items</th>
                                    <th className="p-4 font-medium text-admin-muted">
                                        <button type="button" onClick={() => toggleSort('total')} className="inline-flex items-center gap-1 hover:text-ink">
                                            Total <ArrowUpDown size={12} />
                                        </button>
                                    </th>
                                    <th className="p-4 font-medium text-admin-muted">Payment</th>
                                    <th className="p-4 font-medium text-admin-muted">Status</th>
                                    <th className="p-4 font-medium text-admin-muted">
                                        <button type="button" onClick={() => toggleSort('createdAt')} className="inline-flex items-center gap-1 hover:text-ink">
                                            Date <ArrowUpDown size={12} />
                                        </button>
                                    </th>
                                    <th className="p-4 font-medium text-admin-muted w-56" />
                                </tr>
                            </thead>
                            <tbody>
                                {orders.map((order) => {
                                    const itemPreview = order.items?.[0];
                                    const itemCount = order.items?.length || 0;
                                    return (
                                        <tr
                                            key={order.id}
                                            className={`border-b border-admin-border-light hover:bg-admin-surface-alt cursor-pointer ${selected.has(order.id) ? 'bg-primary/5' : ''}`}
                                            onClick={() => setDetailOrder(order)}
                                        >
                                            <td className="p-4" onClick={(e) => e.stopPropagation()}>
                                                <input
                                                    type="checkbox"
                                                    checked={selected.has(order.id)}
                                                    onChange={() => toggleOne(order.id)}
                                                    aria-label={`Select order ${order.id}`}
                                                />
                                            </td>
                                            <td className="p-4">
                                                <p className="font-mono text-xs text-ink">{shortOrderId(order.id)}</p>
                                                {isDirectOrder(order) && (
                                                    <span className="inline-block mt-1 text-[10px] px-1.5 py-0.5 rounded bg-primary-tint text-primary-deep border border-primary/20">
                                                        Direct
                                                    </span>
                                                )}
                                                {order.trackingNumber && (
                                                    <p className="text-[10px] text-admin-muted mt-0.5 truncate max-w-[8rem]">
                                                        {order.trackingNumber}
                                                    </p>
                                                )}
                                            </td>
                                            <td className="p-4">
                                                <p className="font-medium text-ink truncate max-w-[10rem]">{order.shipping?.name || '—'}</p>
                                                <p className="text-xs text-admin-muted truncate max-w-[10rem]">{order.email}</p>
                                            </td>
                                            <td className="p-4">
                                                <p className="text-ink line-clamp-1 max-w-[12rem]">{itemPreview?.title || '—'}</p>
                                                <p className="text-xs text-admin-muted">
                                                    {itemCount} item{itemCount === 1 ? '' : 's'}
                                                </p>
                                            </td>
                                            <td className="p-4 font-medium text-ink whitespace-nowrap">{formatPrice(order.total)}</td>
                                            <td className="p-4 text-xs text-admin-muted whitespace-nowrap">{paymentLabel(order)}</td>
                                            <td className="p-4">
                                                <OrderStatusBadge status={order.status} />
                                            </td>
                                            <td className="p-4 text-xs text-admin-muted whitespace-nowrap">
                                                {formatOrderDate(order.createdAt, { time: false })}
                                            </td>
                                            <td className="p-4">
                                                <div className="flex items-center gap-2">
                                                    {getNextStatus(order.status) && !isTerminalStatus(order.status) && (
                                                        <button
                                                            type="button"
                                                            disabled={advancingId === order.id}
                                                            onClick={(e) => { e.stopPropagation(); advanceOrder(order); }}
                                                            className="whitespace-nowrap rounded-full bg-primary px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-primary-hover disabled:bg-disabled disabled:text-subtle"
                                                            title={`Move to ${getStatusLabel(getNextStatus(order.status))}`}
                                                        >
                                                            {advancingId === order.id ? '…' : getStatusLabel(getNextStatus(order.status))}
                                                        </button>
                                                    )}
                                                    <button
                                                        type="button"
                                                        onClick={(e) => { e.stopPropagation(); printStickers([order.id]); }}
                                                        className="text-ink hover:text-primary p-1 rounded-md hover:bg-canvas-alt"
                                                        title="Print shipping label"
                                                        aria-label={`Print label for order ${shortOrderId(order.id)}`}
                                                    >
                                                        <Printer size={14} />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={(e) => { e.stopPropagation(); setDetailOrder(order); }}
                                                        className="text-primary hover:text-primary-hover text-xs font-medium inline-flex items-center gap-0.5"
                                                    >
                                                        View <ChevronRight size={14} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>

                        {orders.length === 0 && !error && (
                            <AdminEmptyState
                                icon={Package}
                                title="No orders found"
                                description={hasActiveFilters ? 'Try adjusting your filters.' : 'New orders will appear here after checkout.'}
                            />
                        )}
                    </div>
                )}
            </AdminTableShell>

            {!loading && (
                <p className="text-xs text-admin-muted mt-3">{orders.length} order{orders.length === 1 ? '' : 's'} shown</p>
            )}

            <Drawer
                isOpen={!!detailOrder}
                onClose={() => setDetailOrder(null)}
                title={detailOrder ? `Order ${shortOrderId(detailOrder.id)}` : ''}
                subtitle={detailOrder ? `${formatOrderDate(detailOrder.createdAt)} · ${paymentLabel(detailOrder)}` : ''}
                side="right"
                wide
                admin
            >
                {detailOrder && (
                    <OrderDetailPanel
                        order={detailOrder}
                        adminToken={adminToken}
                        onUpdated={() => fetchOrders(filters, { silent: true })}
                    />
                )}
            </Drawer>

            <ExportFormatModal
                isOpen={exportModalOpen}
                onClose={() => setExportModalOpen(false)}
                onSelect={exportOrders}
                exporting={exporting}
                title="Export orders"
            />
        </div>
    );
}
