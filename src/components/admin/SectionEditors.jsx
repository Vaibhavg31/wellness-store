import { useMemo } from 'react';
import { Plus, RotateCcw, Trash2, X } from 'lucide-react';
import Input from '@/components/ui/Input';
import { AdminSelect } from '@/components/admin/AdminUi';
import { AdminField, AdminTextarea } from '@/components/admin/ContentEditor';
import { DAY_RITUAL } from '@/data/dayRitual';
import { HERB_ATLAS } from '@/data/herbAtlas';
import { FALLBACK_PACK, PACKS } from '@/data/packs';
import { ROUTINES } from '@/data/routines';
import { imageUrl } from '@/services/api';

/**
 * Admin editors for the homepage sections whose text used to live in code: Build Your Routine, Daily Ritual, Know Your
 * Herbs and the look of each pack in Explore in 3D. Each shows what the store is using right now (the built-in
 * suggestion until something is saved), edits it in place, and can go back to the suggestion with one button.
 * Products are always picked from the catalogue, so names, photos and prices stay live.
 */

const ghostButton = 'inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-primary bg-primary/5 hover:bg-primary/10 border border-primary/20';
const iconButton = 'rounded-lg p-1.5 text-admin-muted hover:bg-admin-surface-alt hover:text-danger';

function ProductSelect({ products, value, onChange, label, className }) {
    const options = [{ value: '', label: 'Choose a product…' }, ...products.map((p) => ({ value: p.id, label: p.title }))];
    return <AdminSelect aria-label={label} value={value ?? ''} onChange={(e) => onChange(e.target.value)} className={className ?? 'w-full'} options={options} />;
}

function ResetBar({ custom, onReset, children }) {
    return (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-primary/5 px-3 py-2 text-xs text-admin-muted">
            <span>{custom ? 'You are using your own content.' : 'Showing the suggested content. Edit anything to make it yours.'}</span>
            <span className="flex gap-2">
                {children}
                {custom && <button type="button" onClick={onReset} className="inline-flex items-center gap-1 font-medium text-primary hover:underline"><RotateCcw size={12} /> Reset to suggested</button>}
            </span>
        </div>
    );
}

function Heading({ value, onChange, defaults }) {
    return (
        <div className="grid gap-4 sm:grid-cols-2">
            <AdminField label="Section heading"><Input maxLength={90} value={value.title || defaults.title} onChange={(e) => onChange({ ...value, title: e.target.value })} /></AdminField>
            <AdminField label="Short intro"><Input maxLength={240} value={value.description || defaults.description} onChange={(e) => onChange({ ...value, description: e.target.value })} /></AdminField>
        </div>
    );
}

const clone = (v) => JSON.parse(JSON.stringify(v));

/* ---------------------------------------------------------------- Build Your Routine */

