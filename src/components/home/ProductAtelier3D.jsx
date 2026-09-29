import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { useProducts } from '@/hooks/useApi';
import { getBestSellers } from '@/utils/products';
import { formatPrice } from '@/utils/formatPrice';
import { imageUrl } from '@/services/api';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import Button from '@/components/ui/Button';

const AUTO_ADVANCE_MS = 3600;

/**
 * The same card-orbit visual as ProductSpotlight's hero-banner carousel
 * (one card enlarged front-and-center, the others tilted and peeking from
 * behind), reused here instead of a single draggable card — this section
 * is "pick a product, see it take center stage," not "inspect one object,"
 * so the multi-card stack reads better than a lone tilting photo did.
 *
 * Unlike ProductSpotlight, the active card is driven by BOTH the auto-
 * advance timer AND the "Choose a Product" picker beside it — clicking a
 * picker card brings that product to the front exactly like waiting for
 * its turn would.
 */
function OrbitCardStack({ products, activeId, onSettle }) {
    const reducedMotion = useReducedMotion();
    const activeIndex = Math.max(0, products.findIndex((p) => p.id === activeId));

    const slotFor = (index) => {
        const delta = (index - activeIndex + products.length) % products.length;
        if (delta === 0) return 'center';
        if (products.length === 2) return 'right';
        if (delta === 1) return 'right';
        if (delta === products.length - 1) return 'left';
        return 'hidden';
    };

    const slotStyle = {
        center: { x: '0%', scale: 1, rotate: 0, zIndex: 30, opacity: 1 },
        left: { x: '-58%', scale: 0.8, rotate: -9, zIndex: 10, opacity: 0.7 },
        right: { x: '58%', scale: 0.8, rotate: 9, zIndex: 10, opacity: 0.7 },
        hidden: { x: '0%', scale: 0.6, rotate: 0, zIndex: 0, opacity: 0 },
    };

    return (
        <div className="relative w-full h-full flex items-center justify-center">
            <svg viewBox="0 0 400 400" className={`absolute inset-0 w-full h-full text-forest/15 ${reducedMotion ? '' : 'animate-[spin_60s_linear_infinite]'}`} aria-hidden="true">
                <circle cx="200" cy="200" r="150" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 10" strokeLinecap="round" />
            </svg>
            <div className="absolute inset-0 -m-6 rounded-full bg-turmeric/15 blur-3xl" aria-hidden="true" />

            {products.map((product, i) => {
                const slot = slotFor(i);
                const style = slotStyle[slot];
                const isActive = slot === 'center';
                return (
                    <motion.button
                        key={product.id}
                        type="button"
                        onClick={() => onSettle(product.id)}
                        initial={false}
                        animate={{ x: style.x, scale: style.scale, rotate: style.rotate, opacity: style.opacity }}
                        transition={{ type: 'spring', stiffness: 220, damping: 26 }}
                        style={{ zIndex: style.zIndex, pointerEvents: slot === 'hidden' ? 'none' : 'auto' }}
                        className="absolute w-40 sm:w-48 aspect-[3/4] rounded-[24px] overflow-hidden ring-1 ring-cream/80 bg-cream shadow-2xl shadow-forest/20 cursor-pointer"
                        aria-label={isActive ? product.title : `Show ${product.title}`}
                    >
                        <img
                            src={imageUrl(product.cutoutImages?.[0] || product.images[0])}
                            alt={product.title}
                            draggable={false}
                            className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none"
                        />
                        {!isActive && <span className="absolute inset-0 bg-ink/10" aria-hidden="true" />}
                    </motion.button>
                );
            })}
        </div>
    );
}

/**
 * "Explore up close" — a card-orbit carousel (see OrbitCardStack above)
 * paired with a "choose a piece" picker and a detail panel pulling the
 * product's own real features/price. Product selection is dynamic, not
 * hardcoded — best-sellers first (the same flag admins already set per
 * product), falling back to the first published products.
 */
