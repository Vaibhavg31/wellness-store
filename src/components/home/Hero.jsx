import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Leaf, ShieldCheck, Star } from 'lucide-react';
import Button from '@/components/ui/Button';
import Price from '@/components/ui/Price';
import ErrorBoundary from '@/components/ui/ErrorBoundary';
import TiltCard from '@/components/home/hero/TiltCard';
import { useSiteContent } from '@/contexts/SiteContentContext';
import { imageUrl } from '@/services/api';

// Three.js is a separate chunk, fetched only after first paint and only when the device can run it well.
const HeroScene = lazy(() => import('@/components/home/hero/HeroScene'));

const BADGE_ICONS = { shield: ShieldCheck, star: Star, sparkles: Leaf };

function webglAvailable() {
    try {
        const c = document.createElement('canvas');
        return Boolean(c.getContext('webgl2') || c.getContext('webgl'));
    } catch {
        return false;
    }
}

/** 3D is skipped for reduced-motion, data-saver and no-WebGL — those visitors get the clean static hero. Everyone else gets it on first interaction. */
function useSceneSettings() {
    const [settings, setSettings] = useState(null);
    useEffect(() => {
        const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const saveData = navigator.connection?.saveData === true;
        if (reduced || saveData || !webglAvailable()) return undefined;
        const small = window.innerWidth < 768;
        const lowPower = (navigator.hardwareConcurrency ?? 8) <= 4;
        const count = Math.round((small ? 40 : 85) * (lowPower ? 0.6 : 1));
        // Wake the scene on the first sign of a real visitor, so the 3D library never competes with first paint.
        const events = ['pointermove', 'pointerdown', 'scroll', 'keydown', 'touchstart'];
        const start = () => {
            events.forEach((name) => window.removeEventListener(name, start));
            setSettings({ count });
        };
        events.forEach((name) => window.addEventListener(name, start, { passive: true }));
        return () => events.forEach((name) => window.removeEventListener(name, start));
    }, []);
    return settings;
}

/** Words slide up from a mask one after another. Screen readers get the plain text via the h1's aria-label. */
function Words({ text, delay = 0, className }) {
    const words = text.split(' ');
    return (
        <>
            {words.map((word, i) => (
                <span key={`${word}-${i}`} className="-mb-1 inline-block overflow-hidden pb-1 align-bottom">
                    <span className={`inline-block animate-word-up ${className ?? ''}`} style={{ animationDelay: `${delay + i * 80}ms` }}>
                        {word}
                        {i < words.length - 1 ? ' ' : ''}
                    </span>
                </span>
            ))}
        </>
    );
}

