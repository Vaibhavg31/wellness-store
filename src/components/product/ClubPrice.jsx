import { Link } from 'react-router-dom';
import { Crown } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { useSiteContent } from '@/contexts/SiteContentContext';
import { formatPrice, cn } from '@/utils/formatPrice';

/**
 * The Chikit Club price on a product: members see it as their price (the badge), everyone else sees what joining would
 * save: "₹90 for Club members". Renders nothing when the product has no member price or the club is switched off.
 */
export default function ClubPrice({ memberPrice, className, compact = false }) {
    const { isMember } = useCart();
    const { content } = useSiteContent();
    const club = content.extras?.club;
    if (!memberPrice || club?.enabled === false) return null;

    if (isMember) {
        return (
            <span className={cn('inline-flex items-center gap-1 rounded-md bg-accent-tint px-2 py-0.5 text-caption font-semibold text-accent-ink', className)}>
                <Crown size={12} aria-hidden="true" /> Club price
            </span>
        );
    }
    return (
        <Link
            to="/club"
            className={cn('inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-accent-tint px-2.5 py-1 text-caption font-semibold text-primary transition-colors hover:bg-accent', // compact: a small chip on a card; its tap area still grows to a thumb's size.
                compact && "relative px-2 py-0.5 text-[11px] before:absolute before:-inset-x-1 before:-inset-y-3 before:content-['']", className)}
        >
            <Crown size={compact ? 11 : 13} aria-hidden="true" />
            {formatPrice(memberPrice)} <span className="font-medium">{compact ? 'Club price' : 'for Chikit Club members'}</span>
        </Link>
    );
}
