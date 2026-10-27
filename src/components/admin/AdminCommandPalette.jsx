import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { CornerDownLeft, Package, Search, ShoppingBag } from 'lucide-react';
import { api } from '@/services/api';
import { ADMIN_PATH, useAdminAuth } from '@/contexts/AuthContext';
import { useDialog } from '@/hooks/useDialog';
import { adminNavItems } from '@/components/admin/AdminNavLinks';
import { shortOrderId } from '@/constants/orders';
import { cn } from '@/utils/formatPrice';

const MAX_RESULTS = 8;

function Palette({ onClose }) {
    const navigate = useNavigate();
    const { adminToken } = useAdminAuth();
    const panelRef = useDialog(true, onClose);
    const [query, setQuery] = useState('');
    const [active, setActive] = useState(0);
    const [data, setData] = useState({ products: [], orders: [] });

    // Load the searchable lists once, when the palette opens.
    useEffect(() => {
        if (!adminToken) return;
        Promise.allSettled([api.get('/api/products/admin/all', adminToken), api.get('/api/orders/admin/all', adminToken)]).then(([p, o]) => {
            setData({
                products: p.status === 'fulfilled' && Array.isArray(p.value) ? p.value : [],
                orders: o.status === 'fulfilled' && Array.isArray(o.value) ? o.value : [],
            });
        });
    }, [adminToken]);

    const results = useMemo(() => {
        const q = query.trim().toLowerCase();
        const pages = adminNavItems.map((item) => ({ key: item.href, group: 'Go to', label: item.label, icon: item.icon, to: item.href }));
        if (!q) return pages.slice(0, MAX_RESULTS);

        const pageHits = pages.filter((p) => p.label.toLowerCase().includes(q));
        const productHits = data.products
            .filter((p) => `${p.title} ${p.id} ${p.category}`.toLowerCase().includes(q))
            .map((p) => ({ key: `p-${p.id}`, group: 'Products', label: p.title, hint: `₹${p.price} · stock ${p.stock}`, icon: Package, to: `${ADMIN_PATH}/products/${p.id}` }));
        const orderHits = data.orders
            .filter((o) => `${o.id} ${o.email} ${o.shipping?.name} ${o.shipping?.phone}`.toLowerCase().includes(q))
            .map((o) => ({ key: `o-${o.id}`, group: 'Orders', label: `${shortOrderId(o.id)} · ${o.shipping?.name || o.email}`, hint: `₹${o.total} · ${o.status}`, icon: ShoppingBag, to: `${ADMIN_PATH}/orders?search=${encodeURIComponent(o.id)}` }));
        return [...pageHits, ...productHits.slice(0, 5), ...orderHits.slice(0, 5)].slice(0, MAX_RESULTS + 2);
    }, [query, data]);

    useEffect(() => setActive(0), [query]);

    const go = useCallback((item) => {
        onClose();
        navigate(item.to);
    }, [navigate, onClose]);

    const onKeyDown = (event) => {
        if (event.key === 'ArrowDown') { event.preventDefault(); setActive((i) => Math.min(i + 1, results.length - 1)); }
        else if (event.key === 'ArrowUp') { event.preventDefault(); setActive((i) => Math.max(i - 1, 0)); }
        else if (event.key === 'Enter' && results[active]) { event.preventDefault(); go(results[active]); }
    };

    const listRef = useRef(null);
    useEffect(() => {
        listRef.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' });
    }, [active, results]);

    return createPortal(
        <div className="admin-panel fixed inset-0 z-[100]">
            <div className="absolute inset-0 animate-fade-in bg-ink/50" onClick={onClose} aria-hidden="true" />
            <div
                ref={panelRef}
                role="dialog"
                aria-modal="true"
                aria-label="Quick search"
                tabIndex={-1}
                className="relative mx-auto mt-[12vh] w-[min(40rem,calc(100%-2rem))] animate-fade-up overflow-hidden rounded-xl border border-admin-border bg-admin-surface shadow-lg focus:outline-none"
            >
                <div className="flex items-center gap-3 border-b border-admin-border px-4">
                    <Search size={18} className="shrink-0 text-admin-muted" aria-hidden="true" />
                    <input
                        autoFocus
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={onKeyDown}
                        placeholder="Jump to a page, product or order…"
                        role="combobox"
                        aria-expanded="true"
                        aria-controls="admin-palette-list"
                        aria-activedescendant={results[active] ? `palette-${results[active].key}` : undefined}
                        aria-label="Search the admin"
                        className="h-12 w-full bg-transparent text-body text-ink placeholder:text-subtle focus:outline-none"
                    />
                    <kbd className="hidden shrink-0 rounded border border-admin-border px-1.5 py-0.5 text-caption text-admin-muted sm:block">Esc</kbd>
                </div>

                <ul id="admin-palette-list" ref={listRef} role="listbox" className="max-h-[50vh] overflow-y-auto p-2">
                    {results.length === 0 && <li className="px-3 py-8 text-center text-small text-admin-muted">Nothing found for “{query}”.</li>}
                    {results.map((item, i) => {
                        const showGroup = i === 0 || results[i - 1].group !== item.group;
                        return (
                            <li key={item.key} role="presentation">
                                {showGroup && <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-admin-muted">{item.group}</p>}
                                <div
                                    id={`palette-${item.key}`}
                                    role="option"
                                    aria-selected={i === active}
                                    onMouseMove={() => setActive(i)}
                                    onClick={() => go(item)}
                                    className={cn('flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5', i === active ? 'bg-primary-tint text-primary-deep' : 'text-ink')}
                                >
                                    <item.icon size={17} strokeWidth={1.75} className="shrink-0 text-primary" aria-hidden="true" />
                                    <span className="min-w-0 flex-1 truncate text-small font-medium">{item.label}</span>
                                    {item.hint && <span className="shrink-0 text-caption text-admin-muted">{item.hint}</span>}
                                    {i === active && <CornerDownLeft size={14} className="shrink-0 text-admin-muted" aria-hidden="true" />}
                                </div>
                            </li>
                        );
                    })}
                </ul>
            </div>
        </div>,
        document.body,
    );
}

/** Ctrl/⌘ + K opens a quick-jump palette; `children` receives `open` to render a visible trigger button. */
export default function AdminCommandPalette({ children }) {
    const [isOpen, setIsOpen] = useState(false);
    const open = useCallback(() => setIsOpen(true), []);
    const close = useCallback(() => setIsOpen(false), []);

    useEffect(() => {
        const onKey = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                setIsOpen((v) => !v);
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);

    return (
        <>
            {children?.(open)}
            {isOpen && <Palette onClose={close} />}
        </>
    );
}
