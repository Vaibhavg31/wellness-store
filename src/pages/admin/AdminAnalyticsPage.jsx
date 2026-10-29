import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDownRight, ArrowUpRight, ChevronDown, Info, Lightbulb, RefreshCw, Trash2, Users } from 'lucide-react';
import { api, imageUrl } from '@/services/api';
import { useAdminAuth } from '@/contexts/AuthContext';
import { formatPrice, cn } from '@/utils/formatPrice';
import { AdminPageHeader, AdminLoadingState, AdminErrorBanner, AdminStatusPill, AdminTabs, AdminEmptyState } from '@/components/admin/AdminUi';
import { BarRows, FunnelChart, HourChart, SplitBar, TrendChart, num, pct } from '@/components/admin/analytics/AnalyticsCharts';

const RANGES = [
    { value: 'today', label: 'Today' },
    { value: '7d', label: '7 days' },
    { value: '30d', label: '30 days' },
    { value: '90d', label: '90 days' },
];
const RANGE_KEY = 'chikit-analytics-range';

const SOURCE_LABELS = {
    direct: 'Direct (typed link, saved, or app)', google: 'Google search', 'other-search': 'Other search engines', instagram: 'Instagram', facebook: 'Facebook',
    whatsapp: 'WhatsApp', youtube: 'YouTube', x: 'X (Twitter)', linkedin: 'LinkedIn', email: 'Email / newsletter', campaign: 'Campaign links', other: 'Other websites',
};
const DEVICE_LABELS = { phone: 'Phone', tablet: 'Tablet', desktop: 'Desktop / laptop' };
const PAGE_LABELS = {
    '/': 'Home page', '/shop': 'Shop (all products)', '/product/*': 'Product pages', '/cart': 'Bag page', '/checkout': 'Checkout', '/wishlist': 'Wishlist',
    '/login': 'Sign in / sign up', '/account': 'My account', '/orders': 'My orders', '/about': 'About', '/contact': 'Contact', '/faq': 'FAQ', '/reviews': 'Reviews',
    '/track-order': 'Track order', '/privacy': 'Privacy policy', '/terms': 'Terms', '/shipping-policy': 'Shipping policy', '/refund-policy': 'Refund policy',
};
const pageLabel = (path) => PAGE_LABELS[path] ?? (path?.startsWith('/category/') ? `Category: ${path.replace('/category/', '')}` : path || 'Unknown');

const OUTCOMES = {
    bought: { label: 'Bought', tone: 'success' },
    checkout: { label: 'Left at checkout form', tone: 'danger' },
    signin: { label: 'Left at sign-in step', tone: 'danger' },
    bag: { label: 'Left with items in bag', tone: 'warning' },
    browsed: { label: 'Looked at products', tone: 'default' },
    bounced: { label: 'Left after one page', tone: 'muted' },
};

const HOP_ADVICE = [
    'Most people leave without opening a single product. Check that the first screen shows real products and a clear “Shop” button.',
    'People look at products but do not add them. Look at the product table below for the ones with many views and few adds — price, photos or trust details may be putting them off.',
    'Items are added to the bag but checkout is not opened. Common causes: delivery charge shown too late, no clear free-delivery goal, or no reminder to come back.',
    'Guests reach checkout but stop at the sign-in step. This is the classic leak: consider guest checkout or one-tap sign-in so a new customer is not asked to create an account first.',
    'People fill in their details but do not place the order. Look at delivery charges, the payment choices offered, and whether the phone check (OTP) is slowing them down.',
];