export default function ProductAtelier3D() {
    const navigate = useNavigate();
    const reducedMotion = useReducedMotion();
    const { products } = useProducts();

    const picks = useMemo(() => {
        const withImages = products.filter((p) => p.images?.[0]);
        const bestSellers = getBestSellers(withImages);
        const pool = bestSellers.length >= 4 ? bestSellers : withImages;
        return pool.slice(0, 4);
    }, [products]);

    const [selectedId, setSelectedId] = useState(null);
    const [paused, setPaused] = useState(false);

    useEffect(() => {
        if (picks.length && !picks.some((p) => p.id === selectedId)) {
            setSelectedId(picks[0].id);
        }
    }, [picks, selectedId]);

    useEffect(() => {
        if (picks.length < 2 || reducedMotion || paused) return undefined;
        const timer = setInterval(() => {
            setSelectedId((current) => {
                const i = picks.findIndex((p) => p.id === current);
                return picks[(i + 1) % picks.length]?.id ?? current;
            });
        }, AUTO_ADVANCE_MS);
        return () => clearInterval(timer);
    }, [picks, reducedMotion, paused]);

    if (picks.length === 0) return null;
    const selected = picks.find((p) => p.id === selectedId) || picks[0];

    return (
        <section className="relative overflow-hidden bg-cream py-16 sm:py-20 lg:py-24">
            <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="max-w-xl mb-10">
                    <span className="type-eyebrow text-turmeric-ink mb-3 block">Handpicked For You</span>
                    <h2 className="font-display text-3xl sm:text-4xl font-medium text-ink leading-[1.1] mb-4">
                        Explore up close
                    </h2>
                    <p className="text-slate font-light leading-relaxed">
                        A rotating lineup of what's working for our customers right now —
                        pick one to bring it front and center.
                    </p>
                </div>

                <div className="grid lg:grid-cols-[1.2fr_1fr] gap-8 lg:gap-12 items-start">
                    {/* Card-orbit viewport */}
                    <div
                        className="relative aspect-[4/3] sm:aspect-[16/10] rounded-3xl bg-gradient-to-br from-sand/70 via-cream to-sand/40 border border-border/50"
                        onMouseEnter={() => setPaused(true)}
                        onMouseLeave={() => setPaused(false)}
                    >
                        <OrbitCardStack products={picks} activeId={selected.id} onSettle={setSelectedId} />
                    </div>

                    {/* Picker + detail panel */}
                    <div className="space-y-5">
                        <div>
                            <p className="type-eyebrow-sm text-slate mb-3">Choose a Product</p>
                            <div className="grid grid-cols-2 gap-2.5">
                                {picks.map((p) => {
                                    const active = p.id === selected.id;
                                    return (
                                        <button
                                            key={p.id}
                                            type="button"
                                            onClick={() => setSelectedId(p.id)}
                                            className={`relative text-left rounded-xl border p-3 transition-all ${
                                                active
                                                    ? 'border-forest bg-forest/5 ring-1 ring-forest/30'
                                                    : 'border-border/60 hover:border-forest/30 bg-cream'
                                            }`}
                                        >
                                            {active && (
                                                <span className="absolute top-2 right-2 w-4 h-4 rounded-full bg-forest text-cream flex items-center justify-center">
                                                    <Check size={10} strokeWidth={3} />
                                                </span>
                                            )}
                                            <p className="text-sm font-medium text-ink line-clamp-1 pr-4">{p.title}</p>
                                            <p className="text-xs text-slate mt-0.5">{formatPrice(p.price)}</p>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="rounded-2xl border border-border/60 bg-cream p-5 sm:p-6">
                            <h3 className="font-display text-xl text-ink mb-1.5">{selected.title}</h3>
                            <p className="text-sm text-slate leading-relaxed mb-4 line-clamp-2">{selected.description}</p>
                            {selected.features?.length > 0 && (
                                <ul className="space-y-1.5 mb-5">
                                    {selected.features.slice(0, 3).map((f) => (
                                        <li key={f} className="flex items-center gap-2 text-sm text-ink/80">
                                            <span className="w-1 h-1 rounded-full bg-turmeric flex-shrink-0" />
                                            {f}
                                        </li>
                                    ))}
                                </ul>
                            )}
                            <div className="flex items-center justify-between gap-3">
                                <span className="font-display text-lg text-forest font-semibold">{formatPrice(selected.price)}</span>
                                <Button variant="turmeric" size="sm" onClick={() => navigate(`/product/${selected.id}`)}>
                                    View Product
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
