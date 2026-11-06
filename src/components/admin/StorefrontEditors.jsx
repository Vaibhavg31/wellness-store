import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import ProductSearchSelect from '@/components/admin/ProductSearchSelect';
import { AdminField, ImageUploadField, VideoUploadField } from '@/components/admin/ContentEditor';
import { RIBBON_ICONS, defaultRibbonItems } from '@/components/home/FeatureRibbon';
import { CONCERN_ICONS } from '@/components/layout/ShopRibbon';
import { DEFAULT_CONCERNS, concernSlug } from '@/utils/concerns';
import { DEFAULT_RIBBON_MENU } from '@/utils/ribbonMenu';

const selectClass = 'h-11 rounded-md border border-line-strong bg-surface px-3 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20';
const rowClass = 'space-y-3 rounded-lg border border-admin-border p-4';

/** Move an item up or down within a list. */
const move = (list, from, to) => {
    if (to < 0 || to >= list.length) return list;
    const next = [...list];
    [next[from], next[to]] = [next[to], next[from]];
    return next;
};

function RowTools({ index, count, onMove, onRemove }) {
    return (
        <div className="flex items-center gap-1">
            <button type="button" disabled={index === 0} onClick={() => onMove(index, index - 1)} className="rounded-md p-2 text-admin-muted hover:bg-admin-surface-alt disabled:opacity-30" aria-label="Move up"><ArrowUp size={15} /></button>
            <button type="button" disabled={index === count - 1} onClick={() => onMove(index, index + 1)} className="rounded-md p-2 text-admin-muted hover:bg-admin-surface-alt disabled:opacity-30" aria-label="Move down"><ArrowDown size={15} /></button>
            <button type="button" onClick={onRemove} className="rounded-md p-2 text-danger hover:bg-danger-tint" aria-label="Remove"><Trash2 size={15} /></button>
        </div>
    );
}

/** The five items of the top ribbon: a new name for each and a switch to hide it. */
export function RibbonMenuEditor({ extras, onChange }) {
    const saved = extras.ribbonMenu ?? [];
    const rows = DEFAULT_RIBBON_MENU.map((base) => {
        const own = saved.find((s) => s.key === base.key);
        return { key: base.key, label: own?.label ?? '', enabled: own ? own.enabled !== false : true, fallback: base.label };
    });
    const patch = (key, change) => onChange({ ribbonMenu: rows.map((r) => ({ key: r.key, label: r.label, enabled: r.enabled, ...(r.key === key ? change : {}) })) });
    return (
        <div className="space-y-3">
            {rows.map((row) => (
                <div key={row.key} className="grid items-end gap-3 sm:grid-cols-[1fr_auto]">
                    <AdminField label={row.fallback} hint={row.key === 'new' ? 'Phone menu only. On desktop this spot is always the Shop link.' : 'Leave empty to keep the standard name.'}>
                        <Input value={row.label} maxLength={24} placeholder={row.fallback} onChange={(e) => patch(row.key, { label: e.target.value })} />
                    </AdminField>
                    <label className="flex h-11 items-center gap-2 text-sm"><input type="checkbox" className="size-4 accent-primary" checked={row.enabled} onChange={(e) => patch(row.key, { enabled: e.target.checked })} /> Show</label>
                </div>
            ))}
        </div>
    );
}

/** The health goals in the Concern menu: switch each on or off, rename it, change its keywords and picture. */
export function ConcernsEditor({ extras, onChange, adminToken }) {
    const list = extras.concerns?.length ? extras.concerns : null;
    if (!list) {
        return (
            <div className="space-y-3">
                <p className="text-sm text-admin-muted">The Concern menu is showing the starting list of 14. Copy it here to switch items off, rename them or add pictures.</p>
                <Button variant="outline" size="sm" onClick={() => onChange({ concerns: DEFAULT_CONCERNS.map((c) => ({ ...c })) })}>Edit the list</Button>
            </div>
        );
    }
    const set = (next) => onChange({ concerns: next });
    const patch = (i, change) => set(list.map((c, x) => (x === i ? { ...c, ...change } : c)));
    return (
        <div className="space-y-3">
            {list.map((c, i) => (
                <div key={`${c.slug || c.label}-${i}`} className={rowClass}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" className="size-4 accent-primary" checked={c.enabled !== false} onChange={(e) => patch(i, { enabled: e.target.checked })} /> {c.enabled !== false ? 'Showing' : 'Hidden'}</label>
                        <RowTools index={i} count={list.length} onMove={(a, b) => set(move(list, a, b))} onRemove={() => set(list.filter((_, x) => x !== i))} />
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                        <AdminField label="Name"><Input value={c.label} maxLength={40} onChange={(e) => patch(i, { label: e.target.value, slug: concernSlug(e.target.value) })} /></AdminField>
                        <AdminField label="Keywords" hint="Products with these words (or ticked for this concern on the product page) appear on its page."><Input value={c.search} maxLength={160} placeholder="digest, gut, aloe" onChange={(e) => patch(i, { search: e.target.value })} /></AdminField>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-[12rem_1fr]">
                        <AdminField label="Icon (when no picture)">
                            <select className={selectClass} value={c.icon || 'leaf'} onChange={(e) => patch(i, { icon: e.target.value })}>
                                {Object.keys(CONCERN_ICONS).map((k) => <option key={k} value={k}>{k}</option>)}
                            </select>
                        </AdminField>
                        <ImageUploadField label="Picture (optional)" value={c.image} onChange={(v) => patch(i, { image: v })} adminToken={adminToken} />
                    </div>
                </div>
            ))}
            {list.length < 24 && <Button variant="outline" size="sm" onClick={() => set([...list, { label: '', slug: '', search: '', icon: 'leaf', image: '', enabled: true }])}><Plus size={14} /> Add a concern</Button>}
            <div><button type="button" onClick={() => { if (confirm('Go back to the starting list of 14? Your edits to this list are lost.')) set([]); }} className="text-xs text-admin-muted underline">Reset to the starting list</button></div>
        </div>
    );
}

