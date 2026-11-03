import { Award, BadgeCheck, FlaskConical, HeartHandshake, Leaf, Lock, RotateCcw, Sparkles, Truck } from 'lucide-react';
import { useSiteContent } from '@/contexts/SiteContentContext';
import { formatPrice } from '@/utils/formatPrice';

/** Icon names an admin can pick for a ribbon item. */
export const RIBBON_ICONS = {
    truck: Truck,
    lock: Lock,
    leaf: Leaf,
    flask: FlaskConical,
    return: RotateCcw,
    check: BadgeCheck,
    award: Award,
    sparkles: Sparkles,
    heart: HeartHandshake,
};

/** What shows when the admin has not written their own: built from the store's real delivery and returns settings. */
export function defaultRibbonItems(content) {
    const threshold = content.delivery?.freeThreshold;
    const days = content.delivery?.returnDays;
    const { onlinePaymentEnabled = true, codEnabled = true } = content.payments ?? {};
    const payment = onlinePaymentEnabled
        ? { icon: 'lock', title: 'Secure Payments', sub: codEnabled ? 'UPI, cards & COD available' : 'UPI, cards & net banking' }
        : { icon: 'lock', title: 'Cash on Delivery', sub: 'Pay when your order arrives' };
    return [
        { icon: 'truck', title: 'Free Delivery', sub: threshold ? `On all orders above ${formatPrice(threshold)}` : 'On eligible orders' },
        payment,
        { icon: 'leaf', title: 'Pure Herbs', sub: 'Authentic Ayurvedic formulations' },
        { icon: 'flask', title: 'Lab Tested', sub: 'FSSAI & GMP certified' },
        ...(days ? [{ icon: 'return', title: 'Easy Returns', sub: `${days}-day hassle-free returns` }] : []),
    ];
}

/** The promise strip under the hero: four to five reasons to trust the shop, in a calm beige row (editable in the admin). */
export default function FeatureRibbon() {
    const { content } = useSiteContent();
    const custom = content.extras?.ribbon?.items ?? [];
    const items = custom.length > 0 ? custom : defaultRibbonItems(content);

    return (
        <section aria-label="Why shop with us" className="border-y border-line bg-accent-tint">
            <ul className="container-page scrollbar-none flex gap-8 overflow-x-auto py-4 lg:justify-between">
                {items.map((item) => {
                    const Icon = RIBBON_ICONS[item.icon] ?? BadgeCheck;
                    return (
                        <li key={item.title} className="flex shrink-0 items-center gap-3">
                            <span className="grid size-10 place-items-center rounded-full bg-accent text-primary"><Icon size={19} strokeWidth={1.7} aria-hidden="true" /></span>
                            <span className="leading-tight">
                                <span className="block text-small font-bold text-ink">{item.title}</span>
                                {item.sub && <span className="block text-caption text-muted">{item.sub}</span>}
                            </span>
                        </li>
                    );
                })}
            </ul>
        </section>
    );
}
