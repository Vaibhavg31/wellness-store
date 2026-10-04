import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    AlertCircle,
    CheckCircle2,
    ChevronRight,
    ClipboardList,
    History,
    Mail,
    MapPin,
    Package,
    Plus,
    RefreshCw,
    Search,
    Settings2,
    StickyNote,
    Trash2,
    Truck,
    User,
} from 'lucide-react';
import { useAdminAuth, ADMIN_PATH } from '@/contexts/AuthContext';
import { api } from '@/services/api';
import { formatPrice } from '@/utils/formatPrice';
import { formatIndianAddress } from '@/utils/formatAddress';
import Button from '@/components/ui/Button';
import { fieldClass, FormLabel, OptionalSection } from '@/components/admin/AdminFormUi';
import { AdminDateInput } from '@/components/admin/AdminUi';
import ProductSearchSelect from '@/components/admin/ProductSearchSelect';
import Drawer from '@/components/ui/Drawer';
import OrderStatusBadge from '@/components/orders/OrderStatusBadge';
import OrderLineItems from '@/components/orders/OrderLineItems';
import {
    ADMIN_STATUS_OPTIONS,
    formatOrderDate,
    getStatusLabel,
    paymentLabel,
    shortOrderId,
} from '@/constants/orders';

const EMPTY_ITEM = { productId: '', title: '', price: '', quantity: 1, image: '' };

const PAYMENT_OPTIONS = [
    { value: 'cod', label: 'Cash on Delivery', short: 'COD' },
    { value: 'offline', label: 'Paid Offline', short: 'Paid' },
    { value: 'pending', label: 'Payment Pending', short: 'Pending' },
];

function LineItemRow({ item, index, products, onChange, onRemove, canRemove }) {
    const selectProduct = (productId) => {
        const product = products.find((p) => p.id === productId);
        if (!product) {
            onChange(index, { productId: '', title: '', price: '', image: '' });
            return;
        }
        onChange(index, {
            productId: product.id,
            title: product.title || '',
            price: String(product.price ?? ''),
            image: product.images?.[0] || '',
        });
    };

    const lineTotal = (parseFloat(item.price) || 0) * (parseInt(item.quantity, 10) || 0);

    return (
        <div className="rounded-xl border border-admin-border bg-admin-surface-alt p-3 sm:p-4">
            <div className="flex items-center justify-between gap-2 mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-admin-muted">
                    Line {index + 1}
                </span>
                <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-ink">{formatPrice(lineTotal)}</span>
                    {canRemove && (
                        <button
                            type="button"
                            onClick={() => onRemove(index)}
                            className="p-1.5 rounded-lg text-red-500 hover:bg-red-50"
                            aria-label="Remove item"
                        >
                            <Trash2 size={15} />
                        </button>
                    )}
                </div>
            </div>

            <div className="grid gap-3 lg:grid-cols-12">
                <div className="lg:col-span-4">
                    <FormLabel>Catalog product</FormLabel>
                    <ProductSearchSelect
                        products={products}
                        value={item.productId || ''}
                        onChange={selectProduct}
                        placeholder="Search by name, category, price…"
                    />
                </div>
                <div className="lg:col-span-4">
                    <FormLabel required>Title</FormLabel>
                    <input
                        value={item.title}
                        onChange={(e) => onChange(index, { title: e.target.value })}
                        className={fieldClass}
                        placeholder="Item name"
                    />
                </div>
                <div className="lg:col-span-2">
                    <FormLabel required>Price (₹)</FormLabel>
                    <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.price}
                        onChange={(e) => onChange(index, { price: e.target.value })}
                        className={fieldClass}
                    />
                </div>
                <div className="lg:col-span-2">
                    <FormLabel required>Qty</FormLabel>
                    <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => onChange(index, { quantity: e.target.value })}
                        className={fieldClass}
                    />
                </div>
            </div>
        </div>
    );
}

