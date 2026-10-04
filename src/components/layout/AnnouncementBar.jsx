import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { X } from 'lucide-react';
import { useSiteContent } from '@/contexts/SiteContentContext';

const STORAGE_KEY = 'chikit-promo-dismissed';
const ROTATE_MS = 5000;

function readDismissed() {
    try {
        return sessionStorage.getItem(STORAGE_KEY) === '1';
    } catch {
        return false;
    }
}

const prefersReducedMotion = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Top strip: the main promo plus any extra admin messages, shown one at a time and rotating. */
export default function AnnouncementBar() {
    const { content } = useSiteContent();
    const { promo, extras } = content;
    const [dismissed, setDismissed] = useState(readDismissed);
    const [index, setIndex] = useState(0);
    const [paused, setPaused] = useState(false);

    const promoOn = promo?.enabled && content.sections?.promoBanner !== false;
    const messages = [
        ...(promoOn ? [{ key: 'promo', href: promo.href || '/shop', node: <>{promo.text} <strong className="font-semibold tracking-wide">{promo.code}</strong>{promo.suffix ? ` ${promo.suffix}` : ''}</> }] : []),
        ...extras.announcements.map((a, i) => ({ key: `extra-${i}`, href: a.href, node: a.text })),
    ];
    const count = messages.length;

    useEffect(() => {
        if (count < 2 || paused || prefersReducedMotion()) return undefined;
        const timer = setInterval(() => setIndex((i) => (i + 1) % count), ROTATE_MS);
        return () => clearInterval(timer);
    }, [count, paused]);

    if (count === 0 || dismissed) return null;

    const dismiss = () => {
        setDismissed(true);
        try {
            sessionStorage.setItem(STORAGE_KEY, '1');
        } catch {
            /* storage unavailable — bar simply returns next visit */
        }
    };

    const current = messages[index % count];
    const body = current.href
        ? <Link to={current.href} className="inline-block px-10 py-2.5 hover:underline">{current.node}</Link>
        : <span className="inline-block px-10 py-2.5">{current.node}</span>;

    return (
        <div
            className="relative bg-primary-tint text-center text-small text-primary-deep"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
            onFocus={() => setPaused(true)}
            onBlur={() => setPaused(false)}
        >
            <div key={current.key} className="animate-fade-in">{body}</div>
            <button
                type="button"
                onClick={dismiss}
                className="absolute right-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-full hover:bg-primary/10"
                aria-label="Dismiss announcements"
            >
                <X size={14} />
            </button>
        </div>
    );
}
