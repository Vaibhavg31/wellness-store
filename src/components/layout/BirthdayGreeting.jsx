import { useEffect, useState } from 'react';
import { Cake, Check, Copy } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { useAuth } from '@/contexts/AuthContext';
import { useSiteContent } from '@/contexts/SiteContentContext';
import { celebrate } from '@/utils/celebrate';
import { copyText } from '@/utils/copyText';

const today = () => {
    const d = new Date();
    return { md: `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`, year: d.getFullYear() };
};

/**
 * On a Chikit Club member's birthday the site greets them once, with confetti and the shop's birthday message (and the gift code, if the
 * admin set one). Shown at most once a year per member on that device. Nothing happens for anyone else.
 */
export default function BirthdayGreeting() {
    const { user, token } = useAuth();
    const { content } = useSiteContent();
    const club = content.extras?.club;
    const [open, setOpen] = useState(false);
    const [copied, setCopied] = useState(false);

    const member = Boolean(token && user?.club?.member);
    const dob = String(user?.dob ?? '').slice(0, 10);

    useEffect(() => {
        if (!member || club?.enabled === false || !/^\d{4}-\d{2}-\d{2}$/.test(dob)) return undefined;
        const { md, year } = today();
        if (dob.slice(5) !== md) return undefined;
        const key = `chikit-birthday-${user.id ?? user.email}-${year}`;
        let seen = false;
        try { seen = Boolean(localStorage.getItem(key)); } catch { /* storage blocked */ }
        if (seen) return undefined;
        // Marked as seen only when it actually opens, so a re-run of this effect (settings arriving) never loses it.
        const timer = setTimeout(() => {
            try { localStorage.setItem(key, '1'); } catch { /* it may greet again, which is harmless */ }
            setOpen(true);
            celebrate({ pieces: 180 });
        }, 1500);
        return () => clearTimeout(timer);
    }, [member, dob, club?.enabled, user?.id, user?.email]);

    if (!member) return null;
    const first = String(user?.name ?? '').trim().split(/\s+/)[0] || 'there';
    const code = club?.birthdayCode;

    return (
        <Modal isOpen={open} onClose={() => setOpen(false)} title="Happy birthday" size="sm">
            <div className="text-center">
                <span className="mx-auto grid size-16 place-items-center rounded-full bg-accent text-primary-deep"><Cake size={30} aria-hidden="true" /></span>
                <h2 className="mt-4 text-h3">Happy birthday, {first}!</h2>
                <p className="mt-2 text-muted">{club?.birthdayMessage || 'Wishing you a year of good health and good days.'}</p>
                {code && (
                    <div className="mt-5 rounded-xl border border-dashed border-primary/50 bg-accent-tint px-4 py-3">
                        <p className="text-caption font-semibold uppercase tracking-[0.14em] text-accent-ink">Your birthday gift</p>
                        <button
                            type="button"
                            onClick={async () => { if (await copyText(code)) { setCopied(true); setTimeout(() => setCopied(false), 2000); } }}
                            className="mt-1 inline-flex items-center gap-2 font-mono text-h4 font-semibold tracking-wider text-primary"
                            aria-label={`Copy code ${code}`}
                        >
                            {code} {copied ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
                        </button>
                        <p className="mt-1 text-caption text-muted">Type it in the coupon box at checkout.</p>
                    </div>
                )}
                <Button className="mt-6 w-full" onClick={() => setOpen(false)}>Thank you</Button>
            </div>
        </Modal>
    );
}
