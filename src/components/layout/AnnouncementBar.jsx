import { Link } from 'react-router-dom';
import { Crown } from 'lucide-react';
import Marquee from '@/components/ui/Marquee';
import { useCart } from '@/contexts/CartContext';
import { useSiteContent } from '@/contexts/SiteContentContext';
import { formatPrice } from '@/utils/formatPrice';

/**
 * The running ribbon at the very top: the coupon line, the admin's own announcements and, when there are none, the store's
 * standing promises. A Club member sees one extra line confirming their prices are on, so the status is felt before any product.
 */
export default function AnnouncementBar() {
    const { content } = useSiteContent();
    const { isMember } = useCart();
    const { promo, extras } = content;

    const promoOn = promo?.enabled && content.sections?.promoBanner !== false;
    const messages = [
        ...(isMember ? [{ key: 'member', href: '/club', node: <span className="inline-flex items-center gap-1.5 font-semibold text-gold-soft"><Crown size={13} aria-hidden="true" /> Club prices are on for you</span> }] : []),
        ...(promoOn ? [{ key: 'promo', href: promo.href || '/shop', node: <>{promo.text} <strong className="font-bold tracking-wide text-accent">{promo.code}</strong>{promo.suffix ? ` ${promo.suffix}` : ''}</> }] : []),
        ...extras.announcements.map((a, i) => ({ key: `extra-${i}`, href: a.href, node: a.text })),
    ];
    if (messages.length === 0) return null;

    const threshold = content.delivery?.freeThreshold;
    if (messages.length < 2 && threshold) messages.push({ key: 'delivery', href: '/shipping-policy', node: `Free delivery on orders above ${formatPrice(threshold)}` });

    return (
        <div role="region" aria-label="Announcements" className="bg-primary-night text-white/90">
            <Marquee secondsPerItem={9}>
                {messages.map((m) => {
                    const body = <span className="inline-flex items-center gap-8 px-4 py-2 text-caption font-medium tracking-wide sm:text-small">{m.node}<span aria-hidden="true" className="size-1 rounded-full bg-peach" /></span>;
                    return m.href
                        ? <Link key={m.key} to={m.href} className="inline-block hover:text-white">{body}</Link>
                        : <span key={m.key} className="inline-block">{body}</span>;
                })}
            </Marquee>
        </div>
    );
}