function DirectOrderDetailPanel({ order, adminToken, onUpdated }) {
    const [updating, setUpdating] = useState(false);

    const updateStatus = async (status) => {
        setUpdating(true);
        try {
            await api.put(`/api/orders/${order.id}/status`, { status, note: 'Updated from direct orders' }, adminToken);
            await onUpdated();
        } finally {
            setUpdating(false);
        }
    };

    const address = formatIndianAddress(order.shipping || {});

    return (
        <div className="space-y-5">
            <div className="rounded-xl border border-admin-border bg-gradient-to-br from-canvas/80 to-sand/40 p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                            <OrderStatusBadge status={order.status} />
                            <span className="text-xs px-2 py-0.5 rounded-full bg-violet-100 text-violet-800 border border-violet-200 font-medium">
                                Direct
                            </span>
                        </div>
                        <p className="text-xs text-admin-muted">{paymentLabel(order)}</p>
                    </div>
                    <p className="font-display text-3xl text-ink">{formatPrice(order.total)}</p>
                </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4 text-sm">
                <div className="rounded-lg bg-admin-surface-alt p-3 border border-admin-border">
                    <p className="text-[10px] uppercase tracking-wider text-admin-muted mb-1">Customer</p>
                    <p className="font-medium text-ink">{order.shipping?.name}</p>
                    <p className="text-admin-muted mt-1">{order.shipping?.phone}</p>
                </div>
                <div className="rounded-lg bg-admin-surface-alt p-3 border border-admin-border">
                    <p className="text-[10px] uppercase tracking-wider text-admin-muted mb-1">Email</p>
                    <p className="text-ink break-all">{order.email || '—'}</p>
                </div>
            </div>

            {address && (
                <div className="rounded-lg bg-admin-surface-alt p-3 border border-admin-border text-sm">
                    <p className="text-[10px] uppercase tracking-wider text-admin-muted mb-1">Address</p>
                    <p className="text-ink leading-relaxed">{address}</p>
                </div>
            )}

            <div>
                <p className="text-[11px] font-medium tracking-[0.15em] uppercase text-admin-muted mb-3">Items</p>
                <OrderLineItems items={order.items} plain />
            </div>

            <div>
                <FormLabel>Update status</FormLabel>
                <select
                    value={order.status}
                    disabled={updating}
                    onChange={(e) => updateStatus(e.target.value)}
                    className={fieldClass}
                >
                    {!ADMIN_STATUS_OPTIONS.some((s) => s.value === order.status) && (
                        <option value={order.status}>{getStatusLabel(order.status)} (current)</option>
                    )}
                    {ADMIN_STATUS_OPTIONS.map((s) => (
                        <option key={s.value} value={s.value}>{s.adminLabel}</option>
                    ))}
                </select>
            </div>

            <Link
                to={`${ADMIN_PATH}/orders?source=direct`}
                className="text-sm text-primary hover:text-primary-hover inline-flex items-center gap-1 font-medium"
            >
                Open in all orders <ChevronRight size={14} />
            </Link>
        </div>
    );
}

const DEFAULT_OPTIONAL = {
    customerDetails: false,
    pricingExtras: false,
    shippingTracking: false,
    adminNotes: false,
    notifications: false,
};

