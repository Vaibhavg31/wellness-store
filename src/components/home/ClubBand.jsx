import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, Check, Crown } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { useSiteContent } from '@/contexts/SiteContentContext';
import { imageUrl } from '@/services/api';
import { formatPrice, cn } from '@/utils/formatPrice';

const ROTATE_MS = 2600;
const MAX_EXAMPLES = 6;

/**
 * The Chikit Club, explained by showing it: real products, one after another every couple of seconds, each with a switch between
 * "without Club" and "with Club", so the saving is seen in rupees in one glance. A member sees the same card already switched on,
 * with their status instead of the join button. The rotation pauses while the card is hovered or focused and stays still for anyone
 * who has asked their device for reduced motion (they can still pick a product with the dots).
 */
export default function ClubBand({ products }) {
    const { content } = useSiteContent();
    const { isMember } = useCart();
    const club = content.extras?.club;
    const reduceMotion = useReducedMotion();
    const [on, setOn] = useState(true);
    const [index, setIndex] = useState(0);
    const [paused, setPaused] = useState(false);
    const examples = useMemo(() => {
        const withClub = products.filter((p) => p.images?.[0] && Number(p.memberPrice) > 0 && p.memberPrice < p.price);
        const ranked = [...withClub.filter((p) => p.isBestSeller), ...withClub.filter((p) => !p.isBestSeller)];
        return ranked.slice(0, MAX_EXAMPLES);
    }, [products]);
    const count = examples.length;
    useEffect(() => {
        if (count < 2 || paused || reduceMotion) return undefined;
        const timer = setInterval(() => setIndex((i) => (i + 1) % count), ROTATE_MS);
        return () => clearInterval(timer);
    }, [count, paused, reduceMotion]);
    if (!club || club.enabled === false) return null;

    const example = examples[index % Math.max(count, 1)] ?? null;
    const percent = Number(club.discountPercent) || 0;
    const showing = isMember || on;
    const shownPrice = example ? (showing ? example.memberPrice : example.price) : 0;
    const perks = (club.benefits?.length ? club.benefits : ['Member prices on most products', 'Early access to new launches', 'A birthday surprise from Chikit']).slice(0, 4);

    return (
        <section aria-labelledby="club-band-title" className="relative isolate overflow-hidden bg-gradient-to-br from-primary-deep via-primary-deep to-primary-night text-white">
            <div className="pointer-events-none absolute -left-32 top-0 size-[30rem] rounded-full bg-primary/50 blur-3xl" aria-hidden="true" />
            <div className="pointer-events-none absolute -bottom-40 right-0 size-[28rem] rounded-full bg-gold/15 blur-3xl" aria-hidden="true" />
            <div className="container-page relative grid items-center gap-10 py-14 lg:grid-cols-12 lg:gap-12 lg:py-20">
                <div className="lg:col-span-6">
                    <p className="inline-flex items-center gap-2 rounded-full bg-gold-soft px-3.5 py-1.5 text-caption font-bold uppercase tracking-[0.14em] text-primary-deep"><Crown size={14} aria-hidden="true" /> {club.cardName || 'Chikit Club'} · Free</p>
                    <h2 id="club-band-title" className="mt-5 text-white">Same products. {percent > 0 ? `${percent}% lower` : 'Lower'} prices.</h2>
                    <p className="mt-4 max-w-lg text-lead text-white/75">{club.tagline || 'Join free and pay less on most of the Chikit range, every day. No minimum, no catch.'}</p>
                    <ul className="mt-6 space-y-3">
                        {perks.map((perk) => (
                            <li key={perk} className="flex items-center gap-3 text-body text-white/90">
                                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-gold-soft text-primary-deep"><Check size={14} strokeWidth={3} aria-hidden="true" /></span>
                                {perk}
                            </li>
                        ))}
                    </ul>
                    <Link to="/club" className="mt-8 inline-flex min-h-13 items-center gap-2 rounded-full bg-accent px-8 py-3.5 text-body font-bold text-primary-deep shadow-md transition-colors hover:bg-accent-hover">
                        {isMember ? 'View my Club card' : 'Join the Club, it is free'} <ArrowRight size={18} aria-hidden="true" />
                    </Link>
                </div>

                {example && (
                    <div className="lg:col-span-6">
                        <div
                            className="mx-auto max-w-md rounded-[1.75rem] bg-surface p-5 text-ink shadow-lg sm:p-6"
                            onMouseEnter={() => setPaused(true)}
                            onMouseLeave={() => setPaused(false)}
                            onFocus={() => setPaused(true)}
                            onBlur={() => setPaused(false)}
                        >
                            <div className="min-h-[7.5rem] sm:min-h-[8.25rem]" aria-live="off">
                                <AnimatePresence mode="wait" initial={false}>
                                    <motion.div
                                        key={example.id}
                                        initial={reduceMotion ? false : { opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -10 }}
                                        transition={{ duration: 0.28, ease: 'easeOut' }}
                                        className="flex gap-4"
                                    >
                                        <Link to={`/product/${example.id}`} className="size-28 shrink-0 overflow-hidden rounded-2xl bg-accent-tint sm:size-32" aria-label={`View ${example.title}`}>
                                            <img src={imageUrl(example.images[0], 320)} alt="" width="128" height="128" className="size-full object-contain mix-blend-multiply" />
                                        </Link>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-caption font-bold uppercase tracking-[0.14em] text-accent-ink">Live example</p>
                                            <p className="mt-1 line-clamp-2 text-body font-bold leading-snug">{example.title}</p>
                                            <p className="mt-2 flex flex-wrap items-baseline gap-x-2">
                                                {showing && <Crown size={16} className="self-center text-gold" aria-hidden="true" />}
                                                <span className={cn('font-display text-h2 leading-none transition-colors', showing ? 'text-primary' : 'text-ink')}>{formatPrice(shownPrice)}</span>
                                                {example.originalPrice > shownPrice && <span className="text-small text-subtle line-through">{formatPrice(example.originalPrice)}</span>}
                                            </p>
                                            <p className={cn('mt-1.5 text-small font-semibold transition-opacity', showing ? 'text-success opacity-100' : 'opacity-0')}>Club saves you {formatPrice(example.price - example.memberPrice)}</p>
                                        </div>
                                    </motion.div>
                                </AnimatePresence>
                            </div>

                            {count > 1 && (
                                <div className="mt-4 flex items-center justify-center gap-1" role="group" aria-label="Choose an example product">
                                    {examples.map((p, i) => (
                                        <button key={p.id} type="button" onClick={() => setIndex(i)} aria-label={`Show ${p.title}`} aria-current={i === index % count} className="grid size-6 place-items-center">
                                            <span className={cn('block h-1.5 rounded-full transition-all duration-300', i === index % count ? 'w-6 bg-primary' : 'w-1.5 bg-line-strong')} />
                                        </button>
                                    ))}
                                </div>
                            )}

                            {!isMember && (
                                <div className="mt-3 flex rounded-full bg-canvas-alt p-1" role="group" aria-label="Compare prices">
                                    <button type="button" aria-pressed={!on} onClick={() => setOn(false)} className={cn('min-h-11 flex-1 rounded-full text-small font-bold transition-colors', !on ? 'bg-surface text-ink shadow-sm' : 'text-muted')}>Without Club</button>
                                    <button type="button" aria-pressed={on} onClick={() => setOn(true)} className={cn('flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-full text-small font-bold transition-colors', on ? 'bg-primary text-white shadow-sm' : 'text-muted')}><Crown size={14} aria-hidden="true" /> With Club</button>
                                </div>
                            )}
                            {isMember && <p className="mt-4 flex items-center gap-2 rounded-2xl bg-success-tint px-4 py-3 text-small font-semibold text-success"><Check size={16} aria-hidden="true" /> You are a member: this is the price you pay.</p>}
                        </div>
                    </div>
                )}
            </div>
        </section>
    );
}
