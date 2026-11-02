import { Link, NavLink } from 'react-router-dom';
import { useMemo } from 'react';
import { Crown } from 'lucide-react';
import Drawer from '@/components/ui/Drawer';
import Logo from '@/components/ui/Logo';
import { useCategoryLink } from '@/components/layout/CategoryNav';
import { useSiteContent } from '@/contexts/SiteContentContext';
import { useCategoryPlan } from '@/hooks/useCategoryPlan';
import { useCustomerSession } from '@/hooks/useCustomerSession';
import { useWhatsApp } from '@/hooks/useWhatsApp';
import { useOffers } from '@/hooks/useApi';
import WhatsAppIcon from '@/components/ui/WhatsAppIcon';
import { activeConcerns } from '@/utils/concerns';
import { ribbonItems } from '@/utils/ribbonMenu';
import { cn } from '@/utils/formatPrice';

/** Pages every shopper may need, always in the menu (the wishlist icon is hidden in the phone header). */
const ESSENTIAL_LINKS = [
    { label: 'Wishlist', href: '/wishlist' },
    { label: 'Track your order', href: '/track-order' },
    { label: 'Our story', href: '/about' },
    { label: 'Reviews', href: '/reviews' },
    { label: 'FAQ', href: '/faq' },
    { label: 'Contact us', href: '/contact' },
];

const row = 'block rounded-lg px-4 py-3 font-display text-h4 transition-colors';

function CategoryRow({ category, onClose }) {
    const link = useCategoryLink(category.slug);
    return (
        <Link
            to={link.to}
            onClick={onClose}
            aria-current={link.current ? 'true' : undefined}
            className={cn(row, link.current ? 'bg-primary-tint text-primary-deep' : 'text-ink hover:bg-primary-soft')}
        >
            {category.label}
        </Link>
    );
}

/**
 * Mobile menu. In the default (category) mode the shop comes first — All products, then each category — and the
 * info pages (About, FAQ, Contact …) follow as quieter links. In "custom links" mode it is just that link list.
 */
export default function MobileNav({ isOpen, onClose, links }) {
    const { content } = useSiteContent();
    const { plan } = useCategoryPlan();
    const { mode, showAll } = content.extras.nav;
    const categoryMode = mode !== 'links';
    const { user, isAuthenticated } = useCustomerSession();
    const { getWhatsAppUrl } = useWhatsApp();
    const { offers } = useOffers();
    const concerns = useMemo(() => activeConcerns(content.extras), [content.extras]);
    const ribbon = useMemo(() => Object.fromEntries(ribbonItems(content.extras).map((i) => [i.key, i.label])), [content.extras]);
    const ribbonMode = mode === 'ribbon';
    const clubOn = content.extras.club?.enabled !== false;
    const member = Boolean(isAuthenticated && user?.club?.member);
    const menuLinks = categoryMode
        ? [...ESSENTIAL_LINKS, ...links.filter((l) => !ESSENTIAL_LINKS.some((e) => e.href === l.href))]
        : links;

    return (
        <Drawer isOpen={isOpen} onClose={onClose} title="Menu" side="left">
            <nav aria-label="Mobile navigation" className="flex h-full flex-col">
                {ribbonMode && (
                    <>
                        <ul className="space-y-1">
                            {ribbon.new && <li><NavLink to="/new-launches" onClick={onClose} className={({ isActive }) => cn(row, 'flex items-center gap-2', isActive ? 'bg-primary-tint text-primary-deep' : 'text-ink hover:bg-primary-soft')}>{ribbon.new} <span className="rounded-full bg-accent px-2 py-px font-sans text-[11px] font-bold uppercase tracking-wide text-ink">New</span></NavLink></li>}
                            {ribbon.offers && <li><NavLink to="/offers" onClick={onClose} className={({ isActive }) => cn(row, 'flex items-center justify-between', isActive ? 'bg-primary-tint text-primary-deep' : 'text-ink hover:bg-primary-soft')}>{ribbon.offers}{offers.length > 0 && <span className="rounded-full bg-primary-tint px-2.5 py-0.5 font-sans text-caption font-semibold text-primary-deep">{offers.length} live</span>}</NavLink></li>}
                            {ribbon.club && clubOn && <li><NavLink to="/club" onClick={onClose} className={({ isActive }) => cn(row, 'flex items-center gap-2', isActive ? 'bg-primary-tint text-primary-deep' : 'text-ink hover:bg-primary-soft')}><Crown size={20} className="text-accent-ink" aria-hidden="true" />{member ? 'My Club Card' : ribbon.club}</NavLink></li>}
                            {ribbon.help && <li><a href={getWhatsAppUrl()} target="_blank" rel="noopener noreferrer" onClick={onClose} className={cn(row, 'flex items-center gap-2 text-ink hover:bg-primary-soft')}><WhatsAppIcon size={20} className="text-[#1FA855]" />{ribbon.help}</a></li>}
                        </ul>
                        {ribbon.concern && concerns.length > 0 && (
                            <>
                                <p className="eyebrow mb-2 mt-6 px-4">Shop by {ribbon.concern.toLowerCase()}</p>
                                <ul className="grid grid-cols-2 gap-1">
                                    {concerns.map((c) => <li key={c.slug}><Link to={`/concern/${c.slug}`} onClick={onClose} className="block rounded-lg px-4 py-2.5 text-small font-medium text-ink transition-colors hover:bg-primary-soft">{c.label}</Link></li>)}
                                </ul>
                            </>
                        )}
                        <p className="eyebrow mb-2 mt-6 px-4">Shop</p>
                    </>
                )}
                {categoryMode && (
                    <>
                        {!ribbonMode && <p className="eyebrow mb-2 px-4">Shop</p>}
                        <ul className="space-y-1">
                            {showAll && (
                                <li>
                                    <NavLink to="/shop" onClick={onClose} className={({ isActive }) => cn(row, isActive ? 'bg-primary-tint text-primary-deep' : 'text-ink hover:bg-primary-soft')}>All products</NavLink>
                                </li>
                            )}
                            {plan.map((category) => <li key={category.slug}><CategoryRow category={category} onClose={onClose} /></li>)}
                        </ul>
                        <p className="eyebrow mb-2 mt-6 px-4">Explore</p>
                    </>
                )}
                <ul className="space-y-1">
                    {menuLinks.filter((link) => !categoryMode || (link.href !== '/shop' && link.href !== '/')).map((link) => (
                        <li key={link.href}>
                            <NavLink
                                to={link.href}
                                end={link.href === '/'}
                                onClick={onClose}
                                className={({ isActive }) => cn(
                                    categoryMode ? 'block rounded-lg px-4 py-2.5 text-body font-medium transition-colors' : row,
                                    isActive ? 'bg-primary-tint text-primary-deep' : 'text-ink hover:bg-primary-soft',
                                )}
                            >
                                {link.label}
                            </NavLink>
                        </li>
                    ))}
                </ul>
                <div className="-mx-5 mt-auto bg-accent px-5 py-5">
                    <Logo size="md" />
                </div>
            </nav>
        </Drawer>
    );
}
