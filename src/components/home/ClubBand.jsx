import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, Crown } from 'lucide-react';
import { useSiteContent } from '@/contexts/SiteContentContext';
import { useCustomerSession } from '@/hooks/useCustomerSession';
import ClubPriceTile from '@/components/club/ClubPriceTile';
import { clubExamples } from '@/utils/clubExamples';

/**
 * The Chikit Club on the home page: what it is, what a member gets, and the real products with their usual price beside the Chikit Club
 * price (the rupees saved, no percentage). Switched on or off, and worded, in Admin → Club.
 */
export default function ClubBand({ products }) {
    const { content } = useSiteContent();
    const { user, isAuthenticated } = useCustomerSession();
    const club = content.extras?.club;
    const member = Boolean(isAuthenticated && user?.club?.member);
    const listCount = Math.min(12, Math.max(3, Number(club?.priceCount) || 8));
    const examples = useMemo(() => clubExamples(products, listCount), [products, listCount]);
    const count = examples.length;
    if (!club || club.enabled === false) return null;

    const perks = (club.benefits?.length ? club.benefits : ['Member prices on most products', 'Early access to new launches', 'A birthday surprise from Chikit']).slice(0, 4);

    return (
        <section aria-labelledby="club-band-title" className="relative isolate overflow-hidden bg-gradient-to-br from-primary-deep via-primary-deep to-primary-night text-white">
            <div className="pointer-events-none absolute -left-32 top-0 size-[30rem] rounded-full bg-primary/50 blur-3xl" aria-hidden="true" />
            <div className="pointer-events-none absolute -bottom-40 right-0 size-[28rem] rounded-full bg-accent/10 blur-3xl" aria-hidden="true" />
            <div className="container-page relative grid items-center gap-10 py-14 lg:grid-cols-12 lg:gap-12 lg:py-20">
                <div className="lg:col-span-12">
                    <p className="inline-flex items-center gap-2 rounded-full bg-accent px-3.5 py-1.5 text-caption font-semibold uppercase tracking-[0.14em] text-primary-deep"><Crown size={14} aria-hidden="true" /> {club.cardName || 'Chikit Club'} · Free</p>
                    <h2 id="club-band-title" className="mt-5 max-w-2xl text-white">Same products. Lower prices.</h2>
                    <p className="mt-4 max-w-lg text-lead text-white/75">{club.tagline || 'Join free and pay less on most of the Chikit range, every day. No minimum, no catch.'}</p>
                    <ul className="mt-6 space-y-3">
                        {perks.map((perk) => (
                            <li key={perk} className="flex items-center gap-3 text-body text-white/90">
                                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-accent text-primary-deep"><Check size={14} strokeWidth={3} aria-hidden="true" /></span>
                                {perk}
                            </li>
                        ))}
                    </ul>
                    <Link to="/club" className="mt-8 inline-flex min-h-13 items-center gap-2 rounded-full bg-accent px-8 py-3.5 text-body font-semibold text-primary-deep shadow-md transition-colors hover:bg-accent-hover">
                        {member ? 'View my Chikit Club card' : 'Become a Chikit Club member, free'} <ArrowRight size={18} aria-hidden="true" />
                    </Link>
                </div>

                {club.showPrices !== false && count > 1 && (
                    <div className="lg:col-span-12">
                        <p className="mb-3 text-small font-semibold uppercase tracking-[0.14em] text-accent">Usual price and Chikit Club price, side by side</p>
                        <ul className="-mx-4 flex snap-x scroll-pl-4 gap-3 overflow-x-auto px-4 pb-2 scrollbar-none sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-4 xl:grid-cols-6">
                            {examples.slice(0, 6).map((p) => (
                                <li key={p.id} className="w-[10.5rem] shrink-0 snap-start sm:w-auto">
                                    <ClubPriceTile product={p} member={member} />
                                </li>
                            ))}
                        </ul>
                        <Link to="/club" className="mt-4 inline-flex min-h-11 items-center gap-1.5 text-small font-semibold text-accent hover:underline">See all Chikit Club prices <ArrowRight size={16} aria-hidden="true" /></Link>
                    </div>
                )}
            </div>
        </section>
    );
}