export function RoutinesEditor({ value, onChange, products }) {
    const custom = Boolean(value.goals?.length);
    const goals = custom ? value.goals : clone(ROUTINES.goals);
    const save = (next) => onChange({ ...value, goals: next });
    const setGoal = (i, patch) => save(goals.map((g, j) => (j === i ? { ...g, ...patch } : g)));
    const setStep = (i, k, patch) => setGoal(i, { steps: goals[i].steps.map((s, j) => (j === k ? { ...s, ...patch } : s)) });

    return (
        <div className="space-y-4 pt-3">
            <p className="text-xs text-admin-muted">Shoppers pick a goal and see a routine of your products, with the total price and one button to add it all. Pick products from your catalogue; photos and prices follow automatically.</p>
            <Heading value={value} onChange={onChange} defaults={ROUTINES} />
            <ResetBar custom={custom} onReset={() => onChange({ ...value, goals: [] })} />
            {goals.map((goal, i) => (
                <div key={i} className="space-y-3 rounded-xl border border-admin-border bg-admin-surface p-4">
                    <div className="flex items-start gap-3">
                        <div className="grid flex-1 gap-3 sm:grid-cols-2">
                            <AdminField label="Goal (button text)"><Input maxLength={30} value={goal.label} onChange={(e) => setGoal(i, { label: e.target.value })} /></AdminField>
                            <AdminField label="One-line summary"><Input maxLength={120} value={goal.summary} onChange={(e) => setGoal(i, { summary: e.target.value })} /></AdminField>
                        </div>
                        <button type="button" onClick={() => save(goals.filter((_, j) => j !== i))} aria-label={`Remove ${goal.label}`} className={iconButton}><Trash2 size={16} /></button>
                    </div>
                    {goal.steps.map((step, k) => (
                        <div key={k} className="grid gap-2 rounded-lg bg-admin-surface-alt p-3 sm:grid-cols-[10rem_1fr_auto]">
                            <Input maxLength={24} aria-label="When" placeholder="When (Morning)" value={step.when} onChange={(e) => setStep(i, k, { when: e.target.value })} />
                            <ProductSelect products={products} value={step.productId} onChange={(id) => setStep(i, k, { productId: id })} label={`Step ${k + 1} product`} />
                            <button type="button" onClick={() => setGoal(i, { steps: goal.steps.filter((_, j) => j !== k) })} aria-label="Remove step" className={iconButton}><X size={16} /></button>
                            <div className="sm:col-span-3"><Input maxLength={140} aria-label="Why" placeholder="Why this product (one line)" value={step.why} onChange={(e) => setStep(i, k, { why: e.target.value })} /></div>
                        </div>
                    ))}
                    {goal.steps.length < 4 && <button type="button" onClick={() => setGoal(i, { steps: [...goal.steps, { when: '', productId: '', why: '' }] })} className={ghostButton}><Plus size={14} /> Add a step</button>}
                </div>
            ))}
            {goals.length < 6 && <button type="button" onClick={() => save([...goals, { id: '', label: 'New goal', summary: '', steps: [{ when: 'Morning', productId: '', why: '' }, { when: 'Evening', productId: '', why: '' }] }])} className={ghostButton}><Plus size={14} /> Add a goal</button>}
        </div>
    );
}

/* ---------------------------------------------------------------- Daily ritual */

export function DayRitualEditor({ value, onChange, products }) {
    const custom = Boolean(value.stages?.length);
    const stages = custom ? value.stages : clone(DAY_RITUAL.stages);
    const save = (next) => onChange({ ...value, stages: next });
    const setStage = (i, patch) => save(stages.map((s, j) => (j === i ? { ...s, ...patch } : s)));

    return (
        <div className="space-y-4 pt-3">
            <p className="text-xs text-admin-muted">A scroll story through one day. Each moment features one of your products with an add-to-bag button. It needs at least three moments with products in stock; otherwise it hides itself. The last moment gets a dark background.</p>
            <Heading value={value} onChange={onChange} defaults={DAY_RITUAL} />
            <ResetBar custom={custom} onReset={() => onChange({ ...value, stages: [] })} />
            {stages.map((stage, i) => (
                <div key={i} className="space-y-3 rounded-xl border border-admin-border bg-admin-surface p-4">
                    <div className="flex items-start gap-3">
                        <div className="grid flex-1 gap-3 sm:grid-cols-3">
                            <AdminField label="Moment"><Input maxLength={20} value={stage.label} onChange={(e) => setStage(i, { label: e.target.value })} /></AdminField>
                            <AdminField label="Time"><Input maxLength={16} value={stage.time} onChange={(e) => setStage(i, { time: e.target.value })} /></AdminField>
                            <AdminField label="Product"><ProductSelect products={products} value={stage.productId} onChange={(id) => setStage(i, { productId: id })} label={`${stage.label} product`} /></AdminField>
                        </div>
                        <button type="button" onClick={() => save(stages.filter((_, j) => j !== i))} aria-label={`Remove ${stage.label}`} className={iconButton}><Trash2 size={16} /></button>
                    </div>
                    <AdminField label="Headline"><Input maxLength={60} value={stage.title} onChange={(e) => setStage(i, { title: e.target.value })} /></AdminField>
                    <AdminField label="Short text"><AdminTextarea maxLength={200} rows={2} value={stage.copy} onChange={(e) => setStage(i, { copy: e.target.value })} /></AdminField>
                </div>
            ))}
            {stages.length < 6 && <button type="button" onClick={() => save([...stages, { label: 'New moment', time: '', title: '', copy: '', productId: '' }])} className={ghostButton}><Plus size={14} /> Add a moment</button>}
        </div>
    );
}