export default function Hero({ products, loading = false }) {
    const { content } = useSiteContent();
    const hero = content.hero;
    const sectionRef = useRef(null);
    const anchorRef = useRef(null);
    const scene = useSceneSettings();

    const withImage = useMemo(() => products.filter((p) => p.images?.[0]), [products]);
    // An admin-pinned product drives the hero image; otherwise the image comes straight from site
    // content so it can start loading before the catalogue request returns (keeps LCP early).
    const pinned = hero.featuredProductId ? withImage.find((p) => p.id === hero.featuredProductId) : null;
    const featured = pinned ?? withImage.find((p) => p.isBestSeller) ?? withImage[0] ?? null;
    const waitingForPinned = Boolean(hero.featuredProductId) && loading;
    const image = pinned?.images[0] ?? hero.images?.[0] ?? featured?.images?.[0];
    const headlineWords = hero.headline.split(' ').length;

    return (
        <section ref={sectionRef} className="relative isolate overflow-hidden bg-canvas">
            {/* Soft botanical glow — static, and the whole backdrop when 3D is off */}
            <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
                <div className="absolute -right-24 -top-24 size-[34rem] rounded-full bg-primary-tint opacity-80 blur-3xl" />
                <div className="absolute -bottom-32 left-[-8rem] size-[28rem] rounded-full bg-accent-tint blur-3xl" />
            </div>

            {scene && (
                <ErrorBoundary>
                    <Suspense fallback={null}>
                        <HeroScene sectionRef={sectionRef} anchorRef={anchorRef} count={scene.count} />
                    </Suspense>
                </ErrorBoundary>
            )}

            <div className="container-page grid min-h-[calc(100svh-8rem)] items-center gap-12 py-12 lg:grid-cols-2 lg:gap-16 lg:py-16">
                <div className="relative z-30">
                    {hero.badge && (
                        <p className="mb-5 inline-flex animate-fade-up items-center gap-2 rounded-full border border-primary/15 bg-surface/80 px-4 py-1.5 text-caption font-semibold text-primary-deep backdrop-blur">
                            <ShieldCheck size={14} aria-hidden="true" /> {hero.badge}
                        </p>
                    )}
                    <h1 aria-label={`${hero.headline} ${hero.headlineAccent}`}>
                        <span aria-hidden="true">
                            <Words text={hero.headline} delay={120} />
                            <br />
                            <Words
                                text={hero.headlineAccent}
                                delay={120 + headlineWords * 80}
                                className="bg-gradient-to-r from-primary via-primary-hover to-accent-ink bg-clip-text text-transparent"
                            />
                        </span>
                    </h1>
                    <p className="mt-5 max-w-xl animate-fade-up text-lead text-muted [animation-delay:600ms]">{hero.subheadline}</p>
                    <div className="mt-8 flex animate-fade-up flex-wrap gap-3 [animation-delay:750ms]">
                        <Link to={hero.primaryCta?.href || '/shop'}>
                            <Button size="lg" className="group">
                                {hero.primaryCta?.label || 'Shop now'}
                                <ArrowRight size={18} className="transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true" />
                            </Button>
                        </Link>
                        <Link to="/about"><Button size="lg" variant="outline">Our story</Button></Link>
                    </div>
                    {hero.trustBadges?.length > 0 && (
                        <ul className="mt-10 flex animate-fade-up flex-wrap gap-x-8 gap-y-3 [animation-delay:900ms]">
                            {hero.trustBadges.map((badge) => {
                                const Icon = BADGE_ICONS[badge.icon] ?? Leaf;
                                return (
                                    <li key={badge.label} className="flex items-center gap-2 text-small font-medium text-ink">
                                        <Icon size={18} className="text-accent-ink" aria-hidden="true" /> {badge.label}
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>

                <div className="relative mx-auto w-full max-w-md lg:max-w-lg">
                    <div ref={anchorRef} className="relative z-10">
                    <TiltCard>
                        {waitingForPinned && <div className="skeleton aspect-[4/5] w-full rounded-xl" aria-hidden="true" />}
                        {!waitingForPinned && image && (
                            <img
                                src={imageUrl(image, 800)}
                                alt={pinned?.title ?? 'Chikit Ayurvedic wellness products'}
                                width="720"
                                height="900"
                                fetchPriority="high"
                                decoding="async"
                                className="aspect-[4/5] w-full rounded-xl object-cover shadow-lg ring-1 ring-primary/10"
                            />
                        )}
                    </TiltCard>
                    </div>

                    {featured && (
                        <Link
                            to={`/product/${featured.id}`}
                            className="absolute -bottom-6 left-3 right-3 z-30 flex animate-float items-center justify-between gap-4 rounded-lg bg-surface p-4 shadow-lg transition-shadow hover:shadow-md sm:-right-4 sm:left-auto sm:w-72"
                        >
                            <span className="min-w-0">
                                <span className="eyebrow block">Featured</span>
                                <span className="block truncate font-medium text-ink">{featured.title}</span>
                                <Price price={featured.price} originalPrice={featured.originalPrice} />
                            </span>
                            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary text-white"><ArrowRight size={18} aria-hidden="true" /></span>
                        </Link>
                    )}
                </div>
            </div>
        </section>
    );
}
