import { useEffect, useMemo, useRef } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Activity, Bean, ChevronDown, Crown, Droplet, Droplets, FlaskConical, Heart, Leaf, Mars, ShieldCheck, Smile, Sparkles, Sun, Venus, Zap } from 'lucide-react';
import CategoryNav from '@/components/layout/CategoryNav';
import WhatsAppIcon from '@/components/ui/WhatsAppIcon';
import { useSiteContent } from '@/contexts/SiteContentContext';
import { useCustomerSession } from '@/hooks/useCustomerSession';
import { useCategoryPlan } from '@/hooks/useCategoryPlan';
import { useWhatsApp } from '@/hooks/useWhatsApp';
import { useOffers } from '@/hooks/useApi';
import { activeConcerns } from '@/utils/concerns';
import { ribbonItems } from '@/utils/ribbonMenu';
import { imageUrl } from '@/services/api';
import { formatPrice, cn } from '@/utils/formatPrice';

/** Icons for the starting concern tiles (a concern with its own picture shows that instead). */
export const CONCERN_ICONS = {
    heart: Heart, sun: Sun, droplet: Droplet, leaf: Leaf, sparkles: Sparkles, shield: ShieldCheck, bean: Bean,
    flask: FlaskConical, mars: Mars, activity: Activity, smile: Smile, zap: Zap, venus: Venus, droplets: Droplets,
};

const pillBase = 'relative inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full font-medium transition-colors duration-200';
const pillSize = { desktop: 'px-3.5 py-2 text-small', phone: 'px-3.5 py-2.5 text-small' };
const pillIdle = 'text-ink hover:bg-primary-soft hover:text-primary';
const pillOpen = 'bg-primary-tint text-primary-deep';

/** One concern: its picture (or an icon on a soft tint) above its name. */
export function ConcernTile({ concern, onClick }) {
    const Icon = CONCERN_ICONS[concern.icon] ?? Leaf;
    return (
        <Link to={`/concern/${concern.slug}`} onClick={onClick} className="group flex flex-col items-center gap-2 text-center">
            <span className="relative grid aspect-square w-full place-items-center overflow-hidden rounded-xl bg-gradient-to-br from-primary-tint to-accent-tint ring-1 ring-line transition-shadow group-hover:shadow-md">
                {concern.image
                    // The brand's round line icons sit whole on the tile; an uploaded photo fills it.
                    ? <img src={imageUrl(concern.image, 240)} alt="" width="120" height="120" loading="lazy" className={concern.image.startsWith('/brand/icons/') ? 'size-[86%] object-contain transition-transform duration-300 group-hover:scale-105' : 'size-full object-cover'} />
                    : <Icon size={34} strokeWidth={1.6} className="text-primary transition-transform duration-300 group-hover:scale-110" aria-hidden="true" />}
            </span>
            <span className="text-caption font-medium leading-tight text-ink group-hover:text-primary sm:text-small">{concern.label}</span>
        </Link>
    );
}

/**
 * The shop's top ribbon: New Launches, Concern, Offers, Chikit Club Card and WhatsApp Help. Concern and Offers open a
 * panel (see RibbonPanels). Used twice, like the strip it replaces: inline in the header on desktop and as the second
 * row on phones. The older category / custom-link bar is still available from Content → Homepage → Navigation.
 */
export default function ShopRibbon({ variant = 'desktop', openMenu, onToggle }) {
    const { content } = useSiteContent();
    const { user, isAuthenticated } = useCustomerSession();
    const { getWhatsAppUrl } = useWhatsApp();
    const { offers } = useOffers();
    const mode = content.extras?.nav?.mode;
    const items = useMemo(() => ribbonItems(content.extras), [content.extras]);
    const concerns = useMemo(() => activeConcerns(content.extras), [content.extras]);
    const clubOn = content.extras?.club?.enabled !== false;
    const member = Boolean(isAuthenticated && user?.club?.member);

    if (mode === 'categories' || mode === 'links') return <CategoryNav variant={variant} />;

    const size = pillSize[variant];
    const visible = items.filter((item) => {
        if (item.key === 'concern') return concerns.length > 0;
        if (item.key === 'club') return clubOn;
        return true;
    });

    const toggle = (key) => (
        <button
            key={key}
            type="button"
            onClick={() => onToggle(key)}
            onMouseEnter={variant === 'desktop' ? () => onToggle(key, true) : undefined}
            aria-expanded={openMenu === key}
            aria-haspopup="true"
            aria-controls={`ribbon-panel-${key}`}
            className={cn(pillBase, size, openMenu === key ? pillOpen : pillIdle)}
        >
            {visible.find((i) => i.key === key).label}
            <ChevronDown size={15} className={cn('transition-transform duration-200', openMenu === key && 'rotate-180')} aria-hidden="true" />
        </button>
    );

    const nav = (
        <>
            {visible.map((item) => {
                switch (item.key) {
                    case 'new':
                        return (
                            <NavLink key="new" to="/new-launches" className={({ isActive }) => cn(pillBase, size, isActive ? pillOpen : pillIdle)}>
                                {item.label}
                                <span className="rounded-full bg-accent px-1.5 py-px text-[10px] font-bold uppercase leading-4 tracking-wide text-ink">New</span>
                            </NavLink>
                        );
                    case 'concern':
                        return toggle('concern');
                    case 'offers':
                        return offers.length > 0
                            ? toggle('offers')
                            : <NavLink key="offers" to="/offers" className={({ isActive }) => cn(pillBase, size, isActive ? pillOpen : pillIdle)}>{item.label}</NavLink>;
                    case 'club':
                        return (
                            <NavLink key="club" to="/club" className={({ isActive }) => cn(pillBase, size, isActive ? pillOpen : pillIdle)}>
                                <Crown size={15} className="text-accent-ink" aria-hidden="true" />
                                {member ? 'My Club Card' : item.label}
                            </NavLink>
                        );
                    case 'help':
                        return (
                            <a key="help" href={getWhatsAppUrl()} target="_blank" rel="noopener noreferrer" className={cn(pillBase, size, pillIdle)}>
                                <WhatsAppIcon size={16} className="text-[#1FA855]" />
                                {item.label}
                            </a>
                        );
                    default:
                        return null;
                }
            })}
        </>
    );

    if (variant === 'phone') {
        return (
            <nav aria-label="Shop menu" className="container-page flex items-center gap-1 overflow-x-auto py-2 pr-8 scrollbar-none [mask-image:linear-gradient(to_right,#000_90%,transparent)] lg:hidden">
                {nav}
            </nav>
        );
    }
    return <nav aria-label="Main navigation" className="ml-6 hidden flex-1 items-center gap-0.5 lg:flex">{nav}</nav>;
}

