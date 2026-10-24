import { Check } from 'lucide-react';
import { useSiteContent } from '@/contexts/SiteContentContext';

export default function TrustStrip() {
    const { content } = useSiteContent();
    const items = content.marquee?.items ?? [];
    if (items.length === 0) return null;

    return (
        <section aria-label="Why shop with us" className="border-y border-line bg-surface">
            <ul className="container-page scrollbar-none flex gap-x-7 overflow-x-auto py-4 sm:flex-wrap sm:justify-center sm:gap-x-10 sm:gap-y-3 sm:overflow-visible sm:py-5">
                {items.map((item) => (
                    <li key={item} className="flex shrink-0 items-center gap-2 whitespace-nowrap text-small font-medium text-ink">
                        <Check size={16} className="text-success" aria-hidden="true" /> {item}
                    </li>
                ))}
            </ul>
        </section>
    );
}
