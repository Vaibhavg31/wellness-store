import { Link } from 'react-router-dom';
import { BadgeCheck, MapPin, PackageCheck, ShieldCheck } from 'lucide-react';
import Logo from '@/components/ui/Logo';
import SwipePanels from '@/components/ui/SwipePanels';

const PERKS = {
    signin: [{ icon: ShieldCheck, label: 'FSSAI certified' }, { icon: BadgeCheck, label: 'Lab tested' }],
    signup: [{ icon: BadgeCheck, label: '10% off your first order' }, { icon: PackageCheck, label: 'Track every order' }, { icon: MapPin, label: 'Saved addresses' }],
};

/** Decorative lotus mandala: petals drawn as thin outlines, turning very slowly. */
function Mandala({ className }) {
    return (
        <svg viewBox="0 0 200 200" className={className} aria-hidden="true">
            <g fill="none" stroke="currentColor" strokeWidth="0.9">
                {Array.from({ length: 12 }, (_, i) => <ellipse key={`a${i}`} cx="100" cy="46" rx="11" ry="34" transform={`rotate(${i * 30} 100 100)`} />)}
                {Array.from({ length: 8 }, (_, i) => <ellipse key={`b${i}`} cx="100" cy="72" rx="8" ry="22" transform={`rotate(${i * 45 + 22.5} 100 100)`} />)}
                <circle cx="100" cy="100" r="34" />
                <circle cx="100" cy="100" r="18" />
            </g>
        </svg>
    );
}

/**
 * Sign in / sign up on phones and tablets. A solid brand header (logo, turning mandala, the message for the side
 * you are on) with the Sign in | Sign up switch floating on its lower edge, and the form card rising beneath it.
 * Switching swipes the header message and the form together, like the sliding panel on large screens. All motion is
 * solid (no fades or blur) and only transforms move.
 */
export default function AuthPhone({ mode, onMode, copy, backTo, backLabel, children }) {
    const tab = (active) => `relative z-10 flex-1 rounded-full py-3 text-small font-semibold transition-colors duration-300 ${active ? 'text-white' : 'text-muted hover:text-ink'}`;

    return (
        <main className="min-h-dvh overflow-x-clip bg-canvas">
            <header className="relative overflow-hidden rounded-b-[2rem] bg-primary-tint px-5 pb-16 pt-6 sm:pb-20">
                <Mandala className="pointer-events-none absolute -right-24 -top-24 size-80 animate-orbit-spin text-primary/15" />
                <Mandala className="pointer-events-none absolute -bottom-28 -left-28 size-64 animate-orbit-spin-reverse text-primary/10" />
                <div className="relative mx-auto max-w-md">
                    <div className="flex justify-center"><Logo size="lg" linkToHome shine="intro" priority /></div>
                    <div className="mt-6 text-center">
                        <SwipePanels index={mode === 'signin' ? 0 : 1}>
                            {['signin', 'signup'].map((side) => (
                                <div key={side} className="animate-rise-in pb-1">
                                    <p className="eyebrow">{copy[side].eyebrow}</p>
                                    <h2 className="mt-2 text-h3 sm:text-h2">{copy[side].title}</h2>
                                    <p className="mx-auto mt-2 max-w-xs text-small text-muted">{copy[side].body}</p>
                                    <ul className="mt-4 flex flex-wrap justify-center gap-2">
                                        {PERKS[side].map(({ icon: Icon, label }) => (
                                            <li key={label} className="inline-flex items-center gap-1.5 rounded-full bg-surface px-3 py-1.5 text-caption font-semibold text-primary-deep shadow-xs">
                                                <Icon size={14} className="text-primary" aria-hidden="true" /> {label}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </SwipePanels>
                    </div>
                </div>

            </header>

            <div className="relative mx-auto -mt-7 w-full max-w-md px-4 pb-10">
                <div className="relative flex rounded-full bg-surface p-1 shadow-md ring-1 ring-line" role="tablist" aria-label="Sign in or sign up">
                    <span
                        aria-hidden="true"
                        className="absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-full bg-primary shadow-sm transition-transform duration-500 ease-[var(--ease-out-soft)]"
                        style={{ transform: mode === 'signup' ? 'translateX(100%)' : 'none' }}
                    />
                    <button type="button" role="tab" aria-selected={mode === 'signin'} onClick={() => onMode('signin')} className={tab(mode === 'signin')}>Sign in</button>
                    <button type="button" role="tab" aria-selected={mode === 'signup'} onClick={() => onMode('signup')} className={tab(mode === 'signup')}>Sign up</button>
                </div>

                <div className="mt-4 animate-rise-in rounded-xl border border-line bg-surface p-5 shadow-md sm:p-8">{children}</div>
                {backTo && <Link to={backTo} className="mt-6 flex min-h-11 items-center justify-center text-center text-small text-muted hover:text-primary">{backLabel}</Link>}
            </div>
        </main>
    );
}
