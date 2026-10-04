import { useEffect, useState } from 'react';
import { MapPin, Plus, Star, Trash2, Pencil } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/services/api';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import DeliveryAddressForm from '@/components/checkout/DeliveryAddressForm';
import { formatIndianAddress } from '@/utils/formatAddress';
import { validateDeliveryAddress } from '@/utils/validateAddress';

const MAX_ADDRESSES = 3;

const EMPTY = {
    label: 'Home',
    name: '',
    phone: '',
    address: '',
    landmark: '',
    city: '',
    state: '',
    pincode: '',
};

export default function SavedAddresses() {
    const { token, user, updateUser } = useAuth();
    const [addresses, setAddresses] = useState(user?.addresses || []);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState(EMPTY);
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const atLimit = addresses.length >= MAX_ADDRESSES;

    useEffect(() => {
        if (!token) return;
        api.get('/api/users/addresses', token)
            .then((list) => {
                setAddresses(list);
                updateUser({ addresses: list });
            })
            .catch(() => {});
    }, [token, updateUser]);

    const openNew = () => {
        if (atLimit) {
            setError(`You can save up to ${MAX_ADDRESSES} addresses. Delete one to add another.`);
            return;
        }
        setEditing('new');
        setForm({
            ...EMPTY,
            name: user?.name || '',
            phone: user?.phone || '',
        });
        setErrors({});
        setError('');
    };

    const openEdit = (addr) => {
        setEditing(addr.id);
        setForm({ ...addr });
        setErrors({});
        setError('');
    };

    const save = async () => {
        const addressErrors = validateDeliveryAddress(form);
        if (!form.name?.trim()) addressErrors.name = 'Full name is required';
        setErrors(addressErrors);
        if (Object.keys(addressErrors).length > 0) {
            setError('Please complete all required fields.');
            return;
        }

        setLoading(true);
        setError('');
        try {
            if (editing === 'new') {
                const created = await api.post('/api/users/addresses', form, token);
                const next = [...addresses, created];
                setAddresses(next);
                updateUser({ addresses: next, lastUsedAddressId: created.id });
            } else {
                const updated = await api.put(`/api/users/addresses/${editing}`, form, token);
                const next = addresses.map((a) => (a.id === editing ? updated : a));
                setAddresses(next);
                updateUser({ addresses: next });
            }
            setEditing(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not save address');
        } finally {
            setLoading(false);
        }
    };

    const remove = async (id) => {
        if (!window.confirm('Delete this address?')) return;
        try {
            await api.delete(`/api/users/addresses/${id}`, token);
            const next = addresses.filter((a) => a.id !== id);
            setAddresses(next);
            const lastUsedAddressId = user?.lastUsedAddressId === id
                ? (next[0]?.id ?? null)
                : user?.lastUsedAddressId;
            updateUser({ addresses: next, lastUsedAddressId });
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not delete address');
        }
    };

    const setDefault = async (id) => {
        try {
            const next = await api.put(`/api/users/addresses/${id}/default`, {}, token);
            setAddresses(next);
            updateUser({ addresses: next });
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not update default');
        }
    };

    return (
        <section className="mt-10">
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    <MapPin size={20} className="text-primary" />
                    <h2 className="font-display text-xl text-ink">Saved Addresses</h2>
                </div>
                {!editing && !atLimit && (
                    <Button variant="outline" size="sm" onClick={openNew} className="gap-1.5">
                        <Plus size={14} /> Add address
                    </Button>
                )}
            </div>
            <p className="text-xs text-muted mb-6">
                Save up to {MAX_ADDRESSES} delivery addresses for faster checkout. No phone verification needed.
                {addresses.length > 0 && ` (${addresses.length}/${MAX_ADDRESSES} saved)`}
            </p>

            {error && <p className="text-sm text-danger mb-4" role="alert">{error}</p>}

            {editing ? (
                <div className="bg-canvas rounded-2xl p-6 border border-line/40 space-y-4">
                    <Input label="Label" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="Home, Work…" />
                    <Input label="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} error={errors.name} required />
                    <Input
                        label="Phone (optional)"
                        value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                        placeholder={user?.phone || 'Uses your account mobile at checkout'}
                    />
                    <DeliveryAddressForm value={form} onChange={setForm} errors={errors} />
                    <div className="flex gap-3 pt-2">
                        <Button variant="turmeric" onClick={save} disabled={loading}>{loading ? 'Saving…' : 'Save address'}</Button>
                        <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
                    </div>
                </div>
            ) : addresses.length === 0 ? (
                <div className="bg-canvas rounded-2xl p-8 text-center border border-line/40">
                    <p className="text-muted text-sm mb-4">No saved addresses yet. Add one for faster checkout.</p>
                    <Button variant="turmeric" size="sm" onClick={openNew}>Add your first address</Button>
                </div>
            ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                    {addresses.map((addr) => (
                        <div key={addr.id} className={`bg-canvas rounded-2xl p-5 border ${addr.isDefault ? 'border-primary/30' : 'border-line/40'}`}>
                            <div className="flex items-start justify-between gap-2 mb-2">
                                <div>
                                    <p className="font-medium text-ink flex items-center gap-2">
                                        {addr.label || 'Address'}
                                        {addr.isDefault && (
                                            <span className="text-[10px] uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-full">Default</span>
                                        )}
                                        {user?.lastUsedAddressId === addr.id && (
                                            <span className="text-[10px] uppercase tracking-wider text-muted bg-line/40 px-2 py-0.5 rounded-full">Last used</span>
                                        )}
                                    </p>
                                    <p className="text-xs text-muted">
                                        {addr.name}
                                        {addr.phone ? ` · ${addr.phone}` : ''}
                                    </p>
                                </div>
                                <div className="flex gap-1">
                                    <button type="button" onClick={() => openEdit(addr)} className="p-2 text-muted hover:text-primary" aria-label="Edit">
                                        <Pencil size={14} />
                                    </button>
                                    <button type="button" onClick={() => remove(addr.id)} className="p-2 text-muted hover:text-danger" aria-label="Delete">
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                            <p className="text-sm text-ink leading-relaxed">{formatIndianAddress(addr)}</p>
                            {!addr.isDefault && (
                                <button type="button" onClick={() => setDefault(addr.id)} className="mt-3 text-xs text-primary hover:text-primary-hover inline-flex items-center gap-1">
                                    <Star size={12} /> Set as default
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {atLimit && !editing && (
                <p className="text-xs text-muted mt-4">
                    Maximum {MAX_ADDRESSES} addresses saved. Delete one to add another.
                </p>
            )}
        </section>
    );
}
