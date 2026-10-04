import { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, X, Trash2, Star, MessageSquare, ShieldCheck } from 'lucide-react';
import { api, imageUrl } from '@/services/api';
import { useAdminAuth } from '@/contexts/AuthContext';
import ProductSearchSelect from '@/components/admin/ProductSearchSelect';
import {
    AdminPageHeader,
    AdminSummaryGrid,
    AdminFilterBar,
    AdminSearchInput,
    AdminTableShell,
    AdminLoadingState,
    AdminEmptyState,
    AdminIconButton,
    AdminStatusPill,
} from '@/components/admin/AdminUi';

const STATUS_FILTERS = [
    { value: 'all', label: 'All reviews' },
    { value: 'pending', label: 'Pending' },
    { value: 'approved', label: 'Approved' },
];

function StarRating({ rating }) {
    return (
        <span className="inline-flex items-center gap-0.5 text-accent" aria-label={`${rating} out of 5 stars`}>
            {Array.from({ length: 5 }, (_, i) => (
                <Star
                    key={i}
                    size={12}
                    className={i < rating ? 'fill-accent text-accent' : 'text-sand'}
                />
            ))}
        </span>
    );
}

export default function AdminReviewsPage() {
    const { adminToken } = useAdminAuth();
    const [reviews, setReviews] = useState([]);
    const [products, setProducts] = useState([]);
    const [productFilter, setProductFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);

    const fetchReviews = useCallback(async () => {
        if (!adminToken) return;
        setLoading(true);
        try {
            const data = await api.get('/api/reviews/admin/all', adminToken);
            setReviews(Array.isArray(data) ? data : []);
        } catch {
            setReviews([]);
        } finally {
            setLoading(false);
        }
    }, [adminToken]);

    const fetchProducts = useCallback(async () => {
        if (!adminToken) return;
        try {
            const data = await api.get('/api/products/admin/all', adminToken);
            setProducts(Array.isArray(data) ? data : []);
        } catch {
            setProducts([]);
        }
    }, [adminToken]);

    useEffect(() => {
        fetchReviews();
        fetchProducts();
    }, [fetchReviews, fetchProducts]);

    const productById = useMemo(
        () => new Map(products.map((p) => [p.id, p])),
        [products],
    );

    const filteredReviews = useMemo(() => {
        const q = search.trim().toLowerCase();
        return reviews.filter((r) => {
            if (productFilter && r.productId !== productFilter) return false;
            if (statusFilter === 'pending' && r.isApproved) return false;
            if (statusFilter === 'approved' && !r.isApproved) return false;
            if (!q) return true;
            return (
                r.name?.toLowerCase().includes(q)
                || r.email?.toLowerCase().includes(q)
                || r.comment?.toLowerCase().includes(q)
                || productById.get(r.productId)?.title?.toLowerCase().includes(q)
            );
        });
    }, [reviews, productFilter, statusFilter, search, productById]);

    const approve = async (id) => {
        if (!adminToken) return;
        await api.put(`/api/reviews/${id}/approve`, {}, adminToken);
        fetchReviews();
    };

    const reject = async (id) => {
        if (!adminToken) return;
        await api.put(`/api/reviews/${id}/reject`, {}, adminToken);
        fetchReviews();
    };

    const remove = async (id) => {
        if (!adminToken || !confirm('Delete this review?')) return;
        await api.delete(`/api/reviews/${id}`, adminToken);
        fetchReviews();
    };

    const getProductLabel = (productId) => {
        const product = productById.get(productId);
        return product?.title || productId;
    };

    const pendingCount = reviews.filter((r) => !r.isApproved).length;
    const approvedCount = reviews.filter((r) => r.isApproved).length;
    const avgRating = reviews.length
        ? (reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length).toFixed(1)
        : '—';

    const hasFilters = productFilter || statusFilter !== 'all' || search.trim();

    return (
        <div>
            <AdminPageHeader
                title="Reviews"
                subtitle="Moderate customer reviews before they appear on the website"
            />

            <AdminSummaryGrid
                columns={4}
                stats={[
                    { label: 'Total reviews', value: reviews.length },
                    { label: 'Pending', value: pendingCount, color: 'text-accent-ink', sub: pendingCount > 0 ? 'Needs action' : undefined },
                    { label: 'Approved', value: approvedCount, color: 'text-primary' },
                    { label: 'Average rating', value: avgRating, color: 'text-primary' },
                ]}
            />

            <AdminFilterBar
                footer={hasFilters ? (
                    <>Showing {filteredReviews.length} of {reviews.length} reviews</>
                ) : undefined}
            >
                <AdminSearchInput
                    value={search}
                    onChange={setSearch}
                    placeholder="Search by name, email, comment, product…"
                />
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="text-sm border border-admin-border rounded-lg px-3 py-2 bg-admin-surface min-w-[9rem]"
                >
                    {STATUS_FILTERS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                </select>
                <div className="min-w-[12rem] lg:min-w-[14rem]">
                    <ProductSearchSelect
                        products={products}
                        value={productFilter}
                        onChange={setProductFilter}
                        placeholder="Filter by product…"
                        emptyOptionLabel="All products"
                        publishedOnly={false}
                    />
                </div>
                {hasFilters && (
                    <button
                        type="button"
                        onClick={() => {
                            setSearch('');
                            setStatusFilter('all');
                            setProductFilter('');
                        }}
                        className="inline-flex items-center gap-1 text-sm text-admin-muted hover:text-ink px-2 py-2 shrink-0"
                    >
                        <X size={14} /> Clear
                    </button>
                )}
            </AdminFilterBar>

            <AdminTableShell>
                {loading ? (
                    <AdminLoadingState />
                ) : filteredReviews.length === 0 ? (
                    <AdminEmptyState
                        icon={MessageSquare}
                        title={hasFilters ? 'No reviews match your filters' : 'No reviews yet'}
                        description={hasFilters ? 'Try adjusting search or filters' : 'Customer reviews will appear here for moderation'}
                    />
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm min-w-[800px]">
                            <thead>
                                <tr className="border-b border-admin-border text-left bg-admin-surface-alt">
                                    <th className="p-4 font-medium text-admin-muted min-w-[160px]">Customer</th>
                                    <th className="p-4 font-medium text-admin-muted w-24">Rating</th>
                                    <th className="p-4 font-medium text-admin-muted min-w-[280px]">Review</th>
                                    <th className="p-4 font-medium text-admin-muted min-w-[140px]">Product</th>
                                    <th className="p-4 font-medium text-admin-muted w-28">Date</th>
                                    <th className="p-4 font-medium text-admin-muted w-24">Status</th>
                                    <th className="p-4 font-medium text-admin-muted w-28" />
                                </tr>
                            </thead>
                            <tbody>
                                {filteredReviews.map((review) => (
                                    <tr key={review.id} className="border-b border-admin-border-light hover:bg-admin-surface-alt/60">
                                        <td className="p-4 align-top">
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                <p className="font-medium text-ink">{review.name}</p>
                                                {review.isVerifiedPurchase && (
                                                    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded-full" title="Confirmed against a real order">
                                                        <ShieldCheck size={10} /> Verified
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-admin-muted mt-0.5 break-all">{review.email}</p>
                                        </td>
                                        <td className="p-4 align-top">
                                            <StarRating rating={review.rating} />
                                            <p className="text-xs text-admin-muted mt-1">{review.rating}/5</p>
                                        </td>
                                        <td className="p-4 align-top">
                                            <p className="text-ink leading-relaxed line-clamp-3">{review.comment}</p>
                                            {review.images?.length > 0 && (
                                                <div className="flex gap-1.5 mt-2">
                                                    {review.images.map((src) => (
                                                        <a key={src} href={imageUrl(src)} target="_blank" rel="noopener noreferrer" className="block w-10 h-10 rounded-md overflow-hidden border border-admin-border flex-shrink-0">
                                                            <img src={imageUrl(src)} alt="Review attachment" className="w-full h-full object-cover" />
                                                        </a>
                                                    ))}
                                                </div>
                                            )}
                                        </td>
                                        <td className="p-4 align-top">
                                            <p className="text-ink line-clamp-2">{getProductLabel(review.productId)}</p>
                                        </td>
                                        <td className="p-4 align-top text-admin-muted text-xs">
                                            {new Date(review.createdAt).toLocaleDateString('en-IN', {
                                                day: 'numeric',
                                                month: 'short',
                                                year: 'numeric',
                                            })}
                                        </td>
                                        <td className="p-4 align-top">
                                            <AdminStatusPill tone={review.isApproved ? 'success' : 'warning'}>
                                                {review.isApproved ? 'Approved' : 'Pending'}
                                            </AdminStatusPill>
                                        </td>
                                        <td className="p-4 align-top">
                                            <div className="flex items-center gap-1">
                                                {!review.isApproved && (
                                                    <AdminIconButton
                                                        onClick={() => approve(review.id)}
                                                        icon={Check}
                                                        variant="success"
                                                        title="Approve"
                                                    />
                                                )}
                                                {review.isApproved && (
                                                    <AdminIconButton
                                                        onClick={() => reject(review.id)}
                                                        icon={X}
                                                        variant="warning"
                                                        title="Unapprove"
                                                    />
                                                )}
                                                <AdminIconButton
                                                    onClick={() => remove(review.id)}
                                                    icon={Trash2}
                                                    variant="danger"
                                                    title="Delete"
                                                />
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </AdminTableShell>
        </div>
    );
}