/** The running promise ribbon under the banner. */
export function FeatureRibbonEditor({ content, onChange }) {
    const custom = content.extras.ribbon?.items ?? [];
    const items = custom.length ? custom : null;
    const set = (next) => onChange({ ribbon: { items: next } });
    if (!items) {
        return (
            <div className="space-y-3">
                <p className="text-sm text-admin-muted">Showing the standard ribbon (free delivery, secure payments, pure herbs, lab tested, returns), built from your delivery settings.</p>
                <Button variant="outline" size="sm" onClick={() => set(defaultRibbonItems(content))}>Edit the ribbon</Button>
            </div>
        );
    }
    const patch = (i, change) => set(items.map((it, x) => (x === i ? { ...it, ...change } : it)));
    return (
        <div className="space-y-3">
            {items.map((it, i) => (
                <div key={i} className={rowClass}>
                    <div className="flex justify-end"><RowTools index={i} count={items.length} onMove={(a, b) => set(move(items, a, b))} onRemove={() => set(items.filter((_, x) => x !== i))} /></div>
                    <div className="grid gap-3 sm:grid-cols-[10rem_1fr_1.4fr]">
                        <AdminField label="Icon"><select className={selectClass} value={it.icon} onChange={(e) => patch(i, { icon: e.target.value })}>{Object.keys(RIBBON_ICONS).map((k) => <option key={k} value={k}>{k}</option>)}</select></AdminField>
                        <AdminField label="Title"><Input value={it.title} maxLength={30} onChange={(e) => patch(i, { title: e.target.value })} /></AdminField>
                        <AdminField label="Small line"><Input value={it.sub} maxLength={60} onChange={(e) => patch(i, { sub: e.target.value })} /></AdminField>
                    </div>
                </div>
            ))}
            {items.length < 8 && <Button variant="outline" size="sm" onClick={() => set([...items, { icon: 'check', title: '', sub: '' }])}><Plus size={14} /> Add item</Button>}
            <div><button type="button" onClick={() => { if (confirm('Go back to the standard ribbon?')) set([]); }} className="text-xs text-admin-muted underline">Reset to the standard ribbon</button></div>
        </div>
    );
}

/** "Trending now": search words under the banner. */
export function TrendingEditor({ extras, onChange }) {
    const t = extras.trending;
    const set = (patch) => onChange({ trending: { ...t, ...patch } });
    const patchWord = (i, change) => set({ keywords: t.keywords.map((k, x) => (x === i ? { ...k, ...change } : k)) });
    return (
        <div className="space-y-4">
            <AdminField label="Heading"><Input value={t.title} maxLength={40} onChange={(e) => set({ title: e.target.value })} /></AdminField>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="size-4 accent-primary" checked={t.auto} onChange={(e) => set({ auto: e.target.checked })} /> When the list below is empty, build it from the products (ingredients and key words)</label>
            <div className="space-y-2">
                {t.keywords.map((k, i) => (
                    <div key={i} className="grid items-end gap-3 sm:grid-cols-[1fr_1fr_auto]">
                        <AdminField label={i === 0 ? 'Shown as' : undefined}><Input value={k.label} maxLength={30} placeholder="ashwagandha" onChange={(e) => patchWord(i, { label: e.target.value })} /></AdminField>
                        <AdminField label={i === 0 ? 'Searches for' : undefined}><Input value={k.query} maxLength={60} placeholder="ashwagandha" onChange={(e) => patchWord(i, { query: e.target.value })} /></AdminField>
                        <RowTools index={i} count={t.keywords.length} onMove={(a, b) => set({ keywords: move(t.keywords, a, b) })} onRemove={() => set({ keywords: t.keywords.filter((_, x) => x !== i) })} />
                    </div>
                ))}
                {t.keywords.length < 16 && <Button variant="outline" size="sm" onClick={() => set({ keywords: [...t.keywords, { label: '', query: '' }] })}><Plus size={14} /> Add a word</Button>}
            </div>
        </div>
    );
}

