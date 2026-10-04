import { Link } from 'react-router-dom';
import { LayoutDashboard, Package, FolderOpen, Star, MessageSquare, Settings, ShoppingBag, PenLine, Tag, Gift, UserPlus, Users, Images } from 'lucide-react';
import { ADMIN_PATH } from '@/contexts/AuthContext';
import { cn } from '@/utils/formatPrice';

// Banners are managed inline in Content Manager → Homepage, so they have no nav item of their own.
export const adminNavGroups = [
    {
        label: 'Overview',
        items: [{ label: 'Dashboard', href: ADMIN_PATH, icon: LayoutDashboard }],
    },
    {
        label: 'Catalog',
        items: [
            { label: 'Products', href: `${ADMIN_PATH}/products`, icon: Package },
            { label: 'Categories', href: `${ADMIN_PATH}/categories`, icon: FolderOpen },
            { label: 'Bundles', href: `${ADMIN_PATH}/bundles`, icon: Gift },
            { label: 'Coupons', href: `${ADMIN_PATH}/coupons`, icon: Tag },
        ],
    },
    {
        label: 'Sales',
        items: [
            { label: 'Orders', href: `${ADMIN_PATH}/orders`, icon: ShoppingBag },
            { label: 'Direct Orders', href: `${ADMIN_PATH}/direct-orders`, icon: UserPlus },
        ],
    },
    {
        label: 'Customers',
        items: [
            { label: 'Users', href: `${ADMIN_PATH}/users`, icon: Users },
            { label: 'Reviews', href: `${ADMIN_PATH}/reviews`, icon: Star },
            { label: 'Feedback', href: `${ADMIN_PATH}/feedback`, icon: MessageSquare },
        ],
    },
    {
        label: 'Site',
        items: [
            { label: 'Content', href: `${ADMIN_PATH}/content`, icon: PenLine },
            { label: 'Media Library', href: `${ADMIN_PATH}/media`, icon: Images },
            { label: 'Settings', href: `${ADMIN_PATH}/settings`, icon: Settings },
        ],
    },
];

export const adminNavItems = adminNavGroups.flatMap((group) => group.items);

export function getAdminPageTitle(pathname) {
    if (pathname.endsWith('/products/new')) return 'Add Product';
    if (pathname.match(/\/products\/[^/]+$/) && !pathname.endsWith('/products')) return 'Edit Product';

    const match = adminNavItems.find(
        (item) => pathname === item.href || (item.href !== ADMIN_PATH && pathname.startsWith(item.href)),
    );
    return match?.label ?? 'Studio Admin';
}

export default function AdminNavLinks({ location, onNavigate, className = 'flex-1 min-h-0 space-y-3.5 overflow-y-auto p-2.5', mobile = false }) {
    return (
        <nav aria-label="Admin" className={className}>
            {adminNavGroups.map((group) => (
                <div key={group.label}>
                    <p className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-admin-muted">{group.label}</p>
                    <ul className="space-y-0.5">
                        {group.items.map((item) => {
                            const active =
                                location.pathname === item.href ||
                                (item.href !== ADMIN_PATH && location.pathname.startsWith(item.href));
                            return (
                                <li key={item.href}>
                                    <Link
                                        to={item.href}
                                        onClick={onNavigate}
                                        aria-current={active ? 'page' : undefined}
                                        className={cn(
                                            'relative flex items-center gap-3 rounded-lg px-3 text-small font-medium transition-colors',
                                            mobile ? 'min-h-11 py-2.5' : 'py-1.5',
                                            active ? 'bg-primary-tint text-primary-deep' : 'text-ink hover:bg-primary-soft hover:text-primary',
                                        )}
                                    >
                                        {active && <span className="absolute inset-y-1.5 left-0 w-[3px] rounded-full bg-primary" aria-hidden="true" />}
                                        <item.icon size={18} strokeWidth={1.75} className={active ? 'text-primary' : 'text-admin-muted'} aria-hidden="true" />
                                        {item.label}
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            ))}
        </nav>
    );
}
