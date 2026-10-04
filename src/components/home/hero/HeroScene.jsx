import { useEffect, useRef, useState } from 'react';
import { createHeroScene } from './createHeroScene';

/**
 * Mounts the Three.js leaf wreath over the hero, orbiting `anchorRef` (the product image).
 * Loaded lazily (see Hero.jsx) so the 3D library never blocks first paint. Pauses when scrolled
 * away or the tab is hidden, and tears everything down on unmount.
 */
export default function HeroScene({ sectionRef, anchorRef, count }) {
    const canvasRef = useRef(null);
    const [ready, setReady] = useState(false);

    useEffect(() => {
        const canvas = canvasRef.current;
        const section = sectionRef.current;
        const anchor = anchorRef.current;
        if (!canvas || !section || !anchor) return undefined;

        let scene;
        try {
            scene = createHeroScene(canvas, { count });
        } catch {
            return undefined; // WebGL unavailable — the static hero remains
        }

        const syncAnchor = () => {
            const a = anchor.getBoundingClientRect();
            const c = canvas.getBoundingClientRect();
            scene.setAnchor({ cx: a.left - c.left + a.width / 2, cy: a.top - c.top + a.height / 2, hw: a.width / 2, hh: a.height / 2 });
        };

        let inView = true;
        const sync = () => (inView && !document.hidden ? scene.start() : scene.stop());

        const io = new IntersectionObserver(([entry]) => { inView = entry.isIntersecting; sync(); }, { threshold: 0 });
        io.observe(section);
        const ro = new ResizeObserver(() => { scene.resize(); syncAnchor(); });
        ro.observe(canvas);
        ro.observe(anchor);

        const onScroll = () => {
            const rect = section.getBoundingClientRect();
            scene.setScroll(-rect.top / Math.max(1, rect.height * 0.9));
        };
        const onPointer = (e) => scene.setPointer((e.clientX / window.innerWidth) * 2 - 1, (e.clientY / window.innerHeight) * 2 - 1);
        const canHover = window.matchMedia('(hover: hover)').matches;

        window.addEventListener('scroll', onScroll, { passive: true });
        if (canHover) window.addEventListener('pointermove', onPointer, { passive: true });
        document.addEventListener('visibilitychange', sync);
        window.addEventListener('load', syncAnchor);
        syncAnchor();
        onScroll();
        sync();
        setReady(true);

        return () => {
            io.disconnect();
            ro.disconnect();
            window.removeEventListener('scroll', onScroll);
            window.removeEventListener('pointermove', onPointer);
            window.removeEventListener('load', syncAnchor);
            document.removeEventListener('visibilitychange', sync);
            scene.dispose();
        };
    }, [sectionRef, anchorRef, count]);

    return (
        <canvas
            ref={canvasRef}
            aria-hidden="true"
            className={`pointer-events-none absolute inset-0 z-20 size-full transition-opacity duration-1000 ${ready ? 'opacity-100' : 'opacity-0'}`}
        />
    );
}
