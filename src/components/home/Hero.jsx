import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import { LazyMotion, MotionConfig, domAnimation, m } from 'framer-motion';
import Button from '@/components/ui/Button';
import Magnetic from '@/components/ui/Magnetic';
import HeroDeck from '@/components/home/HeroDeck';
import { useSiteContent } from '@/contexts/SiteContentContext';

const EASE = [0.22, 1, 0.36, 1];
const rise = (delay) => ({ initial: { opacity: 0, y: 22 }, animate: { opacity: 1, y: 0 }, transition: { delay, duration: 0.7, ease: EASE } });

/** Admin-pinned hero products first, then best sellers and new arrivals; at most five. */
function buildSlides(products, hero) {
    const withImage = products.filter((p) => p.images?.[0]);
    const pinned = (hero.productImageIds ?? []).map((id) => withImage.find((p) => p.id === id)).filter(Boolean);
    const rest = withImage
        .filter((p) => !pinned.includes(p))
        .sort((a, b) => (b.isBestSeller || b.isNew ? 1 : 0) - (a.isBestSeller || a.isNew ? 1 : 0));
    return [...pinned, ...rest].slice(0, 5).map((p) => ({
        id: p.id,
        product: p,
        title: p.title,
        href: `/product/${p.id}`,
        image: p.images[0],
        eyebrow: p.isNew ? 'New arrival' : p.isBestSeller ? 'Best seller' : 'Featured',
    }));
}

/** Headline words slide up out of a mask, one after another. */
function RevealWords({ text, delay = 0 }) {
    return text.split(' ').map((word, i) => (
        <span key={`${word}-${i}`} className="mr-[0.25em] inline-block overflow-hidden pb-[0.14em] align-bottom -mb-[0.14em]">
            <m.span className="inline-block" initial={{ y: '115%' }} animate={{ y: 0 }} transition={{ delay: delay + i * 0.08, duration: 0.85, ease: EASE }}>{word}</m.span>
        </span>
    ));
}

export default function Hero({ products, loading = false }) {
    const { content } = useSiteContent();
    const hero = content.hero;

    const slides = useMemo(() => {
        const fromProducts = buildSlides(products, hero);
        if (fromProducts.length > 0) return fromProducts;
        /* no product photos yet: show the brand picture from the admin, if there is one */
        return (hero.images ?? []).filter(Boolean).slice(0, 1).map((image) => ({ id: image, product: null, title: 'Shop the Chikit range', href: '/shop', image, eyebrow: 'Chikit' }));
    }, [products, hero]);

    return (
        <MotionConfig reducedMotion="user">
            <LazyMotion features={domAnimation}>
                <section className="relative overflow-hidden bg-canvas">
                    <div className="pointer-events-none absolute -right-40 -top-24 size-[46rem] rounded-full" style={{ background: 'radial-gradient(closest-side, var(--color-primary-soft), transparent)' }} aria-hidden="true" />
                    <div className="container-page relative grid items-center gap-6 py-6 sm:gap-8 sm:py-12 lg:grid-cols-[1fr_1.05fr] lg:gap-10 lg:py-10">
                        <div>
                            {hero.badge && (
                                <m.p {...rise(0.05)} className="mb-3 inline-flex sm:mb-5 items-center gap-2 rounded-full bg-primary-tint px-4 py-1.5 text-caption font-semibold text-primary-deep">
                                    <ShieldCheck size={14} aria-hidden="true" /> {hero.badge}
                                </m.p>
                            )}
                            <h1>
                                <RevealWords text={hero.headline} delay={0.1} />
                                <span className="text-primary"><RevealWords text={hero.headlineAccent} delay={0.1 + hero.headline.split(' ').length * 0.08} /></span>
                            </h1>
                            <m.p {...rise(0.45)} className="mt-5 hidden max-w-xl text-lead text-muted sm:block">{hero.subheadline}</m.p>
                            <m.div {...rise(0.55)} className="mt-4 flex flex-wrap gap-3 sm:mt-8">
                                <Magnetic>
                                    <Link to={hero.primaryCta?.href || '/shop'}>
                                        <Button size="lg">
                                            {hero.primaryCta?.label || 'Shop now'} <ArrowRight size={18} aria-hidden="true" />
                                        </Button>
                                    </Link>
                                </Magnetic>
                                <Magnetic>
                                    <Link to="/about"><Button size="lg" variant="outline">Our story</Button></Link>
                                </Magnetic>
                            </m.div>
                        </div>

                        <m.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.9, ease: EASE }} className="min-w-0">
                            {slides.length > 0 ? (
                                <HeroDeck items={slides} />
                            ) : (
                                loading && <div className="skeleton mx-auto aspect-[1/0.82] w-full max-w-[34rem] rounded-xl sm:aspect-[1/0.8]" aria-hidden="true" />
                            )}
                        </m.div>
                    </div>
                </section>
            </LazyMotion>
        </MotionConfig>
    );
}
