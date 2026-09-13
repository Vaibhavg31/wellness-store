import { useEffect, useMemo, useState } from 'react';
import { Mail, Trash2, MessageSquare } from 'lucide-react';
import { api } from '@/services/api';
import { useAdminAuth } from '@/contexts/AuthContext';
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
    AdminSelect,
    AdminClearButton,
} from '@/components/admin/AdminUi';

const READ_FILTERS = [
    { value: 'all', label: 'All messages' },
    { value: 'unread', label: 'Unread' },
    { value: 'read', label: 'Read' },
];

export default function AdminFeedbackPage() {
    const { adminToken } = useAdminAuth();
    const [feedback, setFeedback] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [readFilter, setReadFilter] = useState('all');

    const fetchFeedback = async () => {
        if (!adminToken) return;
        setLoading(true);
        try {
            const data = await api.get('/api/feedback', adminToken);
            setFeedback(Array.isArray(data) ? data : []);
        } catch {
            setFeedback([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFeedback();
    }, [adminToken]);

    const filteredFeedback = useMemo(() => {
        const q = search.trim().toLowerCase();
        return feedback.filter((item) => {
            if (readFilter === 'unread' && item.isRead) return false;
            if (readFilter === 'read' && !item.isRead) return false;
            if (!q) return true;
            return (
                item.name?.toLowerCase().includes(q)
                || item.email?.toLowerCase().includes(q)
                || item.phone?.toLowerCase().includes(q)
                || item.message?.toLowerCase().includes(q)
            );
        });
    }, [feedback, readFilter, search]);

    const markRead = async (id) => {
        if (!adminToken) return;
        await api.put(`/api/feedback/${id}/read`, {}, adminToken);
        fetchFeedback();
    };

    const remove = async (id) => {
        if (!adminToken || !confirm('Delete this message?')) return;
        await api.delete(`/api/feedback/${id}`, adminToken);
        fetchFeedback();
    };

    const unreadCount = feedback.filter((f) => !f.isRead).length;
    const readCount = feedback.filter((f) => f.isRead).length;
    const hasFilters = readFilter !== 'all' || search.trim();

    return (
        <div>
            <AdminPageHeader
                title="Feedback Inbox"
                subtitle="Messages from the contact form and customer inquiries"
            />

            <AdminSummaryGrid
                columns={3}
                stats={[
                    { label: 'Total messages', value: feedback.length },
                    { label: 'Unread', value: unreadCount, color: 'text-turmeric-ink', sub: unreadCount > 0 ? 'Needs attention' : undefined },
                    { label: 'Read', value: readCount, color: 'text-emerald' },
                ]}
            />

            <AdminFilterBar
                footer={hasFilters ? (
                    <>Showing {filteredFeedback.length} of {feedback.length} messages</>
                ) : undefined}
            >
                <AdminSearchInput
                    value={search}
                    onChange={setSearch}
                    placeholder="Search by name, email, phone, message…"
                />
                <AdminSelect
                    value={readFilter}
                    onChange={(e) => setReadFilter(e.target.value)}
                    options={READ_FILTERS}
                    aria-label="Filter by read status"
                />
                {hasFilters && (
                    <AdminClearButton
                        onClick={() => {
                            setSearch('');
                            setReadFilter('all');
                        }}
                    />
                )}
            </AdminFilterBar>

            <AdminTableShell>
                {loading ? (
                    <AdminLoadingState />
                ) : filteredFeedback.length === 0 ? (
                    <AdminEmptyState
                        icon={MessageSquare}
                        title={hasFilters ? 'No messages match your filters' : 'No feedback messages yet'}
                        description={hasFilters ? 'Try adjusting search or filters' : 'Contact form submissions will appear here'}
                    />
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm min-w-[760px]">
                            <thead>
                                <tr className="border-b border-admin-border text-left bg-admin-surface-alt">
                                    <th className="p-4 font-medium text-admin-muted min-w-[180px]">From</th>
                                    <th className="p-4 font-medium text-admin-muted min-w-[320px]">Message</th>
                                    <th className="p-4 font-medium text-admin-muted w-32">Date</th>
                                    <th className="p-4 font-medium text-admin-muted w-24">Status</th>
                                    <th className="p-4 font-medium text-admin-muted w-32" />
                                </tr>
                            </thead>
                            <tbody>
                                {filteredFeedback.map((item) => (
                                    <tr
                                        key={item.id}
                                        className={`border-b border-admin-border-light hover:bg-admin-surface-alt/60 ${!item.isRead ? 'bg-turmeric/5' : ''}`}
                                    >
                                        <td className="p-4 align-top">
                                            <p className="font-medium text-ink">{item.name}</p>
                                            <p className="text-xs text-admin-muted flex items-center gap-1 mt-1 break-all">
                                                <Mail size={11} className="flex-shrink-0" />
                                                {item.email}
                                            </p>
                                            {item.phone && (
                                                <p className="text-xs text-admin-muted mt-0.5">{item.phone}</p>
                                            )}
                                        </td>
                                        <td className="p-4 align-top">
                                            <p className="text-ink leading-relaxed line-clamp-4">{item.message}</p>
                                        </td>
                                        <td className="p-4 align-top text-xs text-admin-muted">
                                            {new Date(item.createdAt).toLocaleString('en-IN', {
                                                day: 'numeric',
                                                month: 'short',
                                                year: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit',
                                            })}
                                        </td>
                                        <td className="p-4 align-top">
                                            <AdminStatusPill tone={item.isRead ? 'muted' : 'warning'}>
                                                {item.isRead ? 'Read' : 'New'}
                                            </AdminStatusPill>
                                        </td>
                                        <td className="p-4 align-top">
                                            <div className="flex items-center gap-2">
                                                {!item.isRead && (
                                                    <button
                                                        type="button"
                                                        onClick={() => markRead(item.id)}
                                                        className="text-xs px-3 py-1.5 bg-emerald/10 text-emerald rounded-full hover:bg-emerald/20 font-medium"
                                                    >
                                                        Mark read
                                                    </button>
                                                )}
                                                <AdminIconButton
                                                    onClick={() => remove(item.id)}
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
