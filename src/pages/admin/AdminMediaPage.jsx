import { useEffect, useMemo, useRef, useState } from 'react';
import { Images, Trash2, Copy, Upload, Check } from 'lucide-react';
import { api, imageUrl } from '@/services/api';
import { useAdminAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import {
    AdminPageHeader,
    AdminSummaryGrid,
    AdminFilterBar,
    AdminSearchInput,
    AdminLoadingState,
    AdminEmptyState,
    AdminIconButton,
} from '@/components/admin/AdminUi';
import Button from '@/components/ui/Button';

function formatSize(bytes) {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function AdminMediaPage() {
    const { adminToken } = useAdminAuth();
    const { showToast } = useToast();
    const [media, setMedia] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [uploading, setUploading] = useState(false);
    const [copiedId, setCopiedId] = useState(null);
    const fileInputRef = useRef(null);

    const fetchMedia = async () => {
        if (!adminToken) return;
        setLoading(true);
        try {
            const data = await api.get('/api/media', adminToken);
            setMedia(Array.isArray(data) ? data : []);
        } catch {
            setMedia([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMedia();
    }, [adminToken]);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return media;
        return media.filter((m) => m.filename?.toLowerCase().includes(q));
    }, [media, search]);

    const totalSize = media.reduce((sum, m) => sum + (m.sizeBytes || 0), 0);

    const handleUpload = async (e) => {
        if (!adminToken || !e.target.files?.length) return;
        setUploading(true);
        try {
            await api.upload(Array.from(e.target.files), adminToken);
            showToast('Uploaded successfully', 'success');
            fetchMedia();
        } catch {
            showToast('Upload failed', 'error');
        } finally {
            setUploading(false);
            e.target.value = '';
        }
    };

    const remove = async (item) => {
        if (!adminToken || !confirm(`Delete "${item.filename}"? This cannot be undone.`)) return;
        try {
            await api.delete(`/api/media/${item.id}`, adminToken);
            setMedia((prev) => prev.filter((m) => m.id !== item.id));
            showToast('Deleted', 'success');
        } catch {
            showToast('Failed to delete', 'error');
        }
    };

    const copyUrl = async (item) => {
        try {
            await navigator.clipboard.writeText(imageUrl(item.url));
            setCopiedId(item.id);
            setTimeout(() => setCopiedId(null), 1500);
        } catch {
            showToast('Could not copy URL', 'error');
        }
    };

    return (
        <div>
            <AdminPageHeader
                title="Media Library"
                subtitle="Every image uploaded through the admin panel — products, banners, and site content"
                actions={
                    <>
                        <Button className="gap-2" disabled={uploading} onClick={() => fileInputRef.current?.click()}>
                            <Upload size={15} />
                            {uploading ? 'Uploading…' : 'Upload'}
                        </Button>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            multiple
                            className="hidden"
                            onChange={handleUpload}
                            disabled={uploading}
                        />
                    </>
                }
            />

            <AdminSummaryGrid
                columns={3}
                stats={[
                    { label: 'Total files', value: media.length },
                    { label: 'Storage used', value: formatSize(totalSize) || '0 B' },
                    { label: 'Showing', value: filtered.length },
                ]}
            />

            <AdminFilterBar>
                <AdminSearchInput value={search} onChange={setSearch} placeholder="Search by filename…" />
            </AdminFilterBar>

            {loading ? (
                <AdminLoadingState />
            ) : filtered.length === 0 ? (
                <AdminEmptyState
                    icon={Images}
                    title={search ? 'No files match your search' : 'No media yet'}
                    description={search ? 'Try a different search term' : 'Files you upload anywhere in the admin panel will appear here'}
                />
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {filtered.map((item) => (
                        <div key={item.id} className="admin-table-shell overflow-hidden group">
                            <div className="aspect-square bg-admin-surface-alt relative">
                                {item.mimeType?.startsWith('video/') ? (
                                    <video
                                        src={imageUrl(item.url)}
                                        className="w-full h-full object-cover"
                                        muted
                                        playsInline
                                        preload="metadata"
                                    />
                                ) : (
                                    <img
                                        src={imageUrl(item.url)}
                                        alt={item.altText || item.filename}
                                        className="w-full h-full object-cover"
                                        loading="lazy"
                                    />
                                )}
                                <div className="absolute inset-0 bg-ink/0 group-hover:bg-ink/40 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                                    <AdminIconButton
                                        onClick={() => copyUrl(item)}
                                        icon={copiedId === item.id ? Check : Copy}
                                        title="Copy URL"
                                        className="bg-cream"
                                    />
                                    <AdminIconButton
                                        onClick={() => remove(item)}
                                        icon={Trash2}
                                        variant="danger"
                                        title="Delete"
                                        className="bg-cream"
                                    />
                                </div>
                            </div>
                            <div className="p-2.5">
                                <p className="text-xs text-ink truncate" title={item.filename}>{item.filename}</p>
                                <p className="text-[11px] text-admin-muted mt-0.5">{formatSize(item.sizeBytes)}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
