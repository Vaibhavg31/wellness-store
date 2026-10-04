import { Link, NavLink } from 'react-router-dom';
import Drawer from '@/components/ui/Drawer';
import Logo from '@/components/ui/Logo';
import { useCategoryLink } from '@/components/layout/CategoryNav';
import { useSiteContent } from '@/contexts/SiteContentContext';
import { useCategoryPlan } from '@/hooks/useCategoryPlan';
import { cn } from '@/utils/formatPrice';

const row = 'block rounded-lg px-4 py-3 font-display text-h4 transition-colors';

function CategoryRow({ category, onClose }) {
    const link = useCategoryLink(category.slug);
    return (
        <Link
            to={link.to}
            onClick={(event) => { link.onClick(event); onClose(); }}
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
    const categoryMode = mode === 'categories';

    return (
        <Drawer isOpen={isOpen} onClose={onClose} title="Menu" side="left">
            <nav aria-label="Mobile navigation" className="flex h-full flex-col">
                {categoryMode && (
                    <>
                        <p className="eyebrow mb-2 px-4">Shop</p>
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
                    {links.filter((link) => !categoryMode || (link.href !== '/shop' && link.href !== '/')).map((link) => (
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
                <div className="mt-auto pt-8">
                    <Logo size="md" />
                </div>
            </nav>
        </Drawer>
    );
}
