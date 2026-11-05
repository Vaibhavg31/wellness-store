import { Link } from 'react-router-dom';
import Marquee from '@/components/ui/Marquee';
import { useSiteContent } from '@/contexts/SiteContentContext';
import { formatPrice } from '@/utils/formatPrice';

/**
 * The thin running ribbon at the very top: the coupon line, the admin's own announcements, and (when the admin has
 * added none) the store's standing promises. Always on screen, so nothing hides it.
 */
export default function AnnouncementBar() {
    const { content } = useSiteContent();
    const { promo, extras } = content;

    const promoOn = promo?.enabled && content.sections?.promoBanner !== false;
    const messages = [
        ...(promoOn ? [{ key: 'promo', href: promo.href || '/shop', node: <>{promo.text} <strong className="font-semibold tracking-wide">{promo.code}</strong>{promo.suffix ? ` ${promo.suffix}` : ''}</> }] : []),
        ...extras.announcements.map((a, i) => ({ key: `extra-${i}`, href: a.href, node: a.text })),
    ];
    if (messages.length === 0) return null;

    // A single message would run alone; pair it with the delivery promise so the ribbon always has something to say.
    const threshold = content.delivery?.freeThreshold;
    if (messages.length < 2 && threshold) messages.push({ key: 'delivery', href: '/shipping-policy', node: `Free delivery on orders above ${formatPrice(threshold)}` });

    return (
        <div role="region" aria-label="Announcements" className="bg-primary text-white">
            <Marquee secondsPerItem={5.3}>
                {messages.map((m) => {
                    const body = <span className="inline-flex items-center gap-8 px-4 py-2 text-caption sm:text-small">{m.node}<span aria-hidden="true" className="size-1 rounded-full bg-accent" /></span>;
                    return m.href
                        ? <Link key={m.key} to={m.href} className="inline-block hover:underline">{body}</Link>
                        : <span key={m.key} className="inline-block">{body}</span>;
                })}
            </Marquee>
        </div>
    );
}
