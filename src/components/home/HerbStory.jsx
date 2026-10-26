import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDown, ArrowRight, ArrowUpRight } from 'lucide-react';
import { LazyMotion, domAnimation, m, useMotionValue, useMotionValueEvent, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import Button from '@/components/ui/Button';
import { HERB_STORY } from '@/data/herbStory';
import { imageUrl } from '@/services/api';
import { formatPrice, cn } from '@/utils/formatPrice';

/**
 * "From herb to pack": particles on a deep plum stage gather into a tulsi leaf, break apart and regrow as an amla fruit,
 * an aloe plant and a neem sprig, then pour into the Chikit pack. Scrolling drives it (the section pins while the story
 * plays); each chapter's words, and the real products that herb goes into, are ordinary HTML. The WebGL code loads only
 * as the section comes near. Reduced motion, or no WebGL, gets the same chapters as a calm static grid instead.
 */

const { chapters, palette } = HERB_STORY;
const LAST = chapters.length - 1; // the pack
const HOLD = 0.42; // part of each chapter's scroll spent holding the shape still, so it can be read
const SPAN = LAST + HOLD;
const VH_PER_CHAPTER = 85;

/** Scroll progress (0..1) to the shape to show (0..LAST), holding each shape before the next one grows. */
function morphFor(p) {
    const raw = Math.min(SPAN, Math.max(0, p * SPAN));
    const k = Math.floor(raw);
    if (k >= LAST) return LAST;
    const f = raw - k;
    if (f <= HOLD) return k;
    const t = (f - HOLD) / (1 - HOLD);
    return k + t * t * (3 - 2 * t);
}
/** The scroll progress at the middle of a chapter's hold. */
const progressFor = (k) => Math.min(1, (k + HOLD / 2) / SPAN);

function hasWebGL() {
    try {
        const canvas = document.createElement('canvas');
        return Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'));
    } catch { return false; }
}

function FoundIn({ products }) {
    if (products.length === 0) return null;
    return (
        <div className="mt-5 sm:mt-6">
            <p className="mb-2 text-caption font-semibold uppercase tracking-[0.14em] text-white/60">Found in</p>
            <ul className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                {products.map((p) => (
                    <li key={p.id}>
                        <Link to={`/product/${p.id}`} className="group flex items-center gap-3 rounded-full bg-surface py-1.5 pl-1.5 pr-4 text-ink shadow-md transition-transform hover:-translate-y-0.5">
                            <img src={imageUrl(p.images?.[0], 96)} alt="" width="40" height="40" loading="lazy" className="size-10 shrink-0 rounded-full bg-canvas-alt object-cover" />
                            <span className="min-w-0">
                                <span className="block max-w-[13rem] truncate text-small font-medium">{p.title}</span>
                                <span className="block text-caption text-muted">{formatPrice(p.price)}</span>
                            </span>
                            <ArrowUpRight size={16} className="ml-1 shrink-0 text-primary transition-transform group-hover:rotate-45" aria-hidden="true" />
                        </Link>
                    </li>
                ))}
            </ul>
        </div>
    );
}

function ChapterText({ chapter, index, morph, active, products }) {
    const opacity = useTransform(morph, (v) => Math.max(0, 1 - Math.abs(v - index) * 2.6));
    const y = useTransform(morph, (v) => Math.max(-1, Math.min(1, index - v)) * 36);
    const isHerb = Boolean(chapter.name);
    const isPack = index === LAST;

    return (
        <m.div
            style={{ opacity, y }}
            className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end pb-24 sm:pb-28 lg:inset-y-0 lg:items-center lg:pb-0"
            aria-hidden={!active}
            inert={!active}
        >
            <div className="container-page w-full">
                <div className={cn('max-w-lg text-white', active && 'pointer-events-auto')}>
                    {isHerb ? (
                        <p className="mb-3 flex items-baseline gap-3 font-display text-white/70">
                            <span className="text-h3 text-accent">{String(index).padStart(2, '0')}</span>
                            <span className="text-small italic">{chapter.latin}</span>
                        </p>
                    ) : (
                        <p className="eyebrow mb-3 !text-accent">{chapter.eyebrow}</p>
                    )}
                    {isHerb && <p className="text-small font-medium uppercase tracking-[0.2em] text-white/80">{chapter.name} · {chapter.local}</p>}
                    <h2 className="mt-1 text-[clamp(2rem,1.4rem+3vw,3.75rem)] leading-[1.05] !text-white">{chapter.title}</h2>
                    <p className="mt-4 max-w-md text-body text-white/80 sm:text-lead">{chapter.copy}</p>
                    {isHerb && <FoundIn products={products} />}
                    {isPack && (
                        <div className="mt-7 flex flex-wrap gap-3">
                            <Link to={chapter.cta.href}><Button size="lg" variant="accent">{chapter.cta.label} <ArrowRight size={18} aria-hidden="true" /></Button></Link>
                            <Link to={chapter.secondary.href}><Button size="lg" variant="outline" className="!border-white/40 !text-white hover:!bg-white/10">{chapter.secondary.label}</Button></Link>
                        </div>
                    )}
                </div>
            </div>
        </m.div>
    );
}

/** Calm version: the same chapters, laid out as cards. For reduced motion and browsers without WebGL. */
function StaticHerbs({ productsFor }) {
    const intro = chapters[0];
    const pack = chapters[LAST];
    return (
        <section className="section bg-primary-deep text-white">
            <div className="container-page">
                <p className="eyebrow mb-3 !text-accent">{intro.eyebrow}</p>
                <h2 className="max-w-2xl !text-white">{intro.title}</h2>
                <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {chapters.slice(1, LAST).map((c) => (
                        <li key={c.id} className="rounded-xl bg-white/5 p-6 ring-1 ring-white/10">
                            <p className="font-display text-small italic text-white/60">{c.latin}</p>
                            <p className="mt-1 text-small font-medium uppercase tracking-[0.2em] text-accent">{c.name}</p>
                            <h3 className="mt-2 text-h4 !text-white">{c.title}</h3>
                            <p className="mt-2 text-small text-white/75">{c.copy}</p>
                            <FoundIn products={productsFor(c)} />
                        </li>
                    ))}
                </ul>
                <div className="mt-10 flex flex-wrap items-center gap-4">
                    <p className="max-w-md text-white/80">{pack.copy}</p>
                    <Link to={pack.cta.href}><Button variant="accent">{pack.cta.label} <ArrowRight size={16} aria-hidden="true" /></Button></Link>
                </div>
            </div>
        </section>
    );
}

export default function HerbStory({ products = [] }) {
    const reduced = useReducedMotion();
    const [webgl, setWebgl] = useState(null);
    useEffect(() => { setWebgl(hasWebGL()); }, []);

    const byId = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
    const productsFor = (chapter) => (chapter.productIds ?? []).map((id) => byId.get(id)).filter(Boolean);

    if (reduced || webgl === false) return <StaticHerbs productsFor={productsFor} />;
    return <LiveHerbStory productsFor={productsFor} />;
}

function LiveHerbStory({ productsFor }) {
    const outerRef = useRef(null);
    const canvasRef = useRef(null);
    const sceneRef = useRef(null);
    const [ready, setReady] = useState(false);
    const [active, setActive] = useState(0);
    const morph = useMotionValue(0);

    const { scrollYProgress } = useScroll({ target: outerRef, offset: ['start start', 'end end'] });
    useMotionValueEvent(scrollYProgress, 'change', (p) => {
        const v = morphFor(p);
        morph.set(v);
        sceneRef.current?.setMorph(v);
        const next = Math.round(v);
        setActive((a) => (a === next ? a : next));
    });
    const railFill = useTransform(scrollYProgress, [0, 1], [0, 1]);

    /* load three.js and build the scene once the section is near; run the loop only while it is on screen */
    useEffect(() => {
        const outer = outerRef.current;
        const canvas = canvasRef.current;
        if (!outer || !canvas) return undefined;
        let alive = true;
        let onScreen = false;
        let loading = false;

        const sync = () => {
            const scene = sceneRef.current;
            if (!scene) return;
            if (onScreen && !document.hidden) scene.start(); else scene.stop();
        };
        const load = async () => {
            if (loading) return;
            loading = true;
            const { createHerbScene } = await import('@/components/home/herbStory/scene');
            if (!alive) return;
            const small = window.matchMedia('(max-width: 640px)').matches || (navigator.hardwareConcurrency ?? 8) <= 4;
            try {
                sceneRef.current = createHerbScene(canvas, { count: small ? 7000 : 14000, palette });
            } catch {
                return; // WebGL context refused: the text still tells the story
            }
            sceneRef.current.jumpMorph(morphFor(scrollYProgress.get()));
            setReady(true);
            sync();
        };

        const near = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) load(); }, { rootMargin: '150% 0px' });
        const visible = new IntersectionObserver(([entry]) => { onScreen = entry.isIntersecting; sync(); });
        near.observe(outer);
        visible.observe(outer);
        const resize = new ResizeObserver(() => sceneRef.current?.resize());
        resize.observe(canvas);
        document.addEventListener('visibilitychange', sync);

        return () => {
            alive = false;
            near.disconnect(); visible.disconnect(); resize.disconnect();
            document.removeEventListener('visibilitychange', sync);
            sceneRef.current?.dispose();
            sceneRef.current = null;
        };
    }, [scrollYProgress]);

    const onPointerMove = (event) => {
        if (event.pointerType !== 'mouse') return;
        const rect = event.currentTarget.getBoundingClientRect();
        sceneRef.current?.setPointer(((event.clientX - rect.left) / rect.width) * 2 - 1, ((event.clientY - rect.top) / rect.height) * 2 - 1);
    };

    const scrollToChapter = (k) => {
        const outer = outerRef.current;
        if (!outer) return;
        const top = outer.getBoundingClientRect().top + window.scrollY;
        window.scrollTo({ top: top + (outer.offsetHeight - window.innerHeight) * progressFor(k), behavior: 'smooth' });
    };
    const skip = () => {
        const outer = outerRef.current;
        if (outer) window.scrollTo({ top: outer.getBoundingClientRect().bottom + window.scrollY, behavior: 'smooth' });
    };

    return (
        <LazyMotion features={domAnimation}>
            <section
                ref={outerRef}
                aria-label="From herb to pack: the plants inside Chikit"
                className="relative bg-primary-deep"
                style={{ height: `${chapters.length * VH_PER_CHAPTER + 100}svh` }}
            >
                <div className="sticky top-0 h-svh overflow-hidden" onPointerMove={onPointerMove} onPointerLeave={() => sceneRef.current?.setPointer(0, 0)}>
                    <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 70% 60% at 68% 45%, rgb(255 255 255 / 0.07), transparent 70%), radial-gradient(ellipse 120% 90% at 50% 50%, transparent 40%, rgb(0 0 0 / 0.38))' }} aria-hidden="true" />
                    <canvas ref={canvasRef} className={cn('absolute inset-0 size-full transition-opacity duration-1000', ready ? 'opacity-100' : 'opacity-0')} aria-hidden="true" />

                    {chapters.map((chapter, i) => (
                        <ChapterText key={chapter.id} chapter={chapter} index={i} morph={morph} active={i === active} products={productsFor(chapter)} />
                    ))}

                    <nav aria-label="Herb story chapters" className="absolute inset-x-0 bottom-5 sm:bottom-8">
                        <div className="container-page flex items-center justify-between gap-4">
                            <ol className="flex min-w-0 flex-1 items-center gap-1 sm:max-w-xl">
                                {chapters.slice(1, LAST).map((c, j) => {
                                    const k = j + 1;
                                    return (
                                        <li key={c.id} className="min-w-0 flex-1">
                                            <button type="button" onClick={() => scrollToChapter(k)} aria-current={active === k ? 'step' : undefined} className="group block w-full py-2 text-left">
                                                <span className={cn('block truncate text-caption font-medium transition-colors', active === k ? 'text-white' : 'text-white/45 group-hover:text-white/80')}>{c.name}</span>
                                                <span className={cn('mt-1.5 block h-0.5 rounded-full transition-colors', active >= k ? 'bg-accent' : 'bg-white/20')} />
                                            </button>
                                        </li>
                                    );
                                })}
                            </ol>
                            <button type="button" onClick={skip} className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-2 text-caption font-medium text-white/70 ring-1 ring-white/20 transition-colors hover:bg-white/10 hover:text-white">
                                Skip <ArrowDown size={14} aria-hidden="true" />
                            </button>
                        </div>
                    </nav>
                    <m.span className="absolute inset-x-0 top-0 h-0.5 origin-left bg-accent/70" style={{ scaleX: railFill }} aria-hidden="true" />
                </div>
            </section>
        </LazyMotion>
    );
}
