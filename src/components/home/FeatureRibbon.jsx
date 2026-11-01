import { Award, BadgeCheck, FlaskConical, HeartHandshake, Leaf, Lock, RotateCcw, Sparkles, Truck } from 'lucide-react';
import Marquee from '@/components/ui/Marquee';
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

/** What runs when the admin has not written their own: built from the store's real delivery and returns settings. */
export function defaultRibbonItems(content) {
    const threshold = content.delivery?.freeThreshold;
    const days = content.delivery?.returnDays;
    const { onlinePaymentEnabled = true, codEnabled = true } = content.payments ?? {};
    // Only promise the ways to pay that checkout really offers right now.
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

/** The running promise ribbon under the top banner: delivery, payments, purity. Items are editable in the admin. */
export default function FeatureRibbon() {
    const { content } = useSiteContent();
    const custom = content.extras?.ribbon?.items ?? [];
    const items = custom.length > 0 ? custom : defaultRibbonItems(content);

    return (
        <section aria-label="Why shop with us" className="bg-primary-deep text-white">
            <Marquee secondsPerItem={6}>
                {items.map((item) => {
                    const Icon = RIBBON_ICONS[item.icon] ?? BadgeCheck;
                    return (
                        <div key={item.title} className="flex items-center gap-3 border-r border-white/20 px-6 py-3.5 sm:px-10 sm:py-4">
                            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-white/12 text-accent-hover"><Icon size={20} aria-hidden="true" /></span>
                            <span className="leading-tight">
                                <span className="block text-small font-semibold">{item.title}</span>
                                {item.sub && <span className="block text-caption text-white/75">{item.sub}</span>}
                            </span>
                        </div>
                    );
                })}
            </Marquee>
        </section>
    );
}