/* ---------------------------------------------------------------- Know your herbs */

const HERB_TONES = [
    { value: 'bg-success-tint', label: 'Green' }, { value: 'bg-accent-tint', label: 'Gold' }, { value: 'bg-primary-tint', label: 'Plum' },
    { value: 'bg-info-tint', label: 'Blue' }, { value: 'bg-canvas-alt', label: 'Sand' }, { value: 'bg-warning-tint', label: 'Amber' },
];

export function HerbsEditor({ value, onChange, products }) {
    const custom = Boolean(value.items?.length);
    const items = custom ? value.items : clone(HERB_ATLAS.herbs);
    const save = (next) => onChange({ ...value, items: next });
    const setItem = (i, patch) => save(items.map((h, j) => (j === i ? { ...h, ...patch } : h)));
    const byId = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

    return (
        <div className="space-y-4 pt-3">
            <p className="text-xs text-admin-muted">Expanding herb panels that link each herb to the products it goes into. Use wording like “traditionally used to support…”, not medical claims.</p>
            <Heading value={value} onChange={onChange} defaults={HERB_ATLAS} />
            <ResetBar custom={custom} onReset={() => onChange({ ...value, items: [] })} />
            {items.map((herb, i) => (
                <div key={i} className="space-y-3 rounded-xl border border-admin-border bg-admin-surface p-4">
                    <div className="flex items-start gap-3">
                        <div className="grid flex-1 gap-3 sm:grid-cols-3">
                            <AdminField label="Herb"><Input maxLength={30} value={herb.name} onChange={(e) => setItem(i, { name: e.target.value })} /></AdminField>
                            <AdminField label="Common name"><Input maxLength={40} value={herb.local} onChange={(e) => setItem(i, { local: e.target.value })} /></AdminField>
                            <AdminField label="Botanical name"><Input maxLength={60} value={herb.latin} onChange={(e) => setItem(i, { latin: e.target.value })} /></AdminField>
                        </div>
                        <button type="button" onClick={() => save(items.filter((_, j) => j !== i))} aria-label={`Remove ${herb.name}`} className={iconButton}><Trash2 size={16} /></button>
                    </div>
                    <AdminField label="Traditional use (one or two sentences)"><AdminTextarea maxLength={200} rows={2} value={herb.use} onChange={(e) => setItem(i, { use: e.target.value })} /></AdminField>
                    <div className="grid gap-3 sm:grid-cols-[10rem_1fr]">
                        <AdminField label="Panel colour"><AdminSelect aria-label="Panel colour" value={herb.tone ?? HERB_TONES[0].value} onChange={(e) => setItem(i, { tone: e.target.value })} className="w-full" options={HERB_TONES} /></AdminField>
                        <AdminField label="Found in (up to 4 products)">
                            <div className="flex flex-wrap items-center gap-2">
                                {(herb.productIds ?? []).map((id) => (
                                    <span key={id} className="inline-flex items-center gap-2 rounded-full bg-admin-surface-alt py-1 pl-1 pr-2 text-xs text-ink ring-1 ring-admin-border">
                                        {byId.get(id)?.images?.[0] && <img src={imageUrl(byId.get(id).images[0], 64)} alt="" className="size-6 rounded-full object-cover" />}
                                        {byId.get(id)?.title ?? id}
                                        <button type="button" aria-label={`Remove ${byId.get(id)?.title ?? id}`} onClick={() => setItem(i, { productIds: herb.productIds.filter((x) => x !== id) })} className="text-admin-muted hover:text-danger"><X size={12} /></button>
                                    </span>
                                ))}
                                {(herb.productIds ?? []).length < 4 && (
                                    <ProductSelect products={products.filter((p) => !(herb.productIds ?? []).includes(p.id))} value="" onChange={(id) => id && setItem(i, { productIds: [...(herb.productIds ?? []), id] })} label="Add a product" className="min-w-[12rem]" />
                                )}
                            </div>
                        </AdminField>
                    </div>
                </div>
            ))}
            {items.length < 10 && <button type="button" onClick={() => save([...items, { name: 'New herb', local: '', latin: '', use: '', tone: HERB_TONES[0].value, productIds: [] }])} className={ghostButton}><Plus size={14} /> Add a herb</button>}
        </div>
    );
}