/** The drop-down panels under the header: every concern as a tile, and the live offer pages as a list. */
export function RibbonPanels({ openMenu, onClose }) {
    const { content } = useSiteContent();
    const { plan } = useCategoryPlan();
    const { offers } = useOffers();
    const concerns = useMemo(() => activeConcerns(content.extras), [content.extras]);
    const labels = useMemo(() => Object.fromEntries(ribbonItems(content.extras).map((i) => [i.key, i.label])), [content.extras]);
    const panelRef = useRef(null);

    useEffect(() => {
        if (openMenu) panelRef.current?.scrollTo?.({ top: 0 });
    }, [openMenu]);

    if (openMenu !== 'concern' && openMenu !== 'offers') return null;

    return (
        <div
            ref={panelRef}
            id={`ribbon-panel-${openMenu}`}
            className="pointer-events-auto absolute inset-x-0 top-full z-40 max-h-[calc(100dvh-7.5rem)] animate-fade-in overflow-y-auto overscroll-contain border-t border-line bg-surface shadow-lg"
        >
            {openMenu === 'concern' && (
                <div className="container-page py-6 lg:py-8">
                    <div className="mb-4 flex items-end justify-between gap-4">
                        <p className="eyebrow">Shop by {String(labels.concern || 'concern').toLowerCase()}</p>
                        <Link to="/shop" onClick={onClose} className="text-small font-medium text-primary hover:underline">All products</Link>
                    </div>
                    <ul className="grid grid-cols-3 gap-x-3 gap-y-5 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 lg:gap-x-4">
                        {concerns.map((concern) => <li key={concern.slug}><ConcernTile concern={concern} onClick={onClose} /></li>)}
                    </ul>
                    {plan.length > 0 && (
                        <div className="mt-6 flex flex-wrap items-center gap-x-2 gap-y-2 border-t border-line pt-5">
                            <span className="mr-1 text-caption font-semibold uppercase tracking-wider text-muted">Categories</span>
                            {plan.map((category) => (
                                <Link key={category.slug} to={`/category/${category.slug}`} onClick={onClose} className="inline-flex min-h-11 items-center rounded-full border border-line-strong px-3.5 text-small font-medium text-ink transition-colors hover:border-primary hover:text-primary">
                                    {category.label}
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {openMenu === 'offers' && (
                <div className="container-page py-4 lg:py-6">
                    <ul className="max-w-md divide-y divide-line">
                        <li><Link to="/offers" onClick={onClose} className="flex min-h-12 items-center justify-between gap-3 py-3 text-body font-semibold text-ink hover:text-primary">All offers <span className="text-caption font-medium text-muted">{offers.length} live</span></Link></li>
                        {offers.map((offer) => (
                            <li key={offer.id}>
                                <Link to={`/offers/${offer.slug}`} onClick={onClose} className="flex min-h-12 items-center justify-between gap-3 py-3 text-body text-ink hover:text-primary">
                                    <span>{offer.title}</span>
                                    {offer.kind === 'mix_match' && offer.price > 0 && <span className="shrink-0 rounded-full bg-primary-tint px-2.5 py-0.5 text-caption font-semibold text-primary-deep">{formatPrice(offer.price)}</span>}
                                    {offer.kind === 'bogo' && <span className="shrink-0 rounded-full bg-accent px-2.5 py-0.5 text-caption font-semibold text-ink">1 + 1</span>}
                                </Link>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}
