import { Link } from 'react-router-dom';
import { LayoutDashboard, Package, FolderOpen, Star, MessageSquare, Settings, ShoppingBag, PenLine, Tag, Gift, UserPlus, Users, Images } from 'lucide-react';
import { ADMIN_PATH } from '@/contexts/AuthContext';

// Banners used to be its own nav item — its upload/management UI now lives
// inline inside Content Manager → Homepage (the Banner Slider / Promo
// Banners section rows), so there's one place to manage homepage sections
// instead of two.
export const adminNavItems = [
    { label: 'Dashboard', href: ADMIN_PATH, icon: LayoutDashboard },
    { label: 'Products', href: `${ADMIN_PATH}/products`, icon: Package },
    { label: 'Categories', href: `${ADMIN_PATH}/categories`, icon: FolderOpen },
    { label: 'Orders', href: `${ADMIN_PATH}/orders`, icon: ShoppingBag },
    { label: 'Direct Orders', href: `${ADMIN_PATH}/direct-orders`, icon: UserPlus },
    { label: 'Coupons', href: `${ADMIN_PATH}/coupons`, icon: Tag },
    { label: 'Bundles', href: `${ADMIN_PATH}/bundles`, icon: Gift },
    { label: 'Users', href: `${ADMIN_PATH}/users`, icon: Users },
    { label: 'Reviews', href: `${ADMIN_PATH}/reviews`, icon: Star },
    { label: 'Feedback', href: `${ADMIN_PATH}/feedback`, icon: MessageSquare },
    { label: 'Content', href: `${ADMIN_PATH}/content`, icon: PenLine },
    { label: 'Media Library', href: `${ADMIN_PATH}/media`, icon: Images },
    { label: 'Settings', href: `${ADMIN_PATH}/settings`, icon: Settings },
];

export function getAdminPageTitle(pathname) {
    if (pathname.endsWith('/products/new')) return 'Add Product';
    if (pathname.match(/\/products\/[^/]+$/) && !pathname.endsWith('/products')) return 'Edit Product';

    const match = adminNavItems.find(
        (item) => pathname === item.href || (item.href !== ADMIN_PATH && pathname.startsWith(item.href)),
    );
    return match?.label ?? 'Studio Admin';
}

export default function AdminNavLinks({
    location,
    onNavigate,
    className = 'flex-1 min-h-0 p-3 space-y-0.5 overflow-y-auto',
    mobile = false,
}) {
    return (
        <nav className={className}>
            {adminNavItems.map((item) => {
                const active =
                    location.pathname === item.href ||
                    (item.href !== ADMIN_PATH && location.pathname.startsWith(item.href));
                return (
                    <Link
                        key={item.href}
                        to={item.href}
                        onClick={onNavigate}
                        className={`flex items-center gap-3 px-3 rounded-lg font-medium transition-all duration-150 ${
                            mobile ? 'py-3 text-sm min-h-[44px]' : 'py-2.5 text-[13px]'
                        } ${
                            active
                                ? 'bg-cream/12 text-turmeric-light shadow-sm'
                                : 'text-cream/75 hover:bg-cream/8 hover:text-cream active:bg-cream/10'
                        }`}
                    >
                        <item.icon size={17} strokeWidth={1.5} className={active ? 'text-turmeric' : 'text-cream/50'} />
                        {item.label}
                    </Link>
                );
            })}
        </nav>
    );
}