/* ---------------------------------------------------------------- Explore in 3D */

const PACK_SHAPES = [
    { value: 'bottle', label: 'Bottle (juice, tonic)' }, { value: 'jar', label: 'Jar (gummies, tablets, powder)' }, { value: 'tube', label: 'Tube (face wash, cream)' },
    { value: 'pouch', label: 'Pouch (greens, tea)' }, { value: 'pump', label: 'Pump bottle (oil, lotion)' },
];

export function PacksEditor({ value, onChange, products }) {
    const looks = value ?? {};
    const shown = products.filter((p) => p.isPublished !== false && p.images?.[0]);
    const base = (product) => ({ ...FALLBACK_PACK, name: '', ...PACKS[product.id], ...looks[product.id] });
    const setLook = (product, patch) => onChange({ ...looks, [product.id]: { ...base(product), ...patch } });
    const reset = (product) => { const next = { ...looks }; delete next[product.id]; onChange(next); };

    return (
        <div className="space-y-4 pt-3">
            <p className="text-xs text-admin-muted">
                Explore in 3D draws each pack for you: pick its shape and colours and the label is printed from the product's name, so there is nothing to photograph or upload. Only products with a shape set here (or one of our built-in ones) appear in the viewer.
            </p>
            <div className="divide-y divide-admin-border rounded-xl border border-admin-border bg-admin-surface">
                {shown.map((p) => {
                    const look = base(p);
                    const set = Boolean(looks[p.id] || PACKS[p.id]);
                    return (
                        <div key={p.id} className="space-y-3 p-4">
                            <div className="grid items-center gap-3 lg:grid-cols-[minmax(0,1fr)_14rem_auto_auto]">
                            <div className="flex min-w-0 items-center gap-3">
                                <img src={imageUrl(p.images[0], 96)} alt="" className="size-12 shrink-0 rounded-lg bg-admin-surface-alt object-cover" />
                                <div className="min-w-0"><p className="truncate text-sm font-medium text-ink">{p.title}</p><p className="text-xs text-admin-muted">{set ? 'Shown in 3D' : 'Not shown in 3D yet'}</p></div>
                            </div>
                            <AdminSelect aria-label={`${p.title} shape`} value={set ? look.kind : ''} onChange={(e) => e.target.value && setLook(p, { kind: e.target.value })} className="w-full" options={[{ value: '', label: 'Choose a shape…' }, ...PACK_SHAPES]} />
                            <div className="flex items-center gap-3 text-xs text-admin-muted">
                                <label className="flex items-center gap-1.5">Body <input type="color" aria-label={`${p.title} body colour`} value={look.body} onChange={(e) => setLook(p, { body: e.target.value })} className="size-8 cursor-pointer rounded border border-admin-border bg-transparent p-0.5" /></label>
                                <label className="flex items-center gap-1.5">Cap <input type="color" aria-label={`${p.title} cap colour`} value={look.cap} onChange={(e) => setLook(p, { cap: e.target.value, accent: e.target.value })} className="size-8 cursor-pointer rounded border border-admin-border bg-transparent p-0.5" /></label>
                            </div>
                            {looks[p.id] ? <button type="button" onClick={() => reset(p)} aria-label={`Reset ${p.title}`} title="Reset to suggested" className={iconButton}><RotateCcw size={16} /></button> : <span className="hidden size-8 lg:block" />}
                            </div>
                            <div className="grid gap-2 sm:grid-cols-2">
                                <Input maxLength={30} aria-label={`${p.title} label name`} placeholder="Label name (short)" value={look.name} onChange={(e) => setLook(p, { name: e.target.value })} />
                                <Input maxLength={30} aria-label={`${p.title} label line`} placeholder="Label line (e.g. FACE WASH)" value={look.sub} onChange={(e) => setLook(p, { sub: e.target.value })} />
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
