import { useState } from 'react';
import { Link } from 'react-router-dom';
import { X } from 'lucide-react';
import { useSiteContent } from '@/contexts/SiteContentContext';

const STORAGE_KEY = 'chikit-promo-dismissed';

function readDismissed() {
    try {
        return sessionStorage.getItem(STORAGE_KEY) === '1';
    } catch {
        return false;
    }
}

export default function AnnouncementBar() {
    const { content } = useSiteContent();
    const promo = content.promo;
    const [dismissed, setDismissed] = useState(readDismissed);

    if (!promo?.enabled || dismissed || content.sections?.promoBanner === false) return null;

    const dismiss = () => {
        setDismissed(true);
        try {
            sessionStorage.setItem(STORAGE_KEY, '1');
        } catch {
            /* storage unavailable — bar simply returns next visit */
        }
    };

    return (
        <div className="relative bg-primary-tint text-center text-small text-primary-deep">
            <Link to={promo.href || '/shop'} className="inline-block px-10 py-2.5 hover:underline">
                {promo.text} <strong className="font-semibold tracking-wide">{promo.code}</strong>
                {promo.suffix ? ` ${promo.suffix}` : ''}
            </Link>
            <button
                type="button"
                onClick={dismiss}
                className="absolute right-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-full hover:bg-primary/10"
                aria-label="Dismiss offer"
            >
                <X size={14} />
            </button>
        </div>
    );
}
