import { Link } from 'react-router-dom';
import { ArrowRight, Check, Crown } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { useSiteContent } from '@/contexts/SiteContentContext';
import { clubSavings } from '@/utils/pricing';
import { formatPrice, cn } from '@/utils/formatPrice';

/**
 * Chikit Club status in the bag and at checkout, where the money is decided. A member sees what the Club is saving on this order;
 * a guest sees what joining would save and a one-tap way to join. Shows nothing when the Club is off or nothing in the bag has a
 * Chikit Club price.
 */
export default function ClubSavings({ className, onNavigate }) {
    const { items, isMember } = useCart();
    const { content } = useSiteContent();
    if (content.extras?.club?.enabled === false) return null;
    const { applied, potential } = clubSavings(items, isMember);

    if (isMember) {
        if (applied <= 0) return null;
        return (
            <div className={cn('flex items-center gap-3 rounded-xl bg-success-tint px-4 py-3', className)}>
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-success text-white"><Check size={17} strokeWidth={3} aria-hidden="true" /></span>
                <p className="text-small leading-snug text-ink"><strong className="block text-success">Chikit Club savings {formatPrice(applied)}</strong>Your Chikit Club member prices are applied to this order.</p>
            </div>
        );
    }
    if (potential <= 0) return null;
    return (
        <Link to="/club" onClick={onNavigate} className={cn('group flex items-center gap-3 rounded-xl bg-accent px-4 py-3 text-primary-deep transition-colors hover:bg-accent-hover', className)}>
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary text-accent"><Crown size={17} aria-hidden="true" /></span>
            <span className="min-w-0 flex-1 text-small leading-snug"><strong className="block">Save {formatPrice(potential)} on this order</strong>Join the Chikit Club. It is free.</span>
            <ArrowRight size={18} className="shrink-0 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
        </Link>
    );
}
