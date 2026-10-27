import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { ArrowUp } from 'lucide-react';
import { cn } from '@/utils/formatPrice';

/** Appears after a long scroll on larger screens (phones scroll back with a tap on the status bar and already have a crowded bottom edge). Hidden where a sticky buy bar sits at the bottom. */
export default function BackToTop() {
    const { pathname } = useLocation();
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        let frame = 0;
        const update = () => { frame = 0; setVisible(window.scrollY > 1400); };
        const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
        update();
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => { window.removeEventListener('scroll', onScroll); if (frame) cancelAnimationFrame(frame); };
    }, [pathname]);

    if (pathname.startsWith('/product/') || pathname.startsWith('/checkout')) return null;

    const toTop = () => window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });

    return (
        <button
            type="button"
            onClick={toTop}
            aria-label="Back to top"
            tabIndex={visible ? 0 : -1}
            className={cn(
                'fixed bottom-24 right-6 z-40 hidden size-11 place-items-center rounded-full border border-line bg-surface text-primary shadow-md sm:grid',
                'transition-[opacity,transform] duration-300 hover:bg-primary-tint',
                visible ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-3 opacity-0',
            )}
        >
            <ArrowUp size={20} aria-hidden="true" />
        </button>
    );
}
