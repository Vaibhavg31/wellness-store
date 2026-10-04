import { Check } from 'lucide-react';
import { useSiteContent } from '@/contexts/SiteContentContext';

export default function TrustStrip() {
    const { content } = useSiteContent();
    const items = content.marquee?.items ?? [];
    if (items.length === 0) return null;

    return (
        <section aria-label="Why shop with us" className="border-y border-line bg-surface">
            <ul className="container-page flex flex-wrap justify-center gap-x-10 gap-y-3 py-5">
                {items.map((item) => (
                    <li key={item} className="flex items-center gap-2 text-small font-medium text-ink">
                        <Check size={16} className="text-success" aria-hidden="true" /> {item}
                    </li>
                ))}
            </ul>
        </section>
    );
}
