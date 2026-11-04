const COLORS = ['#602460', '#FEE1C5', '#C9A227', '#FFFFFF', '#8E3F8E', '#F2B880'];

/**
 * A short burst of confetti over the page (about 3 seconds), drawn on one temporary canvas that removes itself.
 * Does nothing for visitors who asked their device for reduced motion. Safe to call from anywhere.
 */
export function celebrate({ pieces = 140 } = {}) {
    if (typeof document === 'undefined' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const canvas = document.createElement('canvas');
    canvas.setAttribute('aria-hidden', 'true');
    Object.assign(canvas.style, { position: 'fixed', inset: '0', width: '100%', height: '100%', pointerEvents: 'none', zIndex: '400' });
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    document.body.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    // Two cannons low on each side shoot up and inwards, then everything falls.
    const parts = Array.from({ length: pieces }, (_, i) => {
        const left = i % 2 === 0;
        const angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.9 + (left ? 0.45 : -0.45);
        const speed = 9 + Math.random() * 9;
        return {
            x: left ? w * 0.08 : w * 0.92,
            y: h * 0.78,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            size: 6 + Math.random() * 6,
            color: COLORS[Math.floor(Math.random() * COLORS.length)],
            spin: Math.random() * Math.PI,
            vs: (Math.random() - 0.5) * 0.4,
            round: Math.random() < 0.3,
        };
    });

    const started = performance.now();
    const frame = (now) => {
        const t = now - started;
        ctx.clearRect(0, 0, w, h);
        for (const p of parts) {
            p.vy += 0.28; // gravity
            p.vx *= 0.992;
            p.x += p.vx;
            p.y += p.vy;
            p.spin += p.vs;
            ctx.save();
            ctx.globalAlpha = Math.max(0, Math.min(1, (3200 - t) / 700));
            ctx.translate(p.x, p.y);
            ctx.rotate(p.spin);
            ctx.fillStyle = p.color;
            if (p.round) { ctx.beginPath(); ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2); ctx.fill(); } else ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
            ctx.restore();
        }
        if (t < 3200) requestAnimationFrame(frame);
        else canvas.remove();
    };
    requestAnimationFrame(frame);
}