export default function AdminDirectOrdersPage() {
    const { adminToken } = useAdminAuth();
    const [activeTab, setActiveTab] = useState('create');
    const [products, setProducts] = useState([]);
    const [directOrders, setDirectOrders] = useState([]);
    const [loadingOrders, setLoadingOrders] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [detailOrder, setDetailOrder] = useState(null);
    const [searchInput, setSearchInput] = useState('');
    const [optional, setOptional] = useState(DEFAULT_OPTIONAL);

    const [form, setForm] = useState({
        items: [{ ...EMPTY_ITEM }],
        shipping: {
            name: '',
            phone: '',
            address: '',
            city: '',
            state: '',
            pincode: '',
            landmark: '',
        },
        email: '',
        discountAmount: '',
        deliveryFee: '',
        payment: 'cod',
        status: 'confirmed',
        adminNotes: '',
        trackingNumber: '',
        carrier: '',
        estimatedDelivery: '',
        sendEmail: false,
        adjustStock: true,
    });

    const setOptionalSection = (key, value) => {
        setOptional((o) => ({ ...o, [key]: value }));
    };

    const fetchProducts = useCallback(async () => {
        if (!adminToken) return;
        try {
            const data = await api.get('/api/products/admin/all', adminToken);
            setProducts(Array.isArray(data) ? data : []);
        } catch {
            setProducts([]);
        }
    }, [adminToken]);

    const fetchDirectOrders = useCallback(async ({ silent = false } = {}) => {
        if (!adminToken) return;
        if (!silent) setLoadingOrders(true);
        try {
            const params = new URLSearchParams({ source: 'direct', sort: 'createdAt', order: 'desc' });
            if (searchInput.trim()) params.set('search', searchInput.trim());
            const data = await api.get(`/api/orders/admin/all?${params}`, adminToken);
            setDirectOrders(Array.isArray(data) ? data : []);
        } catch {
            setDirectOrders([]);
        } finally {
            setLoadingOrders(false);
        }
    }, [adminToken, searchInput]);

    useEffect(() => {
        fetchProducts();
    }, [fetchProducts]);

    useEffect(() => {
        if (activeTab !== 'history') return;
        const t = setTimeout(() => fetchDirectOrders(), searchInput ? 300 : 0);
        return () => clearTimeout(t);
    }, [fetchDirectOrders, searchInput, activeTab]);

    const lineSubtotal = useMemo(() => {
        return form.items.reduce((sum, item) => {
            const price = parseFloat(item.price) || 0;
            const qty = parseInt(item.quantity, 10) || 0;
            return sum + price * qty;
        }, 0);
    }, [form.items]);

    const computedTotal = useMemo(() => {
        const discount = optional.pricingExtras ? (parseFloat(form.discountAmount) || 0) : 0;
        const delivery = optional.pricingExtras ? (parseFloat(form.deliveryFee) || 0) : 0;
        return Math.max(0, lineSubtotal - discount + delivery);
    }, [lineSubtotal, form.discountAmount, form.deliveryFee, optional.pricingExtras]);

    const updateItem = (index, patch) => {
        setForm((f) => ({
            ...f,
            items: f.items.map((item, i) => (i === index ? { ...item, ...patch } : item)),
        }));
    };

    const addItem = () => {
        setForm((f) => ({ ...f, items: [...f.items, { ...EMPTY_ITEM }] }));
    };

    const removeItem = (index) => {
        setForm((f) => ({
            ...f,
            items: f.items.length > 1 ? f.items.filter((_, i) => i !== index) : f.items,
        }));
    };

    const resetForm = () => {
        setForm({
            items: [{ ...EMPTY_ITEM }],
            shipping: { name: '', phone: '', address: '', city: '', state: '', pincode: '', landmark: '' },
            email: '',
            discountAmount: '',
            deliveryFee: '',
            payment: 'cod',
            status: 'confirmed',
            adminNotes: '',
            trackingNumber: '',
            carrier: '',
            estimatedDelivery: '',
            sendEmail: false,
            adjustStock: true,
        });
        setOptional(DEFAULT_OPTIONAL);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!adminToken) return;

        setError('');
        setSuccess('');

        const validItems = form.items.filter((item) => item.title.trim() && parseFloat(item.price) >= 0);
        if (validItems.length === 0) {
            setError('Add at least one item with title and price.');
            return;
        }

        if (!form.shipping.name.trim() || !form.shipping.phone.trim()) {
            setError('Customer name and phone are required.');
            return;
        }

        if (optional.notifications && form.sendEmail && !form.email.trim()) {
            setError('Turn on email notification only when customer email is filled, or switch notifications off.');
            return;
        }

        setSaving(true);
        try {
            const payload = {
                items: validItems.map((item) => ({
                    productId: item.productId || '',
                    title: item.title.trim(),
                    price: parseFloat(item.price) || 0,
                    quantity: parseInt(item.quantity, 10) || 1,
                    image: item.image || '',
                })),
                shipping: {
                    ...form.shipping,
                    name: form.shipping.name.trim(),
                    phone: form.shipping.phone.trim(),
                },
                email: optional.customerDetails ? form.email.trim() : '',
                discountAmount: optional.pricingExtras ? (parseFloat(form.discountAmount) || 0) : 0,
                deliveryFee: optional.pricingExtras ? (parseFloat(form.deliveryFee) || 0) : 0,
                payment: form.payment,
                status: form.status,
                adminNotes: optional.adminNotes ? form.adminNotes.trim() : '',
                trackingNumber: optional.shippingTracking ? form.trackingNumber.trim() : '',
                carrier: optional.shippingTracking ? form.carrier.trim() : '',
                estimatedDelivery: optional.shippingTracking ? form.estimatedDelivery : '',
                sendEmail: optional.notifications && form.sendEmail,
                adjustStock: optional.notifications ? form.adjustStock : false,
            };

            const created = await api.post('/api/orders/admin/create-direct', payload, adminToken);
            setSuccess(`Direct order ${shortOrderId(created.id)} created successfully.`);
            resetForm();
            await fetchDirectOrders();
            setDetailOrder(created);
            setActiveTab('history');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to create order');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="max-w-5xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
                <div>
                    <h1 className="font-display text-3xl text-ink mb-1 max-lg:hidden">Direct Orders</h1>
                    <p className="text-admin-muted text-sm max-w-xl">
                        Fast manual orders. Only name, phone, and items are required. Turn on optional sections when you need them.
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Link to={`${ADMIN_PATH}/orders`}>
                        <Button variant="outline" size="sm" className="normal-case tracking-normal">
                            All orders
                        </Button>
                    </Link>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                            if (activeTab === 'history') fetchDirectOrders();
                        }}
                        disabled={loadingOrders && activeTab === 'history'}
                        className="gap-2 normal-case tracking-normal"
                    >
                        <RefreshCw size={14} className={loadingOrders && activeTab === 'history' ? 'animate-spin' : ''} />
                        Refresh
                    </Button>
                </div>
            </div>

            <div className="flex gap-1 p-1 rounded-xl bg-admin-surface-alt border border-admin-border mb-6 max-w-md">
                <button
                    type="button"
                    onClick={() => setActiveTab('create')}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                        activeTab === 'create'
                            ? 'bg-white text-ink shadow-sm border border-admin-border'
                            : 'text-admin-muted hover:text-ink'
                    }`}
                >
                    <ClipboardList size={16} />
                    New order
                </button>
                <button
                    type="button"
                    onClick={() => {
                        setActiveTab('history');
                        fetchDirectOrders();
                    }}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                        activeTab === 'history'
                            ? 'bg-white text-ink shadow-sm border border-admin-border'
                            : 'text-admin-muted hover:text-ink'
                    }`}
                >
                    <History size={16} />
                    History
                    {directOrders.length > 0 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">
                            {directOrders.length}
                        </span>
                    )}
                </button>
            </div>

            {activeTab === 'create' && (
                <form onSubmit={handleSubmit} className="space-y-4">
                    {error && (
                        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex gap-3">
                            <AlertCircle size={18} className="flex-shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}
                    {success && (
                        <div className="p-4 rounded-xl bg-primary/10 border border-primary/30 text-primary text-sm flex gap-3">
                            <CheckCircle2 size={18} className="flex-shrink-0" />
                            <span>{success}</span>
                        </div>
                    )}

                    <section className="rounded-2xl border border-admin-border bg-white shadow-sm p-5 sm:p-6 space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                                <User size={20} className="text-primary" />
                            </div>
                            <div>
                                <h2 className="font-display text-xl text-ink">Customer</h2>
                                <p className="text-xs text-admin-muted">Name and phone are required</p>
                            </div>
                        </div>
                        <div className="grid sm:grid-cols-2 gap-3">
                            <div>
                                <FormLabel required>Name</FormLabel>
                                <input
                                    value={form.shipping.name}
                                    onChange={(e) => setForm((f) => ({ ...f, shipping: { ...f.shipping, name: e.target.value } }))}
                                    className={fieldClass}
                                    placeholder="Customer name"
                                />
                            </div>
                            <div>
                                <FormLabel required>Phone</FormLabel>
                                <input
                                    value={form.shipping.phone}
                                    onChange={(e) => setForm((f) => ({ ...f, shipping: { ...f.shipping, phone: e.target.value } }))}
                                    className={fieldClass}
                                    placeholder="10-digit mobile"
                                />
                            </div>
                        </div>

                        <OptionalSection
                            icon={MapPin}
                            title="Address & email"
                            description="Delivery address and confirmation email"
                            enabled={optional.customerDetails}
                            onToggle={(v) => setOptionalSection('customerDetails', v)}
                        >
                            <div className="grid sm:grid-cols-2 gap-3">
                                <div className="sm:col-span-2">
                                    <FormLabel>Email</FormLabel>
                                    <input
                                        type="email"
                                        value={form.email}
                                        onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                                        className={fieldClass}
                                        placeholder="customer@email.com"
                                    />
                                </div>
                                <div className="sm:col-span-2">
                                    <FormLabel>Address</FormLabel>
                                    <input
                                        value={form.shipping.address}
                                        onChange={(e) => setForm((f) => ({ ...f, shipping: { ...f.shipping, address: e.target.value } }))}
                                        className={fieldClass}
                                        placeholder="Street, building, area"
                                    />
                                </div>
                                <div>
                                    <FormLabel>City</FormLabel>
                                    <input
                                        value={form.shipping.city}
                                        onChange={(e) => setForm((f) => ({ ...f, shipping: { ...f.shipping, city: e.target.value } }))}
                                        className={fieldClass}
                                    />
                                </div>
                                <div>
                                    <FormLabel>State</FormLabel>
                                    <input
                                        value={form.shipping.state}
                                        onChange={(e) => setForm((f) => ({ ...f, shipping: { ...f.shipping, state: e.target.value } }))}
                                        className={fieldClass}
                                    />
                                </div>
                                <div>
                                    <FormLabel>Pincode</FormLabel>
                                    <input
                                        value={form.shipping.pincode}
                                        onChange={(e) => setForm((f) => ({ ...f, shipping: { ...f.shipping, pincode: e.target.value } }))}
                                        className={fieldClass}
                                    />
                                </div>
                                <div>
                                    <FormLabel>Landmark</FormLabel>
                                    <input
                                        value={form.shipping.landmark}
                                        onChange={(e) => setForm((f) => ({ ...f, shipping: { ...f.shipping, landmark: e.target.value } }))}
                                        className={fieldClass}
                                    />
                                </div>
                            </div>
                        </OptionalSection>
                    </section>

                    <section className="rounded-2xl border border-admin-border bg-white shadow-sm p-5 sm:p-6 space-y-4">
                        <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                                    <Package size={20} className="text-primary" />
                                </div>
                                <div>
                                    <h2 className="font-display text-xl text-ink">Items</h2>
                                    <p className="text-xs text-admin-muted">Custom price allowed per line</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={addItem}
                                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-primary bg-primary/5 hover:bg-primary/10 border border-primary/20"
                            >
                                <Plus size={14} /> Add line
                            </button>
                        </div>
                        <div className="space-y-3">
                            {form.items.map((item, index) => (
                                <LineItemRow
                                    key={index}
                                    item={item}
                                    index={index}
                                    products={products}
                                    onChange={updateItem}
                                    onRemove={removeItem}
                                    canRemove={form.items.length > 1}
                                />
                            ))}
                        </div>
                    </section>

                    <section className="rounded-2xl border border-admin-border bg-white shadow-sm p-5 sm:p-6 space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                                <Settings2 size={20} className="text-primary" />
                            </div>
                            <div>
                                <h2 className="font-display text-xl text-ink">Order setup</h2>
                                <p className="text-xs text-admin-muted">Payment and starting status</p>
                            </div>
                        </div>

                        <div className="grid sm:grid-cols-3 gap-3">
                            {PAYMENT_OPTIONS.map((opt) => (
                                <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => setForm((f) => ({ ...f, payment: opt.value }))}
                                    className={`rounded-xl border p-3 text-left transition-all ${
                                        form.payment === opt.value
                                            ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                                            : 'border-admin-border bg-admin-surface-alt hover:border-line'
                                    }`}
                                >
                                    <p className="text-sm font-semibold text-ink">{opt.short}</p>
                                    <p className="text-[11px] text-admin-muted mt-0.5">{opt.label}</p>
                                </button>
                            ))}
                        </div>

                        <div>
                            <FormLabel>Initial status</FormLabel>
                            <select
                                value={form.status}
                                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                                className={fieldClass}
                            >
                                {ADMIN_STATUS_OPTIONS.map((s) => (
                                    <option key={s.value} value={s.value}>{s.adminLabel}</option>
                                ))}
                            </select>
                        </div>

                        <OptionalSection
                            icon={StickyNote}
                            title="Discount & delivery"
                            description="Adjust subtotal with discount or delivery fee"
                            enabled={optional.pricingExtras}
                            onToggle={(v) => setOptionalSection('pricingExtras', v)}
                        >
                            <div className="grid sm:grid-cols-2 gap-3">
                                <div>
                                    <FormLabel>Discount (₹)</FormLabel>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={form.discountAmount}
                                        onChange={(e) => setForm((f) => ({ ...f, discountAmount: e.target.value }))}
                                        className={fieldClass}
                                        placeholder="0"
                                    />
                                </div>
                                <div>
                                    <FormLabel>Delivery fee (₹)</FormLabel>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={form.deliveryFee}
                                        onChange={(e) => setForm((f) => ({ ...f, deliveryFee: e.target.value }))}
                                        className={fieldClass}
                                        placeholder="0"
                                    />
                                </div>
                            </div>
                        </OptionalSection>

                        <OptionalSection
                            icon={Truck}
                            title="Tracking & carrier"
                            description="AWB number and courier details"
                            enabled={optional.shippingTracking}
                            onToggle={(v) => setOptionalSection('shippingTracking', v)}
                        >
                            <div className="grid sm:grid-cols-2 gap-3">
                                <div>
                                    <FormLabel>Tracking number</FormLabel>
                                    <input
                                        value={form.trackingNumber}
                                        onChange={(e) => setForm((f) => ({ ...f, trackingNumber: e.target.value }))}
                                        className={fieldClass}
                                        placeholder="AWB / tracking ID"
                                    />
                                </div>
                                <div>
                                    <FormLabel>Carrier</FormLabel>
                                    <input
                                        value={form.carrier}
                                        onChange={(e) => setForm((f) => ({ ...f, carrier: e.target.value }))}
                                        className={fieldClass}
                                        placeholder="Delhivery, BlueDart…"
                                    />
                                </div>
                                <div className="sm:col-span-2">
                                    <AdminDateInput
                                        label="Estimated delivery"
                                        value={form.estimatedDelivery}
                                        onChange={(e) => setForm((f) => ({ ...f, estimatedDelivery: e.target.value }))}
                                    />
                                </div>
                            </div>
                        </OptionalSection>

                        <OptionalSection
                            icon={StickyNote}
                            title="Admin notes"
                            description="Internal notes (not visible to customer)"
                            enabled={optional.adminNotes}
                            onToggle={(v) => setOptionalSection('adminNotes', v)}
                        >
                            <textarea
                                value={form.adminNotes}
                                onChange={(e) => setForm((f) => ({ ...f, adminNotes: e.target.value }))}
                                rows={3}
                                className={`${fieldClass} resize-none rounded-xl`}
                                placeholder="Walk-in sale, WhatsApp order reference, etc."
                            />
                        </OptionalSection>

                        <OptionalSection
                            icon={Mail}
                            title="Notifications & stock"
                            description="Email confirmation and inventory deduction"
                            enabled={optional.notifications}
                            onToggle={(v) => setOptionalSection('notifications', v)}
                        >
                            <div className="space-y-3">
                                <label className="flex items-start gap-3 cursor-pointer rounded-lg border border-admin-border p-3 bg-admin-surface-alt">
                                    <input
                                        type="checkbox"
                                        checked={form.sendEmail}
                                        onChange={(e) => setForm((f) => ({ ...f, sendEmail: e.target.checked }))}
                                        className="mt-0.5 rounded border-line"
                                    />
                                    <span>
                                        <span className="text-sm font-medium text-ink">Send confirmation email</span>
                                        <span className="text-xs text-admin-muted block mt-0.5">
                                            Requires email in Address & email section
                                        </span>
                                    </span>
                                </label>
                                <label className="flex items-start gap-3 cursor-pointer rounded-lg border border-admin-border p-3 bg-admin-surface-alt">
                                    <input
                                        type="checkbox"
                                        checked={form.adjustStock}
                                        onChange={(e) => setForm((f) => ({ ...f, adjustStock: e.target.checked }))}
                                        className="mt-0.5 rounded border-line"
                                    />
                                    <span>
                                        <span className="text-sm font-medium text-ink">Deduct catalog stock</span>
                                        <span className="text-xs text-admin-muted block mt-0.5">
                                            Only for catalog line items
                                        </span>
                                    </span>
                                </label>
                            </div>
                        </OptionalSection>
                    </section>

                    <div className="sticky bottom-4 z-10 rounded-2xl border border-admin-border bg-white shadow-lg p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                        <div className="flex-1 space-y-1">
                            <div className="flex justify-between text-sm text-admin-muted">
                                <span>Subtotal</span>
                                <span>{formatPrice(lineSubtotal)}</span>
                            </div>
                            {optional.pricingExtras && parseFloat(form.discountAmount) > 0 && (
                                <div className="flex justify-between text-sm text-primary">
                                    <span>Discount</span>
                                    <span>−{formatPrice(form.discountAmount)}</span>
                                </div>
                            )}
                            {optional.pricingExtras && parseFloat(form.deliveryFee) > 0 && (
                                <div className="flex justify-between text-sm text-admin-muted">
                                    <span>Delivery</span>
                                    <span>{formatPrice(form.deliveryFee)}</span>
                                </div>
                            )}
                            <div className="flex justify-between items-baseline pt-2 border-t border-admin-border">
                                <span className="text-sm font-medium text-ink">Order total</span>
                                <span className="font-display text-2xl text-ink">{formatPrice(computedTotal)}</span>
                            </div>
                        </div>
                        <Button
                            type="submit"
                            variant="turmeric"
                            loading={saving}
                            size="lg"
                            className="sm:min-w-[200px] normal-case tracking-normal shrink-0"
                        >
                            Create order
                        </Button>
                    </div>
                </form>
            )}

            {activeTab === 'history' && (
                <div className="rounded-2xl border border-admin-border bg-white shadow-sm overflow-hidden">
                    <div className="p-4 sm:p-5 border-b border-admin-border flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
                        <div>
                            <h2 className="font-display text-xl text-ink">Direct order history</h2>
                            <p className="text-xs text-admin-muted mt-0.5">
                                {directOrders.length} order{directOrders.length === 1 ? '' : 's'}
                            </p>
                        </div>
                        <div className="relative w-full sm:w-72">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-admin-muted/80" />
                            <input
                                value={searchInput}
                                onChange={(e) => setSearchInput(e.target.value)}
                                placeholder="Search name, phone, ID…"
                                className={`${fieldClass} pl-8`}
                            />
                        </div>
                    </div>

                    {loadingOrders ? (
                        <div className="flex justify-center py-20">
                            <div className="w-8 h-8 border-2 border-primary/30 border-t-forest rounded-full animate-spin" />
                        </div>
                    ) : directOrders.length === 0 ? (
                        <div className="text-center py-16 px-4">
                            <Package size={40} className="text-admin-muted/50 mx-auto mb-3" />
                            <p className="text-ink font-medium">No direct orders yet</p>
                            <p className="text-sm text-admin-muted mt-1 mb-4">Create your first order from the New order tab.</p>
                            <Button variant="outline" size="sm" onClick={() => setActiveTab('create')} className="normal-case tracking-normal">
                                New order
                            </Button>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm min-w-[640px]">
                                <thead>
                                    <tr className="border-b border-admin-border text-left bg-admin-surface-alt">
                                        <th className="p-4 font-medium text-admin-muted">Order</th>
                                        <th className="p-4 font-medium text-admin-muted">Customer</th>
                                        <th className="p-4 font-medium text-admin-muted">Total</th>
                                        <th className="p-4 font-medium text-admin-muted">Payment</th>
                                        <th className="p-4 font-medium text-admin-muted">Status</th>
                                        <th className="p-4 font-medium text-admin-muted">Date</th>
                                        <th className="p-4 w-16" />
                                    </tr>
                                </thead>
                                <tbody>
                                    {directOrders.map((order) => (
                                        <tr
                                            key={order.id}
                                            className="border-b border-admin-border-light hover:bg-admin-surface-alt cursor-pointer"
                                            onClick={() => setDetailOrder(order)}
                                        >
                                            <td className="p-4 font-mono text-xs text-ink">{shortOrderId(order.id)}</td>
                                            <td className="p-4">
                                                <p className="font-medium text-ink">{order.shipping?.name}</p>
                                                <p className="text-xs text-admin-muted">{order.shipping?.phone}</p>
                                            </td>
                                            <td className="p-4 font-semibold text-ink whitespace-nowrap">
                                                {formatPrice(order.total)}
                                            </td>
                                            <td className="p-4 text-xs text-admin-muted whitespace-nowrap">
                                                {paymentLabel(order)}
                                            </td>
                                            <td className="p-4">
                                                <OrderStatusBadge status={order.status} />
                                            </td>
                                            <td className="p-4 text-xs text-admin-muted whitespace-nowrap">
                                                {formatOrderDate(order.createdAt, { time: false })}
                                            </td>
                                            <td className="p-4">
                                                <ChevronRight size={16} className="text-primary" />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            <Drawer
                isOpen={!!detailOrder}
                onClose={() => setDetailOrder(null)}
                title={detailOrder ? `Direct ${shortOrderId(detailOrder.id)}` : ''}
                subtitle={detailOrder ? `${formatOrderDate(detailOrder.createdAt)} · ${paymentLabel(detailOrder)}` : ''}
                side="right"
                wide
                admin
            >
                {detailOrder && (
                    <DirectOrderDetailPanel
                        order={detailOrder}
                        adminToken={adminToken}
                        onUpdated={async () => {
                            await fetchDirectOrders({ silent: true });
                            const params = new URLSearchParams({ source: 'direct' });
                            const list = await api.get(`/api/orders/admin/all?${params}`, adminToken);
                            const updated = Array.isArray(list) ? list.find((o) => o.id === detailOrder.id) : null;
                            if (updated) setDetailOrder(updated);
                        }}
                    />
                )}
            </Drawer>
        </div>
    );
}