/** "Watch & Shop": the videos on the homepage, each tied to the product it sells. */
export function WatchShopEditor({ extras, onChange, adminToken, products }) {
    const w = extras.watchShop;
    const set = (patch) => onChange({ watchShop: { ...w, ...patch } });
    const patchReel = (i, change) => set({ reels: w.reels.map((r, x) => (x === i ? { ...r, ...change } : r)) });
    return (
        <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
                <AdminField label="Heading"><Input value={w.title} maxLength={40} onChange={(e) => set({ title: e.target.value })} /></AdminField>
                <AdminField label="Line under it"><Input value={w.subtitle} maxLength={140} onChange={(e) => set({ subtitle: e.target.value })} /></AdminField>
            </div>
            <p className="text-xs text-admin-muted">Tall (9:16) videos from a phone work best: MP4, a few MB. Each one gets an “Add to bag” button for its product. The section hides itself when there are no videos.</p>
            {w.reels.map((r, i) => (
                <div key={r.id || i} className={rowClass}>
                    <div className="flex justify-end"><RowTools index={i} count={w.reels.length} onMove={(a, b) => set({ reels: move(w.reels, a, b) })} onRemove={() => set({ reels: w.reels.filter((_, x) => x !== i) })} /></div>
                    <AdminField label="Title"><Input value={r.title} maxLength={80} onChange={(e) => patchReel(i, { title: e.target.value })} /></AdminField>
                    <VideoUploadField label="Video" value={r.videoUrl} onChange={({ url }) => patchReel(i, { videoUrl: url })} adminToken={adminToken} />
                    <ImageUploadField label="Cover picture" hint="Shown before the video plays." value={r.poster} onChange={(v) => patchReel(i, { poster: v })} adminToken={adminToken} />
                    <AdminField label="Product it sells"><ProductSearchSelect products={products} value={r.productId} onChange={(id) => patchReel(i, { productId: id })} placeholder="Search product…" emptyOptionLabel="No product" /></AdminField>
                </div>
            ))}
            {w.reels.length < 12 && <Button variant="outline" size="sm" onClick={() => set({ reels: [...w.reels, { id: `reel-${Date.now().toString(36)}`, title: '', videoUrl: '', poster: '', productId: '' }] })}><Plus size={14} /> Add a video</Button>}
        </div>
    );
}

/** "Most loved products": the shelf before the offers. Automatic, or the products the admin picks, in order. */
export function BestSellersEditor({ extras, onChange, products }) {
    const b = extras.bestSellers;
    const set = (patch) => onChange({ bestSellers: { ...b, ...patch } });
    const ids = b.productIds ?? [];
    return (
        <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
                <AdminField label="Heading"><Input value={b.title} maxLength={40} onChange={(e) => set({ title: e.target.value })} /></AdminField>
                <AdminField label="Line under it"><Input value={b.subtitle} maxLength={140} onChange={(e) => set({ subtitle: e.target.value })} /></AdminField>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
                <AdminField label="Which products">
                    <select className={selectClass} value={b.mode} onChange={(e) => set({ mode: e.target.value })}>
                        <option value="auto">Automatic: Trending products, then Best sellers</option>
                        <option value="custom">I choose the products</option>
                    </select>
                </AdminField>
                {b.mode === 'auto' && (
                    <AdminField label="How many" hint="2 to 8; 4 sits neatly in one row on a computer.">
                        <Input type="number" min="2" max="8" value={b.count} onChange={(e) => set({ count: e.target.value })} />
                    </AdminField>
                )}
            </div>
            {b.mode === 'auto' && <p className="text-xs text-admin-muted">Mark a product “Trending” or “Best seller” on its product page to put it here. Out-of-stock products move to the end.</p>}
            {b.mode === 'custom' && (
                <div className="space-y-2">
                    {ids.map((id, i) => (
                        <div key={i} className="grid items-end gap-3 sm:grid-cols-[1fr_auto]">
                            <AdminField label={i === 0 ? 'Product' : undefined}><ProductSearchSelect products={products} value={id} onChange={(next) => set({ productIds: ids.map((x, n) => (n === i ? next : x)) })} placeholder="Search product…" emptyOptionLabel="No product" /></AdminField>
                            <RowTools index={i} count={ids.length} onMove={(a, c) => set({ productIds: move(ids, a, c) })} onRemove={() => set({ productIds: ids.filter((_, n) => n !== i) })} />
                        </div>
                    ))}
                    {ids.length < 8 && <Button variant="outline" size="sm" onClick={() => set({ productIds: [...ids, ''] })}><Plus size={14} /> Add a product</Button>}
                    <p className="text-xs text-admin-muted">Needs at least 2 products with a photo, or the shelf hides itself.</p>
                </div>
            )}
        </div>
    );
}
