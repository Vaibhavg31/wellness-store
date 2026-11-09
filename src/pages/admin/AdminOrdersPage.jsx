import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ArrowUpDown,
    CheckCircle2,
    ChevronRight,
    Download,
    FileText,
    Package,
    Printer,
    RefreshCw,
    RotateCcw,
    Truck,
    XCircle,
} from 'lucide-react';
import { formatIndianAddress } from '@/utils/formatAddress';
import { useSearchParams } from 'react-router-dom';
import { useAdminAuth, ADMIN_PATH } from '@/contexts/AuthContext';
import { api } from '@/services/api';
import { formatPrice } from '@/utils/formatPrice';
import Button from '@/components/ui/Button';
import Drawer from '@/components/ui/Drawer';
import ExportFormatModal from '@/components/admin/ExportFormatModal';
import {
    AdminPageHeader,
    AdminTabs,
    AdminMenu,
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
import { useOrderReasons } from '@/components/orders/OrderReasonDialog';
import {
    ADMIN_STATUS_OPTIONS,
    RETURN_STATUS_LABELS,
    formatOrderDate,
    getNextStatus,
    getStatusLabel,
    isTerminalStatus,
    normalizeStatus,
    displayStatus,
    isDirectOrder,
    isAwaitingPayment,
    orderSourceLabel,
    paymentDeadline,
    paymentLabel,
    refundLabel,
    shortOrderId,
} from '@/constants/orders';
import { printOrderStickers } from '@/utils/printOrderStickers';
import { openInvoice } from '@/utils/invoice';
import { useSiteContent } from '@/contexts/SiteContentContext';

/** Returns the shop still has to act on, in the order they need it. */
const OPEN_RETURN = ['requested', 'approved'];

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

/** Online payment details of one order, with "Check with Razorpay" and "Refund through Razorpay" where they apply. */
function OnlinePaymentCard({ order, adminToken, onUpdated }) {
    const [busy, setBusy] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    if (order.payment !== 'razorpay' && !order.razorpayOrderId) return null;

    const awaiting = isAwaitingPayment(order);
    const paid = order.payment === 'razorpay' && order.paymentStatus === 'paid';
    const refund = refundLabel(order);
    const canRefund = paid && ['cancelled', 'returned'].includes(normalizeStatus(order.status)) && (!order.refundStatus || order.refundStatus === 'failed' || (order.refundStatus === 'pending' && !order.razorpayRefundId));

    const act = async (what, fn) => {
        setBusy(what);
        setError('');
        setMessage('');
        try {
            await fn();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Something went wrong');
        } finally {
            setBusy('');
        }
    };
    const check = () => act('check', async () => {
        const res = await api.post(`/api/orders/admin/${order.id}/check-payment`, {}, adminToken);
        setMessage({ paid: 'Razorpay has the payment: the order is now paid and confirmed.', pending: 'Razorpay has no successful payment for this order yet.', refunded: 'The payment arrived after the order was closed, so it was refunded.', unknown: `Razorpay could not be asked right now${res.error ? ` (${res.error})` : ''}.` }[res.state] || '');
        await onUpdated();
    });
    const sendRefund = () => act('refund', async () => {
        if (!window.confirm(`Refund ${formatPrice(order.total)} to the customer through Razorpay?`)) return;
        await api.post(`/api/orders/admin/${order.id}/refund`, { note: 'Refund by the shop' }, adminToken);
        setMessage('Refund sent to Razorpay.');
        await onUpdated();
    });

    const row = (label, value) => value ? (
        <div className="flex justify-between gap-3"><dt className="text-admin-muted">{label}</dt><dd className="min-w-0 break-all text-right text-ink">{value}</dd></div>
    ) : null;

    return (
        <SectionCard title="Online payment">
            {awaiting && (
                <p className="mb-3 rounded-md bg-warning-tint px-2.5 py-1.5 text-xs text-warning">
                    Waiting for the customer to pay, until {formatOrderDate(paymentDeadline(order).toISOString())}. It confirms itself once paid, and is cancelled (stock released) if not.
                </p>
            )}
            <dl className="space-y-1.5 text-sm">
                {row('Status', paymentLabel(order))}
                {row('Paid at', order.paidAt ? formatOrderDate(order.paidAt) : '')}
                {row('Tries', order.paymentAttempts > 1 ? String(order.paymentAttempts) : '')}
                {row('Last failed try', order.paymentError || '')}
                {row('Razorpay order', order.razorpayOrderId || '')}
                {row('Razorpay payment', order.razorpayPaymentId || '')}
                {row('Refund', refund ? `${refund}${order.refundAmount ? ` · ${formatPrice(order.refundAmount)}` : ''}` : '')}
                {row('Refund id', order.razorpayRefundId || '')}
                {row('Refund problem', order.refundError || '')}
            </dl>
            <div className="mt-3 flex flex-wrap gap-2">
                {!paid && <Button size="sm" variant="outline" disabled={Boolean(busy)} onClick={check} className="normal-case tracking-normal text-xs gap-1.5"><RefreshCw size={13} /> {busy === 'check' ? 'Checking…' : 'Check with Razorpay'}</Button>}
                {canRefund && <Button size="sm" disabled={Boolean(busy)} onClick={sendRefund} className="normal-case tracking-normal text-xs gap-1.5"><RotateCcw size={13} /> {busy === 'refund' ? 'Refunding…' : `Refund ${formatPrice(order.total)} through Razorpay`}</Button>}
            </div>
            {message && <p className="mt-2 text-xs text-admin-muted" role="status">{message}</p>}
            {error && <p className="mt-2 rounded-md bg-danger-tint px-2.5 py-1.5 text-xs text-danger" role="alert">{error}</p>}
        </SectionCard>
    );
}

function OrderDetailPanel({ order, adminToken, onUpdated }) {
    const [updating, setUpdating] = useState(false);
    const [cancelOpen, setCancelOpen] = useState(false);
    const [cancelReason, setCancelReason] = useState('');
    const [cancelNote, setCancelNote] = useState('');
    const [returnNote, setReturnNote] = useState('');
    const [actionError, setActionError] = useState('');
    const reasons = useOrderReasons();

    const nextStatus = getNextStatus(order.status);

    const updateStatus = async (status, note, reason) => {
        setUpdating(true);
        setActionError('');
        try {
            await api.put(`/api/orders/${order.id}/status`, { status, note, reason }, adminToken);
            await onUpdated();
        } catch (err) {
            setActionError(err instanceof Error ? err.message : 'Could not update the order');
        } finally {
            setUpdating(false);
        }
    };

    const confirmCancel = async () => {
        if (!cancelReason) { setActionError('Choose why the order is being cancelled.'); return; }
        if (cancelReason === 'other' && cancelNote.trim().length < 3) { setActionError('Add a short note for "Other".'); return; }
        await updateStatus('cancelled', cancelNote.trim() || 'Cancelled by admin', cancelReason);
        setCancelOpen(false);
        setCancelReason('');
        setCancelNote('');
    };

    const answerReturn = async (action) => {
        setUpdating(true);
        setActionError('');
        try {
            await api.put(`/api/orders/${order.id}/return`, { action, note: returnNote.trim() }, adminToken);
            setReturnNote('');
            await onUpdated();
        } catch (err) {
            setActionError(err instanceof Error ? err.message : 'Could not update the return');
        } finally {
            setUpdating(false);
        }
    };

    return (
        <div className="space-y-5">
            <div className="rounded-xl border border-admin-border bg-canvas-alt p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                        <OrderStatusBadge status={displayStatus(order)} />
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
                    {nextStatus && !isAwaitingPayment(order) ? (
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
                            onClick={() => setCancelOpen((v) => !v)}
                            className="w-full normal-case tracking-normal text-xs gap-1.5 text-danger border-danger/30 hover:bg-danger-tint hover:text-danger"
                        >
                            <XCircle size={14} />
                            Cancel order
                        </Button>
                    )}
                </div>
            )}

            {cancelOpen && !isTerminalStatus(order.status) && (
                <div className="rounded-xl border border-danger/30 bg-danger-tint/40 p-4 space-y-3">
                    <p className="text-sm font-medium text-ink">Why is this order being cancelled?</p>
                    <select value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} className="w-full text-sm border border-admin-border rounded-lg px-3 py-2.5 bg-admin-surface" aria-label="Cancellation reason">
                        <option value="">Choose a reason…</option>
                        {(reasons?.cancel ?? []).map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
                    </select>
                    <textarea value={cancelNote} onChange={(e) => setCancelNote(e.target.value)} rows={2} maxLength={500} placeholder="Note (required for Other)" className="w-full text-sm border border-admin-border rounded-lg px-3 py-2 bg-admin-surface" />
                    <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => setCancelOpen(false)} disabled={updating}>Keep order</Button>
                        <Button size="sm" onClick={confirmCancel} disabled={updating} className="normal-case tracking-normal">{updating ? 'Cancelling…' : 'Confirm cancel'}</Button>
                    </div>
                </div>
            )}

            {actionError && <p role="alert" className="rounded-lg bg-danger-tint px-3 py-2 text-sm text-danger">{actionError}</p>}

            {normalizeStatus(order.status) === 'cancelled' && (order.cancelReason || order.cancelledBy) && (
                <SectionCard title="Why it was cancelled">
                    <p className="text-sm text-ink"><strong>{order.cancelReason || 'No reason recorded'}</strong></p>
                    {order.cancelNote && <p className="text-sm text-admin-muted mt-1">“{order.cancelNote}”</p>}
                    <p className="text-xs text-admin-muted mt-2">Cancelled by {order.cancelledBy === 'customer' ? 'the customer' : 'admin'}{order.cancelledAt ? ` · ${formatOrderDate(order.cancelledAt)}` : ''}</p>
                    {order.payment === 'razorpay' && order.paymentStatus === 'paid' && order.refundStatus !== 'refunded' && (
                        <p className="mt-2 rounded-md bg-warning-tint px-2.5 py-1.5 text-xs text-warning">Paid online: {refundLabel(order) ? `${refundLabel(order).toLowerCase()}.` : 'not refunded yet. Use the refund button under Online payment.'}</p>
                    )}
                </SectionCard>
            )}

            <OnlinePaymentCard order={order} adminToken={adminToken} onUpdated={onUpdated} />

            {order.returnStatus && (
                <SectionCard title={`Return · ${RETURN_STATUS_LABELS[order.returnStatus] ?? order.returnStatus}`}>
                    <p className="text-sm text-ink"><strong>{order.returnReason}</strong></p>
                    {order.returnNote && <p className="text-sm text-admin-muted mt-1">“{order.returnNote}”</p>}
                    <p className="text-xs text-admin-muted mt-2">Asked {order.returnRequestedAt ? formatOrderDate(order.returnRequestedAt) : ''}</p>
                    {['requested', 'approved'].includes(order.returnStatus) && (
                        <div className="mt-3 space-y-2">
                            <textarea value={returnNote} onChange={(e) => setReturnNote(e.target.value)} rows={2} maxLength={500} placeholder={order.returnStatus === 'requested' ? 'Message to the customer (needed to decline)' : 'Note (optional)'} className="w-full text-sm border border-admin-border rounded-lg px-3 py-2 bg-admin-surface" />
                            <div className="flex flex-wrap gap-2">
                                {order.returnStatus === 'requested' && <Button size="sm" disabled={updating} onClick={() => answerReturn('approve')} className="normal-case tracking-normal">Approve return</Button>}
                                {order.returnStatus === 'requested' && <Button size="sm" variant="outline" disabled={updating} onClick={() => answerReturn('reject')} className="normal-case tracking-normal text-danger border-danger/30">Decline</Button>}
                                {order.returnStatus === 'approved' && <Button size="sm" disabled={updating} onClick={() => answerReturn('received')} className="normal-case tracking-normal">Parcel received: mark returned</Button>}
                            </div>
                        </div>
                    )}
                </SectionCard>
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
                    onChange={(e) => (e.target.value === 'cancelled' ? setCancelOpen(true) : updateStatus(e.target.value))}
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
    const { content } = useSiteContent();
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
    // Dashboard links arrive as ?status=placed (new) or ?status=confirmed etc. (in progress).
    const [view, setView] = useState(() => {
        const wanted = searchParams.get('status');
        if (!wanted) return 'all';
        if (wanted === 'placed') return 'new';
        if (wanted === 'delivered') return 'delivered';
        if (wanted === 'cancelled' || wanted === 'returned') return 'cancelled';
        return 'active';
    });
    const [filters, setFilters] = useState({
        search: searchParams.get('search') || '',
        status: '',
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

    const groupOf = (order) => {
        const st = normalizeStatus(order.status);
        if (st === 'placed') return 'new';
        if (st === 'delivered') return 'delivered';
        if (st === 'cancelled' || st === 'returned') return 'cancelled';
        return 'active';
    };

    const stats = useMemo(() => {
        // The Returns badge counts the same orders the Returns list shows (like every other tab); the ones still
        // waiting for the shop are listed first and counted separately.
        const counts = { placed: 0, active: 0, delivered: 0, cancelled: 0, returns: 0, openReturns: 0 };
        orders.forEach((o) => {
            if (o.returnStatus) counts.returns++;
            if (OPEN_RETURN.includes(o.returnStatus)) counts.openReturns++;
            const s = normalizeStatus(o.status);
            if (s === 'placed') counts.placed++;
            else if (s === 'delivered') counts.delivered++;
            else if (s === 'cancelled' || s === 'returned') counts.cancelled++;
            else if (!isTerminalStatus(o.status)) counts.active++;
        });
        return counts;
    }, [orders]);

    const visibleOrders = useMemo(() => {
        if (view === 'all') return orders;
        if (view === 'returns') {
            const rank = (o) => (OPEN_RETURN.includes(o.returnStatus) ? OPEN_RETURN.indexOf(o.returnStatus) : OPEN_RETURN.length);
            return orders.filter((o) => o.returnStatus).sort((a, b) => rank(a) - rank(b));
        }
        return orders.filter((o) => groupOf(o) === view);
    }, [orders, view]);

    // Why customers cancel or return: the count of each reason among the orders shown, biggest first, so the pattern is easy to see.
    const reasonCounts = useMemo(() => {
        if (view !== 'cancelled' && view !== 'returns') return [];
        const tally = new Map();
        visibleOrders.forEach((o) => {
            const why = view === 'returns' ? o.returnReason : o.cancelReason;
            if (why) tally.set(why, (tally.get(why) || 0) + 1);
        });
        return [...tally.entries()].sort((a, b) => b[1] - a[1]);
    }, [visibleOrders, view]);

    const allSelected = visibleOrders.length > 0 && selected.size === visibleOrders.length;
    const someSelected = selected.size > 0;

    const toggleAll = () => {
        setSelected(allSelected ? new Set() : new Set(visibleOrders.map((o) => o.id)));
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
            const res = await api.post('/api/orders/admin/bulk-status', {
                ids: [...selected],
                status,
                note: `Bulk ${getStatusLabel(status)}`,
            }, adminToken);
            setBulkStatus('');
            await fetchOrders(filters, { silent: true });
            if (res?.skipped?.length) setError(`${res.skipped.length} order(s) were left as they were: ${res.skipped.slice(0, 3).map((s) => `${shortOrderId(s.id)} (${s.error})`).join('; ')}${res.skipped.length > 3 ? '…' : ''}`);
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
            const res = await api.post('/api/orders/admin/bulk-refund', { ids: [...selected] }, adminToken);
            await fetchOrders(filters, { silent: true });
            if (res?.failed?.length) setError(`${res.failed.length} order(s) could not be refunded: ${res.failed.slice(0, 3).map((f) => `${shortOrderId(f.id)} (${f.error})`).join('; ')}${res.failed.length > 3 ? '…' : ''}`);
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
        setView('all');
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

    const hasActiveFilters = view !== 'all' || filters.payment || filters.from || filters.to || filters.search;

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
                subtitle="Confirm, pack and ship customer orders"
                actions={(
                    <>
                        <Button to={`${ADMIN_PATH}/direct-orders`} variant="turmeric" size="sm" className="gap-2 normal-case tracking-normal">
                            Direct order
                        </Button>
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

            <AdminTabs
                label="Show orders"
                value={view}
                onChange={setView}
                tabs={[
                    { value: 'all', label: 'All', count: orders.length },
                    { value: 'new', label: 'New', count: stats.placed },
                    { value: 'active', label: 'In progress', count: stats.active },
                    { value: 'delivered', label: 'Delivered', count: stats.delivered },
                    { value: 'cancelled', label: 'Cancelled', count: stats.cancelled },
                    { value: 'returns', label: 'Returns', count: stats.returns },
                ]}
            />

            {view === 'returns' && stats.returns > 0 && (
                <p className="text-sm text-admin-muted">
                    {stats.openReturns > 0 ? <><strong className="text-warning">{stats.openReturns} waiting for your answer</strong> (shown first) · </> : 'Nothing waiting for you · '}
                    {stats.returns} {stats.returns === 1 ? 'return' : 'returns'} in total
                </p>
            )}

            {reasonCounts.length > 0 && (
                <div className="rounded-xl border border-admin-border bg-admin-surface p-4">
                    <p className="text-[11px] font-medium tracking-[0.15em] uppercase text-admin-muted mb-2.5">{view === 'returns' ? 'Why customers return' : 'Why customers cancel'}</p>
                    <ul className="flex flex-wrap gap-2">
                        {reasonCounts.map(([why, n]) => <li key={why} className="rounded-full bg-canvas-alt px-3 py-1 text-xs text-ink">{why} <strong className="ml-1 text-primary">{n}</strong></li>)}
                    </ul>
                </div>
            )}

            <AdminFilterBar>
                <AdminSearchInput value={searchInput} onChange={setSearchInput} placeholder="Search order, customer, email or phone…" />
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
                    <>
                    {/* Phones and tablets: one card per order (the 9-column table needed sideways scrolling there). */}
                    {visibleOrders.length > 0 && (
                        <label className="flex min-h-11 items-center gap-3 border-b border-admin-border bg-admin-surface-alt px-4 text-xs font-medium text-admin-muted lg:hidden">
                            <input type="checkbox" className="size-5" checked={allSelected} onChange={toggleAll} />
                            Select all {visibleOrders.length}
                        </label>
                    )}
                    {visibleOrders.length > 0 && (
                        <ul className="divide-y divide-admin-border-light lg:hidden" aria-label="Orders">
                            {visibleOrders.map((order) => {
                                const first = order.items?.[0];
                                const more = (order.items?.length || 0) - 1;
                                const next = getNextStatus(order.status) && !isTerminalStatus(order.status) && !isAwaitingPayment(order) ? getNextStatus(order.status) : null;
                                return (
                                    <li key={order.id} data-row className={`relative p-4 ${selected.has(order.id) ? 'bg-primary/5' : ''}`}>
                                        <div className="flex items-start gap-3">
                                            <input
                                                type="checkbox"
                                                className="mt-1 size-5 shrink-0"
                                                checked={selected.has(order.id)}
                                                onChange={() => toggleOne(order.id)}
                                                aria-label={`Select order ${order.id}`}
                                            />
                                            <button type="button" onClick={() => setDetailOrder(order)} className="min-w-0 flex-1 text-left" aria-label={`Open order ${shortOrderId(order.id)} from ${order.shipping?.name || 'a customer'}`}>
                                                <span className="flex flex-wrap items-center gap-2">
                                                    <span className="font-mono text-xs text-ink">{shortOrderId(order.id)}</span>
                                                    {isDirectOrder(order) && <span className="rounded border border-primary/20 bg-primary-tint px-1.5 py-0.5 text-[10px] text-primary-deep">Direct</span>}
                                                    <span className="text-xs text-admin-muted">{formatOrderDate(order.createdAt, { time: false })}</span>
                                                </span>
                                                <span className="mt-1 block truncate font-medium text-ink">{order.shipping?.name || '—'}</span>
                                                <span className="block truncate text-xs text-admin-muted">{first?.title || '—'}{more > 0 ? ` + ${more} more` : ''}</span>
                                                <span className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                                                    <span className="font-semibold text-ink">{formatPrice(order.total)}</span>
                                                    <span className="text-xs text-admin-muted">{paymentLabel(order)}</span>
                                                </span>
                                            </button>
                                            <div className="flex shrink-0 flex-col items-end gap-1.5">
                                                <OrderStatusBadge status={displayStatus(order)} />
                                                {order.returnStatus && <span className="text-[11px] font-medium text-warning">{RETURN_STATUS_LABELS[order.returnStatus]}</span>}
                                            </div>
                                        </div>
                                        <div className="mt-3 flex items-center justify-end gap-2 pl-8">
                                            {next ? (
                                                <Button variant="outline" size="sm" disabled={advancingId === order.id} onClick={() => advanceOrder(order)}>
                                                    {advancingId === order.id ? '…' : `Mark ${getStatusLabel(next).toLowerCase()}`}
                                                </Button>
                                            ) : (
                                                <Button variant="outline" size="sm" onClick={() => setDetailOrder(order)}>View</Button>
                                            )}
                                            <AdminMenu
                                                label={`More actions for order ${shortOrderId(order.id)}`}
                                                items={[
                                                    { label: 'View details', onClick: () => setDetailOrder(order) },
                                                    { label: 'Print shipping label', icon: Printer, onClick: () => printStickers([order.id]) },
                                                    { label: 'Invoice', icon: FileText, onClick: () => openInvoice(order, content) },
                                                ]}
                                            />
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                    <div className="overflow-x-auto max-lg:hidden">
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
                                    <th className="w-56 p-4"><span className="sr-only">Actions</span></th>
                                </tr>
                            </thead>
                            <tbody>
                                {visibleOrders.map((order) => {
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
                                                <OrderStatusBadge status={displayStatus(order)} />
                                                {order.returnStatus && <p className="mt-1 text-[11px] font-medium text-warning">{RETURN_STATUS_LABELS[order.returnStatus]}</p>}
                                                {(order.cancelReason || order.returnReason) && <p className="mt-1 max-w-[11rem] text-[11px] leading-snug text-admin-muted">{order.returnStatus ? order.returnReason : order.cancelReason}</p>}
                                            </td>
                                            <td className="p-4 text-xs text-admin-muted whitespace-nowrap">
                                                {formatOrderDate(order.createdAt, { time: false })}
                                            </td>
                                            <td className="p-4" onClick={(e) => e.stopPropagation()}>
                                                <div className="flex items-center justify-end gap-1.5">
                                                    {getNextStatus(order.status) && !isTerminalStatus(order.status) && !isAwaitingPayment(order) ? (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            disabled={advancingId === order.id}
                                                            onClick={() => advanceOrder(order)}
                                                            title={`Move this order to "${getStatusLabel(getNextStatus(order.status))}"`}
                                                        >
                                                            {advancingId === order.id ? '…' : `Mark ${getStatusLabel(getNextStatus(order.status)).toLowerCase()}`}
                                                        </Button>
                                                    ) : (
                                                        <Button variant="outline" size="sm" onClick={() => setDetailOrder(order)}>View</Button>
                                                    )}
                                                    <AdminMenu
                                                        label={`More actions for order ${shortOrderId(order.id)}`}
                                                        items={[
                                                            { label: 'View details', onClick: () => setDetailOrder(order) },
                                                            { label: 'Print shipping label', icon: Printer, onClick: () => printStickers([order.id]) },
                                                            { label: 'Invoice', icon: FileText, onClick: () => openInvoice(order, content) },
                                                        ]}
                                                    />
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {visibleOrders.length === 0 && !error && (
                        <AdminEmptyState
                            icon={Package}
                            title="No orders found"
                            description={hasActiveFilters ? 'Try adjusting your filters.' : 'New orders will appear here after checkout.'}
                        />
                    )}
                    </>
                )}
            </AdminTableShell>

            {!loading && (
                <p className="text-xs text-admin-muted mt-3">{visibleOrders.length} order{visibleOrders.length === 1 ? '' : 's'} shown</p>
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
