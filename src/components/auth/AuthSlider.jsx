import { Check } from 'lucide-react';
import Logo from '@/components/ui/Logo';
import Button from '@/components/ui/Button';

const EASE = 'cubic-bezier(0.76, 0, 0.24, 1)';

/** One message of the sliding panel: brand, headline, a few trust points and the button that switches sides. */
function PanelMessage({ title, body, action, onAction, points, hidden }) {
    return (
        <div className="flex w-1/2 flex-col items-center justify-center px-12 text-center" aria-hidden={hidden} inert={hidden}>
            <Logo size="lg" shine="hover" />
            <h2 className="mt-8 text-h2">{title}</h2>
            <p className="mt-3 max-w-xs text-muted">{body}</p>
            <ul className="mt-6 space-y-2.5 text-left">
                {points.map((point) => (
                    <li key={point} className="flex items-center gap-2.5 text-small font-medium text-ink">
                        <span className="grid size-5 place-items-center rounded-full bg-primary text-white"><Check size={12} strokeWidth={3} aria-hidden="true" /></span>
                        {point}
                    </li>
                ))}
            </ul>
            <Button variant="outline" size="lg" className="mt-8 min-w-44 bg-surface" onClick={onAction}>{action}</Button>
        </div>
    );
}

/**
 * Sign in / sign up as one wide card with a sliding panel. The forms sit side by side (sign up on the left, sign in on
 * the right) and a solid brand panel covers whichever one is not in use. Choosing the other option swipes the panel
 * across the card, from one side to the other, and the form it uncovers is the one to use. The panel is solid (no fade
 * or blur); only transforms move. The covered form is `inert`, so it cannot be tabbed into or read out.
 */
export default function AuthSlider({ mode, onMode, signin, signup, points = [], copy }) {
    const signingUp = mode === 'signup';
    const move = { transition: `transform 0.75s ${EASE}` };

    return (
        <div className="relative mx-auto grid min-h-[40rem] max-w-5xl grid-cols-2 overflow-hidden rounded-xl border border-line bg-surface shadow-lg">
            <div inert={!signingUp} className="flex items-center px-12 py-10 xl:px-16"><div className="mx-auto w-full max-w-sm">{signup}</div></div>
            <div inert={signingUp} className="flex items-center px-12 py-10 xl:px-16"><div className="mx-auto w-full max-w-sm">{signin}</div></div>

            {/* the sliding panel: its window travels across the card while the two messages stay put, so one wipes away as the other is revealed */}
            <div className="absolute inset-y-0 left-0 z-10 w-1/2 overflow-hidden will-change-transform" style={{ ...move, transform: signingUp ? 'translateX(100%)' : 'none' }}>
                <div className="absolute inset-y-0 left-0 flex w-[200%] bg-primary-tint will-change-transform" style={{ ...move, transform: signingUp ? 'translateX(-50%)' : 'none' }}>
                    <PanelMessage {...copy.signin} points={points} hidden={signingUp} onAction={() => onMode('signup')} />
                    <PanelMessage {...copy.signup} points={points} hidden={!signingUp} onAction={() => onMode('signin')} />
                </div>
            </div>
        </div>
    );
}
