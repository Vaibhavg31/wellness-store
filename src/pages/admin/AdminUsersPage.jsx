import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ArrowUpDown,
    Ban,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    Download,
    Mail,
    Phone,
    RefreshCw,
    ShieldOff,
    ShoppingBag,
    User,
    XCircle,
} from 'lucide-react';
import { useAdminAuth } from '@/contexts/AuthContext';
import { api } from '@/services/api';
import { formatPrice } from '@/utils/formatPrice';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
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
    AdminErrorBanner,
} from '@/components/admin/AdminUi';
import OrderStatusBadge from '@/components/orders/OrderStatusBadge';
import OrderLineItems from '@/components/orders/OrderLineItems';
import {
    formatOrderDate,
    paymentLabel,
    shortOrderId,
} from '@/constants/orders';

const VERIFIED_FILTER_OPTIONS = [
    { value: '', label: 'All users' },
    { value: 'true', label: 'Phone verified' },
    { value: 'false', label: 'Not verified' },
];

const BLOCKED_FILTER_OPTIONS = [
    { value: '', label: 'All statuses' },
    { value: 'false', label: 'Active only' },
    { value: 'true', label: 'Blocked only' },
];

function formatDateTime(value) {
    if (!value) return '—';
    return new Date(value).toLocaleString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

function UserProfileSection({ user }) {
    const fields = [
        { label: 'User ID', value: user.id },
        { label: 'Full name', value: user.name },
        { label: 'Email', value: user.email },
        { label: 'Phone', value: user.phone },
        {
            label: 'Phone verified',
            value: user.phoneVerified ? `Yes · ${formatDateTime(user.phoneVerifiedAt)}` : 'No',
        },
        { label: 'Joined', value: formatDateTime(user.createdAt) },
        { label: 'Last login', value: formatDateTime(user.lastLogin) },
        { label: 'Last order', value: formatDateTime(user.lastOrderAt) },
        { label: 'Account status', value: user.isBlocked ? `Blocked · ${formatDateTime(user.blockedAt)}` : 'Active' },
    ];

    return (
        <section>
            <div className="flex items-start gap-4 mb-5">
                {user.avatar ? (
                    <img
                        src={user.avatar}
                        alt=""
                        className="w-14 h-14 rounded-full object-cover border border-admin-border"
                    />
                ) : (
                    <div className="w-14 h-14 rounded-full bg-admin-surface border border-admin-border flex items-center justify-center">
                        <User size={24} className="text-admin-muted/80" />
                    </div>
                )}
                <div>
                    <h3 className="font-display text-xl text-ink">{user.name || 'Unnamed user'}</h3>
                    <p className="text-sm text-admin-muted break-all">{user.email}</p>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                        {user.isGuest && (
                            <span className="inline-flex items-center gap-1 text-xs text-violet-800 bg-violet-100 px-2 py-0.5 rounded-full">
                                Guest (no account)
                            </span>
                        )}
                        {user.isBlocked && (
                            <span className="inline-flex items-center gap-1 text-xs text-red-700 bg-red-100 px-2 py-0.5 rounded-full">
                                <Ban size={12} />
                                Blocked
                            </span>
                        )}
                        {user.phoneVerified && (
                            <span className="inline-flex items-center gap-1 text-xs text-emerald bg-emerald/10 px-2 py-0.5 rounded-full">
                                <CheckCircle2 size={12} />
                                Phone verified
                            </span>
                        )}
                    </div>
                </div>
            </div>

            <p className="text-[11px] font-medium tracking-[0.15em] uppercase text-admin-muted mb-2.5">
                Account data on file
            </p>
            <dl className="rounded-xl bg-admin-surface-alt border border-admin-border p-4 sm:p-5 grid gap-3.5 text-sm">
                {fields.map(({ label, value }) => (
                    <div key={label}>
                        <dt className="text-[10px] uppercase tracking-wider text-admin-muted mb-0.5">{label}</dt>
                        <dd className="text-ink break-all">{value || '—'}</dd>
                    </div>
                ))}
            </dl>
        </section>
    );
}

function UserStatsSection({ user }) {
    const stats = [
        { label: 'Total orders', value: user.orderCount ?? 0 },
        { label: 'Total spent', value: formatPrice(user.totalSpent ?? 0) },
        { label: 'Revenue', value: formatPrice(user.revenue ?? user.totalSpent ?? 0) },
        { label: 'Delivered', value: user.deliveredCount ?? 0 },
    ];

    return (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {stats.map((s) => (
                <div key={s.label} className="rounded-xl bg-cream border border-admin-border px-3 py-3 text-center">
                    <p className="text-[10px] uppercase tracking-wider text-admin-muted">{s.label}</p>
                    <p className="font-display text-xl text-ink mt-0.5">{s.value}</p>
                </div>
            ))}
        </div>
    );
}

function UserOrdersSection({ orders, onSelectOrder }) {
    if (!orders.length) {
        return (
            <section>
                <p className="text-[11px] font-medium tracking-[0.15em] uppercase text-admin-muted mb-2.5">Orders</p>
                <div className="rounded-xl bg-admin-surface-alt border border-admin-border p-8 text-center">
                    <ShoppingBag size={28} className="text-admin-muted/50 mx-auto mb-2" />
                    <p className="text-sm text-admin-muted">No orders from this user yet.</p>
                </div>
            </section>
        );
    }

    return (
        <section>
            <p className="text-[11px] font-medium tracking-[0.15em] uppercase text-admin-muted mb-2.5">
                Orders ({orders.length})
            </p>
            <div className="rounded-xl border border-admin-border overflow-hidden">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="bg-admin-surface-alt border-b border-admin-border text-left">
                            <th className="p-3 font-medium text-admin-muted">Order</th>
                            <th className="p-3 font-medium text-admin-muted">Date</th>
                            <th className="p-3 font-medium text-admin-muted">Total</th>
                            <th className="p-3 font-medium text-admin-muted">Status</th>
                            <th className="p-3 w-16" />
                        </tr>
                    </thead>
                    <tbody>
                        {orders.map((order) => (
                            <tr
                                key={order.id}
                                className="border-b border-admin-border-light hover:bg-admin-surface-alt cursor-pointer"
                                onClick={() => onSelectOrder(order)}
                            >
                                <td className="p-3 font-mono text-xs">{shortOrderId(order.id)}</td>
                                <td className="p-3 text-xs text-admin-muted whitespace-nowrap">
                                    {formatOrderDate(order.createdAt, { time: false })}
                                </td>
                                <td className="p-3 font-medium whitespace-nowrap">{formatPrice(order.total)}</td>
                                <td className="p-3">
                                    <OrderStatusBadge status={order.status} />
                                </td>
                                <td className="p-3">
                                    <ChevronRight size={14} className="text-forest" />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </section>
    );
}

function OrderDetailView({ order, onBack }) {
    const shipping = order.shipping || {};

    return (
        <div className="space-y-6">
            <button
                type="button"
                onClick={onBack}
                className="inline-flex items-center gap-1 text-sm text-admin-muted hover:text-ink"
            >
                <ChevronLeft size={16} />
                Back to user
            </button>

            <div>
                <h3 className="font-display text-xl text-ink mb-1">Order {shortOrderId(order.id)}</h3>
                <p className="text-sm text-admin-muted">
                    {formatOrderDate(order.createdAt)} · {paymentLabel(order)}
                </p>
            </div>

            <div className="rounded-xl bg-admin-surface-alt border border-admin-border p-4 space-y-3 text-sm">
                <div className="flex justify-between">
                    <span className="text-admin-muted">Status</span>
                    <OrderStatusBadge status={order.status} />
                </div>
                <div className="flex justify-between">
                    <span className="text-admin-muted">Total</span>
                    <span className="font-medium">{formatPrice(order.total)}</span>
                </div>
                {order.couponCode && (
                    <div className="flex justify-between">
                        <span className="text-admin-muted">Coupon</span>
                        <span>{order.couponCode}</span>
                    </div>
                )}
            </div>

            <section>
                <p className="text-[11px] font-medium tracking-[0.15em] uppercase text-admin-muted mb-2.5">Items</p>
                <OrderLineItems items={order.items || []} />
            </section>

            <section>
                <p className="text-[11px] font-medium tracking-[0.15em] uppercase text-admin-muted mb-2.5">Shipping</p>
                <dl className="rounded-xl bg-admin-surface-alt border border-admin-border p-4 grid gap-2 text-sm">
                    <div><dt className="text-admin-muted text-xs">Name</dt><dd>{shipping.name || '—'}</dd></div>
                    <div><dt className="text-admin-muted text-xs">Phone</dt><dd>{shipping.phone || '—'}</dd></div>
                    <div><dt className="text-admin-muted text-xs">Address</dt><dd>{shipping.address || '—'}</dd></div>
                    <div><dt className="text-admin-muted text-xs">City</dt><dd>{shipping.city || '—'}{shipping.pincode ? ` · ${shipping.pincode}` : ''}</dd></div>
                </dl>
            </section>
        </div>
    );
}

export default function AdminUsersPage() {
    const { adminToken } = useAdminAuth();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false);
    const [exportModalOpen, setExportModalOpen] = useState(false);
    const [error, setError] = useState('');
    const [searchInput, setSearchInput] = useState('');
    const [filters, setFilters] = useState({
        search: '',
        phoneVerified: '',
        blocked: '',
        from: '',
        to: '',
        sort: 'createdAt',
        order: 'desc',
    });
    const [detailUser, setDetailUser] = useState(null);
    const [detailOrders, setDetailOrders] = useState([]);
    const [detailLoading, setDetailLoading] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [blocking, setBlocking] = useState(false);
    const [phoneInput, setPhoneInput] = useState('');
    const [savingPhone, setSavingPhone] = useState(false);

    useEffect(() => {
        const t = setTimeout(() => {
            setFilters((f) => ({ ...f, search: searchInput }));
        }, 300);
        return () => clearTimeout(t);
    }, [searchInput]);

    const buildQuery = useCallback((f) => {
        const params = new URLSearchParams();
        if (f.search) params.set('search', f.search);
        if (f.phoneVerified) params.set('phoneVerified', f.phoneVerified);
        if (f.blocked) params.set('blocked', f.blocked);
        if (f.from) params.set('from', f.from);
        if (f.to) params.set('to', f.to);
        if (f.sort) params.set('sort', f.sort);
        if (f.order) params.set('order', f.order);
        const qs = params.toString();
        return qs ? `?${qs}` : '';
    }, []);

    const fetchUsers = useCallback(async (f = filters) => {
        if (!adminToken) {
            setLoading(false);
            setError('Admin session missing. Please sign in again.');
            return;
        }

        setLoading(true);
        setError('');
        try {
            const data = await api.get(`/api/users/admin/all${buildQuery(f)}`, adminToken);
            setUsers(Array.isArray(data) ? data : []);
        } catch (err) {
            setUsers([]);
            setError(err instanceof Error ? err.message : 'Failed to load users');
        } finally {
            setLoading(false);
        }
    }, [adminToken, buildQuery, filters]);

    useEffect(() => {
        fetchUsers(filters);
    }, [adminToken, filters.search, filters.phoneVerified, filters.blocked, filters.from, filters.to, filters.sort, filters.order]); // eslint-disable-line react-hooks/exhaustive-deps

    const toggleBlock = async (user, blocked) => {
        if (!adminToken || user.isGuest) return;
        const action = blocked ? 'block' : 'unblock';
        if (!confirm(`${blocked ? 'Block' : 'Unblock'} ${user.name || user.email}? They will ${blocked ? 'not be able to sign in or place orders' : 'regain full access'}.`)) {
            return;
        }
        setBlocking(true);
        setError('');
        try {
            const updated = await api.put(`/api/users/admin/${user.id}/block`, { blocked }, adminToken);
            setDetailUser(updated);
            await fetchUsers(filters);
        } catch (err) {
            setError(err instanceof Error ? err.message : `Failed to ${action} user`);
        } finally {
            setBlocking(false);
        }
    };

    const openUserDetail = async (user) => {
        if (!adminToken) return;
        setDetailUser(user);
        setSelectedOrder(null);
        setDetailOrders([]);
        setDetailLoading(true);
        setPhoneInput(user.phone || '');
        try {
            const data = await api.get(`/api/users/admin/${user.id}`, adminToken);
            setDetailUser(data.user || user);
            setPhoneInput((data.user || user).phone || '');
            setDetailOrders(Array.isArray(data.orders) ? data.orders : []);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load user details');
        } finally {
            setDetailLoading(false);
        }
    };

    const closeDrawer = () => {
        setDetailUser(null);
        setDetailOrders([]);
        setSelectedOrder(null);
        setPhoneInput('');
    };

    const savePhone = async () => {
        if (!adminToken || !detailUser) return;
        const digits = phoneInput.replace(/\D/g, '');
        if (digits.length !== 10) {
            setError('Enter a valid 10-digit mobile number');
            return;
        }
        setSavingPhone(true);
        setError('');
        try {
            const updated = await api.put(`/api/users/admin/${detailUser.id}/phone`, { phone: digits }, adminToken);
            setDetailUser(updated);
            setPhoneInput(updated.phone || '');
            await fetchUsers(filters);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to update phone number');
        } finally {
            setSavingPhone(false);
        }
    };

    const exportUsers = async (format) => {
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
                `/api/users/admin/export${formatParam}`,
                adminToken,
                `wellness-users-${from}-to-${to}.${ext}`,
            );
            setExportModalOpen(false);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Export failed');
        } finally {
            setExporting(false);
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
            phoneVerified: '',
            blocked: '',
            from: '',
            to: '',
            sort: 'createdAt',
            order: 'desc',
        });
    };

    const hasActiveFilters = filters.phoneVerified || filters.blocked || filters.from || filters.to || filters.search;

    const stats = useMemo(() => {
        const verified = users.filter((u) => u.phoneVerified).length;
        const withOrders = users.filter((u) => (u.orderCount ?? 0) > 0).length;
        const totalOrders = users.reduce((sum, u) => sum + (u.orderCount ?? 0), 0);
        const blocked = users.filter((u) => u.isBlocked).length;
        const totalRevenue = users.reduce((sum, u) => sum + (u.revenue ?? u.totalSpent ?? 0), 0);
        return { total: users.length, verified, withOrders, totalOrders, blocked, totalRevenue };
    }, [users]);

    return (
        <div>
            <AdminPageHeader
                title="Users"
                subtitle="Customer accounts, verification, and order history"
                actions={(
                    <>
                        <Button variant="outline" size="sm" onClick={() => setExportModalOpen(true)} disabled={exporting || loading} className="gap-2">
                            <Download size={14} className={exporting ? 'animate-pulse' : ''} />
                            Export
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => fetchUsers()} disabled={loading} className="gap-2">
                            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                            Refresh
                        </Button>
                    </>
                )}
            />

            <AdminStatStrip
                columns={6}
                stats={[
                    { label: 'Revenue', value: formatPrice(stats.totalRevenue), tone: 'turmeric' },
                    { label: 'Users', value: stats.total },
                    { label: 'Orders', value: stats.totalOrders, tone: 'forest' },
                    { label: 'With orders', value: stats.withOrders },
                    { label: 'Verified', value: stats.verified, tone: 'emerald' },
                    { label: 'Blocked', value: stats.blocked, tone: 'red' },
                ]}
            />

            <AdminFilterBar footer="Orders matched by email and user ID — includes direct orders.">
                <AdminSearchInput value={searchInput} onChange={setSearchInput} placeholder="Search name, email, phone, user ID…" />
                <AdminSelect value={filters.phoneVerified} onChange={(e) => setFilters((f) => ({ ...f, phoneVerified: e.target.value }))} options={VERIFIED_FILTER_OPTIONS} aria-label="Phone verification" />
                <AdminSelect value={filters.blocked} onChange={(e) => setFilters((f) => ({ ...f, blocked: e.target.value }))} options={BLOCKED_FILTER_OPTIONS} aria-label="Blocked status" />
                <AdminDateRange
                    from={filters.from}
                    to={filters.to}
                    onFromChange={(e) => setFilters((f) => ({ ...f, from: e.target.value }))}
                    onToChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))}
                />
                {hasActiveFilters && <AdminClearButton onClick={clearFilters} />}
            </AdminFilterBar>

            <AdminErrorBanner message={error} />

            <AdminTableShell>
                {loading ? (
                    <AdminLoadingState />
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm min-w-[800px]">
                            <thead>
                                <tr className="border-b border-admin-border text-left bg-admin-surface-alt">
                                    <th className="p-4 font-medium text-admin-muted">User</th>
                                    <th className="p-4 font-medium text-admin-muted">Contact</th>
                                    <th className="p-4 font-medium text-admin-muted">Phone</th>
                                    <th className="p-4 font-medium text-admin-muted">
                                        <button type="button" onClick={() => toggleSort('orderCount')} className="inline-flex items-center gap-1 hover:text-ink">
                                            Orders <ArrowUpDown size={12} />
                                        </button>
                                    </th>
                                    <th className="p-4 font-medium text-admin-muted">
                                        <button type="button" onClick={() => toggleSort('totalSpent')} className="inline-flex items-center gap-1 hover:text-ink">
                                            Spent <ArrowUpDown size={12} />
                                        </button>
                                    </th>
                                    <th className="p-4 font-medium text-admin-muted">
                                        <button type="button" onClick={() => toggleSort('createdAt')} className="inline-flex items-center gap-1 hover:text-ink">
                                            Joined <ArrowUpDown size={12} />
                                        </button>
                                    </th>
                                    <th className="p-4 w-24" />
                                </tr>
                            </thead>
                            <tbody>
                                {users.map((user) => (
                                    <tr
                                        key={user.id}
                                        className={`border-b border-admin-border-light hover:bg-admin-surface-alt cursor-pointer ${user.isBlocked ? 'bg-red-50/50' : ''}`}
                                        onClick={() => openUserDetail(user)}
                                    >
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                {user.avatar ? (
                                                    <img src={user.avatar} alt="" className="w-9 h-9 rounded-full object-cover" />
                                                ) : (
                                                    <div className="w-9 h-9 rounded-full bg-admin-surface flex items-center justify-center">
                                                        <User size={16} className="text-admin-muted/80" />
                                                    </div>
                                                )}
                                                <div>
                                                    <p className="font-medium text-ink">{user.name || '—'}</p>
                                                    <div className="flex flex-wrap gap-1 mt-0.5">
                                                        {user.isGuest && (
                                                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-100 text-violet-800">Guest</span>
                                                        )}
                                                        {user.isBlocked && (
                                                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-red-700">Blocked</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <p className="text-ink flex items-center gap-1 truncate max-w-[12rem]">
                                                <Mail size={12} className="text-admin-muted/80 flex-shrink-0" />
                                                {user.email}
                                            </p>
                                        </td>
                                        <td className="p-4">
                                            <p className="text-ink flex items-center gap-1">
                                                <Phone size={12} className="text-admin-muted/80" />
                                                {user.phone || '—'}
                                            </p>
                                            {user.phoneVerified ? (
                                                <span className="text-[10px] text-emerald">Verified</span>
                                            ) : (
                                                <span className="text-[10px] text-admin-muted flex items-center gap-0.5">
                                                    <XCircle size={10} /> Not verified
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-4 font-medium">{user.orderCount ?? 0}</td>
                                        <td className="p-4 font-medium whitespace-nowrap">{formatPrice(user.totalSpent ?? 0)}</td>
                                        <td className="p-4 text-xs text-admin-muted whitespace-nowrap">
                                            {formatOrderDate(user.createdAt, { time: false })}
                                        </td>
                                        <td className="p-4">
                                            <button
                                                type="button"
                                                onClick={(e) => { e.stopPropagation(); openUserDetail(user); }}
                                                className="text-forest hover:text-forest-light text-xs font-medium inline-flex items-center gap-0.5"
                                            >
                                                View <ChevronRight size={14} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {users.length === 0 && !error && (
                            <div className="text-center py-16">
                                <User size={36} className="text-admin-muted/50 mx-auto mb-4" />
                                <p className="text-ink font-medium mb-1">No users found</p>
                                <p className="text-admin-muted text-sm">
                                    {hasActiveFilters ? 'Try adjusting your filters.' : 'Users appear here after Google sign-in.'}
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </AdminTableShell>

            {!loading && (
                <p className="text-xs text-admin-muted mt-3">{users.length} user{users.length === 1 ? '' : 's'} shown</p>
            )}

            <Drawer
                isOpen={!!detailUser}
                onClose={closeDrawer}
                title={selectedOrder ? `Order ${shortOrderId(selectedOrder.id)}` : (detailUser?.name || 'User')}
                subtitle={selectedOrder ? formatOrderDate(selectedOrder.createdAt) : detailUser?.email}
                side="right"
                wide
                admin
            >
                {detailLoading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="w-8 h-8 border-2 border-forest/30 border-t-forest rounded-full animate-spin" />
                    </div>
                ) : selectedOrder ? (
                    <OrderDetailView order={selectedOrder} onBack={() => setSelectedOrder(null)} />
                ) : detailUser ? (
                    <div className="space-y-6">
                        <UserProfileSection user={detailUser} />
                        <UserStatsSection user={detailUser} />
                        {!detailUser.isGuest && (
                            <section>
                                <p className="text-[11px] font-medium tracking-[0.15em] uppercase text-admin-muted mb-2.5">
                                    Set phone number
                                </p>
                                <div className="rounded-xl bg-admin-surface-alt border border-admin-border p-4 sm:p-5 space-y-2">
                                    <p className="text-xs text-admin-muted">
                                        Entering a number here saves it directly and marks it verified — no OTP is sent to the customer.
                                    </p>
                                    <div className="flex gap-2">
                                        <Input
                                            value={phoneInput}
                                            onChange={(e) => setPhoneInput(e.target.value.replace(/\D/g, '').slice(0, 10))}
                                            placeholder="10-digit mobile number"
                                            maxLength={10}
                                        />
                                        <Button
                                            variant="turmeric"
                                            size="sm"
                                            className="shrink-0"
                                            onClick={savePhone}
                                            disabled={savingPhone || phoneInput.length !== 10}
                                        >
                                            {savingPhone ? 'Saving…' : 'Save'}
                                        </Button>
                                    </div>
                                </div>
                            </section>
                        )}
                        {!detailUser.isGuest && (
                            <div className="flex gap-2">
                                {detailUser.isBlocked ? (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => toggleBlock(detailUser, false)}
                                        disabled={blocking}
                                        className="gap-2 text-emerald border-emerald/30 hover:bg-emerald/5"
                                    >
                                        <ShieldOff size={14} />
                                        Unblock user
                                    </Button>
                                ) : (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => toggleBlock(detailUser, true)}
                                        disabled={blocking}
                                        className="gap-2 text-red-600 border-red-200 hover:bg-red-50"
                                    >
                                        <Ban size={14} />
                                        Block user
                                    </Button>
                                )}
                            </div>
                        )}
                        <UserOrdersSection orders={detailOrders} onSelectOrder={setSelectedOrder} />
                    </div>
                ) : null}
            </Drawer>

            <ExportFormatModal
                isOpen={exportModalOpen}
                onClose={() => setExportModalOpen(false)}
                onSelect={exportUsers}
                exporting={exporting}
                title="Export users"
            />
        </div>
    );
}