const parseUtc = (value) => new Date(String(value).replace(' ', 'T') + 'Z');
const timeAgo = (value) => {
    const seconds = Math.max(0, (Date.now() - parseUtc(value).getTime()) / 1000);
    if (seconds < 90) return 'just now';
    if (seconds < 3600) return `${Math.round(seconds / 60)} min ago`;
    if (seconds < 86400) return `${Math.round(seconds / 3600)} h ago`;
    return parseUtc(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' });
};
const clockTime = (value) => parseUtc(value).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' });
const hourName = (h) => `${h % 12 === 0 ? 12 : h % 12}${h < 12 ? 'am' : 'pm'}`;

function Delta({ current, previous, points = false }) {
    if (previous === undefined || previous === null) return null;
    const diff = current - previous;
    if (Math.abs(diff) < 0.0001) return <span className="text-caption text-admin-muted">no change</span>;
    if (!points && previous === 0) return <span className="text-caption text-success">new</span>;
    const up = diff > 0;
    const label = points ? `${Math.abs(diff).toFixed(1)} pts` : `${Math.abs((diff / previous) * 100).toFixed(0)}%`;
    const Icon = up ? ArrowUpRight : ArrowDownRight;
    return <span className={cn('inline-flex items-center gap-0.5 text-caption font-medium', up ? 'text-success' : 'text-danger')}><Icon size={14} aria-hidden="true" />{label}<span className="sr-only"> {up ? 'up' : 'down'} on the previous period</span></span>;
}

function Kpi({ label, value, sub, delta, hint }) {
    return (
        <div className="admin-stat-card" title={hint}>
            <p className="admin-stat-card-label">{label}</p>
            <p className="admin-stat-card-value">{value}</p>
            <p className="mt-1 flex flex-wrap items-center gap-x-2 text-caption text-admin-muted">{sub}{delta}</p>
        </div>
    );
}

function Panel({ title, subtitle, children, className, action }) {
    return (
        <section className={cn('rounded-xl border border-admin-border bg-admin-surface p-4 shadow-xs sm:p-5', className)}>
            <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                    <h2 className="font-sans text-body font-semibold text-ink">{title}</h2>
                    {subtitle && <p className="mt-0.5 text-small text-admin-muted">{subtitle}</p>}
                </div>
                {action}
            </div>
            {children}
        </section>
    );
}

/** The sentences a busy owner actually wants: what is the biggest problem, and where to look first. */
function buildInsights(data) {
    const out = [];
    const { current } = data.kpis;
    if (current.visitors === 0) return out;
    if (current.visitors < 30) out.push({ tone: 'info', text: `Early days: only ${current.visitors} ${current.visitors === 1 ? 'visitor' : 'visitors'} so far. Treat the percentages as a rough guide until a few hundred people have visited.` });

    const steps = data.funnel;
    let worst = -1;
    let worstRate = 0;
    for (let i = 1; i < steps.length; i += 1) {
        const before = steps[i - 1].count;
        const rate = before > 0 ? (before - steps[i].count) / before : 0;
        if (before >= 5 && rate > worstRate) { worst = i - 1; worstRate = rate; }
    }
    if (worst >= 0 && worstRate > 0) {
        out.push({ tone: 'danger', text: `Biggest leak: ${(worstRate * 100).toFixed(0)}% of visitors who reached “${steps[worst].label}” never got to “${steps[worst + 1].label}”. ${HOP_ADVICE[worst]}` });
    }

    const topLeak = data.leaks[0];
    if (topLeak && data.lostTotal >= 5) out.push({ tone: 'warning', text: `Most visitors who do not buy last see “${pageLabel(topLeak.path)}” — ${topLeak.lost} of the ${data.lostTotal} visits lost across the top pages.` });

    const stalled = data.products.find((p) => p.views >= 10 && p.adds / p.views < 0.05);
    if (stalled) out.push({ tone: 'warning', text: `“${stalled.title}” is opened often (${stalled.views} views) but hardly ever added to the bag (${stalled.adds}). Worth a look at its price, photos and description.` });

    const best = [...data.products].sort((a, b) => b.orders - a.orders)[0];
    if (best?.orders > 0) out.push({ tone: 'success', text: `Best seller in this period: “${best.title}” — in ${best.orders} ${best.orders === 1 ? 'order' : 'orders'} (${best.units} sold).` });

    const empty = data.searches.filter((s) => s.empty > 0);
    if (empty.length > 0) out.push({ tone: 'warning', text: `${empty.length} ${empty.length === 1 ? 'search' : 'searches'} found nothing, such as “${empty[0].term}”. Customers are asking for something the store does not show — add it or use their word in a product name.` });

    const peak = data.hours.reduce((b, h) => (h.sessions > b.sessions ? h : b), data.hours[0]);
    if (peak.sessions >= 3) out.push({ tone: 'info', text: `Most visits start around ${hourName(peak.hour)}–${hourName((peak.hour + 1) % 24)} (India time). Post on Instagram or send offers shortly before that.` });

    const phone = data.devices.find((d) => d.key === 'phone');
    const desktop = data.devices.find((d) => d.key === 'desktop');
    if (phone && desktop && phone.visitors >= 10 && desktop.visitors >= 5) {
        const phoneRate = phone.orders / phone.visitors;
        const deskRate = desktop.orders / desktop.visitors;
        if (deskRate > 0 && phoneRate < deskRate * 0.5) out.push({ tone: 'warning', text: `Phone visitors buy far less than desktop visitors (${(phoneRate * 100).toFixed(1)}% vs ${(deskRate * 100).toFixed(1)}%) although ${pct(phone.visitors, current.visitors)} of visitors use a phone. Walk through checkout on your own phone.` });
    }
    return out.slice(0, 6);
}

function stepText(e, titles) {
    const name = e.product || titles.get(e.productId) || 'a product';
    switch (e.type) {
        case 'page_view': return pageLabel(e.path);
        case 'product_view': return `Viewed “${name}”`;
        case 'add_to_cart': return `Added ${name}${e.qty > 1 ? ` ×${e.qty}` : ''} to bag`;
        case 'remove_from_cart': return `Removed ${name} from bag`;
        case 'cart_open': return 'Opened the bag';
        case 'wishlist_add': return `Saved “${name}” to wishlist`;
        case 'search': return `Searched “${e.label}”${e.qty === 0 ? ' — no results' : ''}`;
        case 'checkout_start': return 'Opened checkout';
        case 'checkout_form': return 'Signed in — reached the details form';
        case 'purchase': return `Placed order ${formatPrice(e.value)}`;
        default: return e.type;
    }
}

/** Collapses the raw event stream into the readable path a person took (product pages are shown by the product viewed). */
function journeySteps(journey) {
    const titles = new Map(journey.events.filter((e) => e.productId && e.product).map((e) => [e.productId, e.product]));
    const steps = [];
    for (const e of journey.events) {
        if (e.type === 'purchase_item') continue;
        if (e.type === 'page_view' && e.pageType === 'product') continue;
        const text = stepText(e, titles);
        if (steps.at(-1)?.text === text) continue;
        steps.push({ text, at: e.at, type: e.type });
    }
    return steps;
}

function JourneyRow({ journey }) {
    const [open, setOpen] = useState(false);
    const steps = useMemo(() => journeySteps(journey), [journey]);
    const outcome = OUTCOMES[journey.outcome];
    const who = journey.customer ? journey.customer.name : `Guest ${journey.visitorId.slice(-4).toUpperCase()}`;
    const preview = steps.slice(0, 4).map((s) => s.text).join('  →  ');
    return (
        <li className="border-b border-admin-border-light last:border-b-0">
            <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="flex w-full items-start gap-3 px-1 py-3 text-left hover:bg-admin-surface-alt">
                <span className={cn('mt-0.5 grid size-9 shrink-0 place-items-center rounded-full text-xs font-semibold', journey.customer ? 'bg-primary text-white' : 'bg-primary-tint text-primary-deep')} aria-hidden="true">
                    {journey.customer ? who.slice(0, 1).toUpperCase() : '?'}
                </span>
                <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="text-small font-semibold text-ink">{who}</span>
                        <AdminStatusPill tone={outcome.tone}>{outcome.label}</AdminStatusPill>
                        {journey.returning && <span className="text-caption text-admin-muted">returning ({journey.priorVisits} earlier {journey.priorVisits === 1 ? 'visit' : 'visits'})</span>}
                    </span>
                    <span className="mt-0.5 block text-caption text-admin-muted">
                        {timeAgo(journey.startedAt)} · {DEVICE_LABELS[journey.device] ?? journey.device} · {SOURCE_LABELS[journey.source] ?? journey.source} · {journey.pageViews} {journey.pageViews === 1 ? 'page' : 'pages'}
                    </span>
                    {!open && <span className="mt-1 block truncate text-small text-ink/80">{preview || 'No details'}{steps.length > 4 ? '  …' : ''}</span>}
                </span>
                <ChevronDown size={18} className={cn('mt-1 shrink-0 text-admin-muted transition-transform', open && 'rotate-180')} aria-hidden="true" />
            </button>
            {open && (
                <ol className="mb-3 ml-4 space-y-0 border-l-2 border-primary-tint pl-5">
                    {steps.map((s, i) => (
                        <li key={`${s.at}-${i}`} className="relative py-1 text-small text-ink">
                            <span className={cn('absolute -left-[1.6rem] top-2.5 size-2 rounded-full', s.type === 'purchase' ? 'bg-success' : s.type === 'add_to_cart' ? 'bg-accent' : 'bg-primary/60')} aria-hidden="true" />
                            {s.text} <span className="text-caption text-admin-muted">{clockTime(s.at)}</span>
                        </li>
                    ))}
                    {steps.length === 0 && <li className="py-1 text-small text-admin-muted">No steps were recorded.</li>}
                </ol>
            )}
        </li>
    );
}

const PRODUCT_SORTS = [
    { value: 'views', label: 'Most viewed' },
    { value: 'adds', label: 'Most added to bag' },
    { value: 'orders', label: 'Best selling' },
    { value: 'leaks', label: 'Looked at, not added' },
];

export default function AdminAnalyticsPage() {
    const { adminToken } = useAdminAuth();
    const [range, setRange] = useState(() => {
        try { return RANGES.some((r) => r.value === localStorage.getItem(RANGE_KEY)) ? localStorage.getItem(RANGE_KEY) : '7d'; } catch { return '7d'; }
    });
    const [data, setData] = useState(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);
    const [productSort, setProductSort] = useState('views');
    const [outcome, setOutcome] = useState('all');
    const [clearing, setClearing] = useState(false);

    const load = useCallback(async (quiet = false) => {
        if (!adminToken) return;
        if (!quiet) setLoading(true);
        try {
            setData(await api.get(`/api/analytics/admin/overview?range=${range}`, adminToken));
            setError('');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not load analytics');
        } finally {
            setLoading(false);
        }
    }, [adminToken, range]);

    useEffect(() => { load(); }, [load]);

    // Keep "browsing now" and the journeys fresh while the page is open.
    useEffect(() => {
        const timer = setInterval(() => { if (document.visibilityState === 'visible') load(true); }, 60_000);
        return () => clearInterval(timer);
    }, [load]);

    const changeRange = (value) => {
        setRange(value);
        try { localStorage.setItem(RANGE_KEY, value); } catch { /* not remembered */ }
    };

    const clearData = async () => {
        if (!adminToken || !confirm('Clear ALL collected visitor data? Use this to wipe test visits before launch. Orders, customers and products are not affected. This cannot be undone.')) return;
        setClearing(true);
        try {
            await api.delete('/api/analytics/admin/data', adminToken);
            await load();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not clear the data');
        } finally {
            setClearing(false);
        }
    };

    const insights = useMemo(() => (data ? buildInsights(data) : []), [data]);

    const products = useMemo(() => {
        if (!data) return [];
        const list = data.products.map((p) => ({ ...p, addRate: p.views > 0 ? p.adds / p.views : 0, buyRate: p.adds > 0 ? p.orders / p.adds : 0 }));
        if (productSort === 'adds') return list.sort((a, b) => b.adds - a.adds || b.views - a.views);
        if (productSort === 'orders') return list.sort((a, b) => b.orders - a.orders || b.revenue - a.revenue);
        if (productSort === 'leaks') return list.filter((p) => p.views >= 3).sort((a, b) => (a.addRate - b.addRate) || (b.views - a.views));
        return list.sort((a, b) => b.views - a.views || b.adds - a.adds);
    }, [data, productSort]);

    const visibleJourneys = useMemo(() => {
        if (!data) return [];
        const groups = { checkout: ['checkout', 'signin'], browsed: ['browsed', 'bounced'] };
        if (outcome === 'all') return data.journeys;
        const keys = groups[outcome] ?? [outcome];
        return data.journeys.filter((j) => keys.includes(j.outcome));
    }, [data, outcome]);

    const journeyTabs = useMemo(() => {
        const count = (key) => (data ? data.journeys.filter((j) => j.outcome === key).length : 0);
        return [
            { value: 'all', label: 'All', count: data?.journeys.length ?? 0 },
            { value: 'bought', label: 'Bought', count: count('bought') },
            { value: 'checkout', label: 'Left at checkout', count: count('checkout') + count('signin') },
            { value: 'bag', label: 'Left with bag', count: count('bag') },
            { value: 'browsed', label: 'Just browsing', count: count('browsed') + count('bounced') },
        ];
    }, [data]);

    if (loading && !data) return <AdminLoadingState />;

    const k = data?.kpis.current;
    const prev = data?.kpis.previous;
    const carted = data?.funnel.find((s) => s.key === 'carted')?.count ?? 0;
    const bought = data?.funnel.find((s) => s.key === 'bought')?.count ?? 0;
    const abandonRate = carted > 0 ? (1 - bought / carted) * 100 : null;
    const prevConv = prev && prev.visitors > 0 ? (prev.buyers / prev.visitors) * 100 : 0;
    const conv = k && k.visitors > 0 ? (k.buyers / k.visitors) * 100 : 0;
    const empty = !data || data.tracking.sessions === 0;

    return (
        <div>
            <AdminPageHeader
                title="Analytics"
                subtitle="Where visitors come from, what they look at, and where we lose them"
                actions={(
                    <>
                        {data && (
                            <span className="inline-flex min-h-9 items-center gap-2 rounded-full border border-admin-border bg-admin-surface px-3 text-small text-ink" role="status">
                                <span className={cn('size-2 rounded-full', data.live.active > 0 ? 'bg-success' : 'bg-admin-border')} aria-hidden="true" />
                                <strong className="font-semibold tabular-nums">{data.live.active}</strong> browsing now
                            </span>
                        )}
                        <button type="button" onClick={() => load()} className="inline-flex min-h-9 items-center gap-2 rounded-full border border-admin-border bg-admin-surface px-3.5 text-small font-medium text-ink hover:border-primary/50">
                            <RefreshCw size={15} aria-hidden="true" className={cn(loading && 'animate-spin')} /> Refresh
                        </button>
                    </>
                )}
            />

            <AdminErrorBanner message={error} onDismiss={() => setError('')} />

            <AdminTabs tabs={RANGES} value={range} onChange={changeRange} label="Time period" />

            {empty && (
                <div className="mb-6 rounded-xl border border-primary/25 bg-primary-soft p-4 text-small text-ink sm:p-5">
                    <p className="flex items-center gap-2 font-semibold"><Info size={18} className="text-primary" aria-hidden="true" /> No visits recorded yet</p>
                    <p className="mt-1.5 text-admin-muted">Tracking is switched on for every shopper. Visits show up here within a few seconds. Your own visits are <strong className="text-ink">not counted while you are signed in as admin</strong> (so your testing does not pollute the numbers) — to try it, open the store in a private window and browse, add to bag and start checkout.</p>
                </div>
            )}

            {data && (
                <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
                        <Kpi label="Visitors" value={num(k.visitors)} sub={<span>{num(k.sessions)} visits · {num(k.newVisitors)} new</span>} delta={<Delta current={k.visitors} previous={prev.visitors} />} hint="Different browsers that opened the store in this period" />
                        <Kpi label="Orders" value={num(k.orders)} sub={<span>{formatPrice(k.revenue)}</span>} delta={<Delta current={k.orders} previous={prev.orders} />} hint="Orders placed on the website (not orders you created by hand)" />
                        <Kpi label="Conversion" value={k.visitors ? `${conv.toFixed(1)}%` : '—'} sub={<span>{k.buyers} of {k.visitors} bought</span>} delta={<Delta current={conv} previous={prevConv} points />} hint="Share of visitors who placed an order" />
                        <Kpi label="Bag abandonment" value={abandonRate === null ? '—' : `${abandonRate.toFixed(0)}%`} sub={<span>{formatPrice(data.abandoned.value)} left in bags</span>} hint="Visitors who added to the bag but did not order. The money figure is an estimate." />
                        <Kpi label="Bounce rate" value={k.sessions ? pct(k.bounced, k.sessions) : '—'} sub={<span>left after one page</span>} hint="Visits that looked at a single page and left" />
                        <Kpi label="Signed in" value={k.visitors ? pct(k.known, k.visitors) : '—'} sub={<span>{k.known} of {k.visitors} visitors</span>} hint="Visitors we can put a name to (they signed in). Everyone else is an anonymous guest." />
                    </div>

                    {insights.length > 0 && (
                        <Panel title="What stands out" subtitle="Plain-language findings from the numbers below">
                            <ul className="space-y-2.5">
                                {insights.map((item) => (
                                    <li key={item.text} className={cn('flex gap-3 rounded-lg border px-3.5 py-3 text-small',
                                        item.tone === 'danger' && 'border-danger/25 bg-danger-tint text-ink',
                                        item.tone === 'warning' && 'border-warning/25 bg-warning-tint text-ink',
                                        item.tone === 'success' && 'border-success/25 bg-success-tint text-ink',
                                        item.tone === 'info' && 'border-info/20 bg-info-tint text-ink')}>
                                        <Lightbulb size={17} className={cn('mt-0.5 shrink-0', item.tone === 'danger' ? 'text-danger' : item.tone === 'warning' ? 'text-warning' : item.tone === 'success' ? 'text-success' : 'text-info')} aria-hidden="true" />
                                        <span>{item.text}</span>
                                    </li>
                                ))}
                            </ul>
                        </Panel>
                    )}

                    <div className="grid gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
                        <Panel title="The buying funnel" subtitle="Each step counts visitors who got at least that far, so the numbers only ever go down.">
                            <FunnelChart steps={data.funnel} />
                        </Panel>
                        <Panel title="Where we lose them" subtitle="The last page seen by visitors who left without buying">
                            {data.leaks.length === 0 ? (
                                <p className="py-6 text-center text-small text-admin-muted">No lost visits yet.</p>
                            ) : (
                                <BarRows rows={data.leaks.map((l) => ({ key: l.path, label: pageLabel(l.path), value: l.lost, valueNote: data.lostTotal ? `· ${pct(l.lost, data.lostTotal)}` : '' }))} />
                            )}
                        </Panel>
                    </div>

                    <Panel title="Visitors over time" subtitle="Daily visitors, how many added to the bag, and orders (India time)">
                        <TrendChart daily={data.daily} />
                    </Panel>

                    <div className="grid gap-6 lg:grid-cols-2">
                        <Panel title="Where visitors come from" subtitle="Visitors by source, with how many of them ordered">
                            <BarRows
                                empty="No visits yet."
                                rows={data.sources.map((s) => ({
                                    key: s.key, label: SOURCE_LABELS[s.key] ?? s.key, value: s.visitors,
                                    sub: `${s.carts} added to bag · ${s.orders} ${s.orders === 1 ? 'order' : 'orders'}${s.visitors ? ` · ${((s.orders / s.visitors) * 100).toFixed(1)}% bought` : ''}`,
                                }))}
                            />
                            {data.campaigns.length > 0 && (
                                <div className="mt-5 border-t border-admin-border-light pt-4">
                                    <p className="mb-2 text-small font-medium text-ink">Campaign links (utm)</p>
                                    <ul className="space-y-1 text-small">
                                        {data.campaigns.map((c) => <li key={c.key} className="flex justify-between gap-3"><span className="truncate text-ink">{c.key}</span><span className="shrink-0 tabular-nums text-admin-muted">{c.visitors} visitors · {c.orders} orders</span></li>)}
                                    </ul>
                                </div>
                            )}
                        </Panel>
                        <div className="space-y-6">
                            <Panel title="Who is visiting" subtitle="New vs returning, and the device they use">
                                <div className="space-y-5">
                                    <SplitBar parts={[
                                        { key: 'new', label: 'New', value: k.newVisitors, color: 'var(--color-primary)' },
                                        { key: 'ret', label: 'Returning', value: k.returningVisitors, color: 'var(--color-accent)' },
                                    ]} />
                                    <SplitBar parts={[
                                        { key: 'phone', label: 'Phone', value: data.devices.find((d) => d.key === 'phone')?.visitors ?? 0, color: 'var(--color-primary)' },
                                        { key: 'tablet', label: 'Tablet', value: data.devices.find((d) => d.key === 'tablet')?.visitors ?? 0, color: 'var(--color-info)' },
                                        { key: 'desktop', label: 'Desktop', value: data.devices.find((d) => d.key === 'desktop')?.visitors ?? 0, color: 'var(--color-accent)' },
                                    ]} />
                                </div>
                            </Panel>
                            <Panel title="Busiest hours" subtitle="When visits start (India time)">
                                <HourChart hours={data.hours} />
                            </Panel>
                        </div>
                    </div>

                    <Panel title="Products people open" subtitle="Views, bag adds and orders per product" action={null}>
                        <AdminTabs tabs={PRODUCT_SORTS} value={productSort} onChange={setProductSort} label="Sort products" />
                        {products.length === 0 ? (
                            <AdminEmptyState title="No product activity yet" description="Product views appear here as soon as shoppers open product pages." />
                        ) : (
                            <>
                                <div className="hidden overflow-x-auto md:block">
                                    <table className="w-full text-small">
                                        <thead>
                                            <tr className="text-left">
                                                <th className="px-3 py-2.5">Product</th>
                                                <th className="px-3 py-2.5 text-right">Views</th>
                                                <th className="px-3 py-2.5 text-right">Added to bag</th>
                                                <th className="px-3 py-2.5 text-right">View → bag</th>
                                                <th className="px-3 py-2.5 text-right">Orders</th>
                                                <th className="px-3 py-2.5 text-right">Left from here</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {products.map((p) => (
                                                <tr key={p.id}>
                                                    <td className="px-3 py-2.5">
                                                        <Link to={`/product/${p.id}`} target="_blank" rel="noreferrer" className="flex items-center gap-3 hover:text-primary">
                                                            {p.image ? <img src={imageUrl(p.image, 80)} alt="" loading="lazy" className="size-10 shrink-0 rounded-md bg-admin-surface-alt object-contain" /> : <span className="size-10 shrink-0 rounded-md bg-admin-surface-alt" />}
                                                            <span className="min-w-0 max-w-[18rem] truncate font-medium text-ink">{p.title}</span>
                                                        </Link>
                                                    </td>
                                                    <td className="px-3 py-2.5 text-right tabular-nums">{num(p.views)} <span className="text-caption text-admin-muted">({num(p.viewers)} people)</span></td>
                                                    <td className="px-3 py-2.5 text-right tabular-nums">{num(p.adds)}</td>
                                                    <td className="px-3 py-2.5 text-right tabular-nums">{p.views ? `${(p.addRate * 100).toFixed(0)}%` : '—'}</td>
                                                    <td className="px-3 py-2.5 text-right tabular-nums">{num(p.orders)}{p.revenue > 0 && <span className="block text-caption text-admin-muted">{formatPrice(p.revenue)}</span>}</td>
                                                    <td className="px-3 py-2.5 text-right tabular-nums">{num(p.leftHere)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                <ul className="divide-y divide-admin-border-light md:hidden">
                                    {products.map((p) => (
                                        <li key={p.id} className="py-3">
                                            <Link to={`/product/${p.id}`} target="_blank" rel="noreferrer" className="flex items-center gap-3">
                                                {p.image ? <img src={imageUrl(p.image, 80)} alt="" loading="lazy" className="size-11 shrink-0 rounded-md bg-admin-surface-alt object-contain" /> : <span className="size-11 shrink-0 rounded-md bg-admin-surface-alt" />}
                                                <span className="min-w-0 truncate text-small font-medium text-ink">{p.title}</span>
                                            </Link>
                                            <dl className="mt-2.5 grid grid-cols-4 gap-2 text-center">
                                                {[['Views', num(p.views)], ['In bag', num(p.adds)], ['View→bag', p.views ? `${(p.addRate * 100).toFixed(0)}%` : '—'], ['Orders', num(p.orders)]].map(([label, value]) => (
                                                    <div key={label} className="rounded-md bg-admin-surface-alt px-1 py-1.5">
                                                        <dd className="text-small font-semibold tabular-nums text-ink">{value}</dd>
                                                        <dt className="text-[11px] text-admin-muted">{label}</dt>
                                                    </div>
                                                ))}
                                            </dl>
                                        </li>
                                    ))}
                                </ul>
                            </>
                        )}
                    </Panel>

                    <div className="grid gap-6 lg:grid-cols-2">
                        <Panel title="Pages" subtitle="How each page performs. “Exits” = visits that ended here.">
                            {data.pages.length === 0 ? (
                                <p className="py-6 text-center text-small text-admin-muted">No page views yet.</p>
                            ) : (
                                <ul className="divide-y divide-admin-border-light">
                                    {data.pages.map((p) => (
                                        <li key={p.path} className="flex items-center justify-between gap-3 py-2.5">
                                            <span className="min-w-0">
                                                <span className="block truncate text-small font-medium text-ink">{pageLabel(p.path)}</span>
                                                <span className="block text-caption text-admin-muted">{num(p.visitors)} {p.visitors === 1 ? 'visitor' : 'visitors'}{p.bounces > 0 ? ` · ${p.bounces} bounced` : ''}</span>
                                            </span>
                                            <span className="shrink-0 text-right text-small tabular-nums">
                                                <strong className="font-semibold text-ink">{num(p.views)}</strong> <span className="text-admin-muted">views</span>
                                                <span className="block text-caption text-admin-muted">{p.views ? `${Math.min(100, Math.round((p.exits / p.views) * 100))}% exit here` : ''}</span>
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </Panel>
                        <Panel title="What people search for" subtitle="Searches in the shop; red means the store had nothing to show">
                            {data.searches.length === 0 ? (
                                <p className="py-6 text-center text-small text-admin-muted">No searches yet.</p>
                            ) : (
                                <ul className="divide-y divide-admin-border-light">
                                    {data.searches.map((s) => (
                                        <li key={s.term} className="flex items-center justify-between gap-3 py-2.5">
                                            <span className="min-w-0 truncate text-small font-medium text-ink">“{s.term}”</span>
                                            <span className="flex shrink-0 items-center gap-2 text-small tabular-nums">
                                                {s.empty > 0 && <AdminStatusPill tone="danger">{s.empty === s.searches ? 'No results' : `${s.empty} with no results`}</AdminStatusPill>}
                                                <span className="text-admin-muted">{s.searches}×</span>
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </Panel>
                    </div>

                    <Panel title="Visitor journeys" subtitle="What individual visitors did, newest first. Guests have no name until they sign in; once they do, their earlier visits are attached to them.">
                        <AdminTabs tabs={journeyTabs} value={outcome} onChange={setOutcome} label="Filter journeys" />
                        {visibleJourneys.length === 0 ? (
                            <AdminEmptyState icon={Users} title="No journeys match" description="Try another filter or a longer time period." />
                        ) : (
                            <ul>{visibleJourneys.map((j) => <JourneyRow key={j.id} journey={j} />)}</ul>
                        )}
                        {data.journeys.length >= 60 && <p className="mt-3 text-caption text-admin-muted">Showing the latest 60 visits.</p>}
                    </Panel>

                    <Panel title="How these numbers work">
                        <ul className="space-y-2 text-small text-admin-muted">
                            <li><strong className="text-ink">Visitor</strong> — one browser. We give each browser a random id (no name, no IP address stored). The same person on a phone and a laptop counts as two until they sign in on both.</li>
                            <li><strong className="text-ink">Visit</strong> — one stretch of browsing; a new visit starts after 30 minutes of nothing.</li>
                            <li><strong className="text-ink">Signed in</strong> — the moment someone signs in, all their earlier anonymous visits from that browser are attached to their account, so you can see what they did before buying.</li>
                            <li><strong className="text-ink">Not counted</strong> — search-engine bots, anyone signed in as admin, and browsers where <code className="rounded bg-admin-surface-alt px-1">?notrack=1</code> was added to any store address once (use it on the team&apos;s own devices).</li>
                            <li><strong className="text-ink">Orders</strong> here are website orders only; orders you create by hand in “Create order” are not part of the funnel.</li>
                            <li><strong className="text-ink">History</strong> is kept for 180 days. {data.tracking.since && `Tracking started ${timeAgo(data.tracking.since)}.`}</li>
                        </ul>
                        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-admin-border-light pt-4">
                            <p className="text-small text-admin-muted">Finished testing? Clear the test visits before the store goes live.</p>
                            <button type="button" onClick={clearData} disabled={clearing} className="inline-flex min-h-9 items-center gap-2 rounded-full border border-danger/40 px-3.5 text-small font-medium text-danger hover:bg-danger-tint disabled:opacity-50">
                                <Trash2 size={15} aria-hidden="true" /> {clearing ? 'Clearing…' : 'Clear visitor data'}
                            </button>
                        </div>
                    </Panel>
                </div>
            )}
        </div>
    );
}
