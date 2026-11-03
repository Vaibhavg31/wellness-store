import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Crown, Mail } from 'lucide-react';
import WhatsAppIcon from '@/components/ui/WhatsAppIcon';
import InstagramIcon from '@/components/ui/InstagramIcon';
import { useSiteContent } from '@/contexts/SiteContentContext';
import { useToast } from '@/contexts/ToastContext';
import { useCategories } from '@/hooks/useApi';
import { useWhatsApp } from '@/hooks/useWhatsApp';
import { api } from '@/services/api';
import { hasInstagramUrl } from '@/utils/socialLinks';
import { DEVELOPER_CREDIT, DEVELOPER_NAME, DEVELOPER_URL } from '@/constants';

const COMPANY_LINKS = [{ label: 'Our story', href: '/about' }, { label: 'Offers', href: '/offers' }, { label: 'Chikit Club', href: '/club' }, { label: 'Reviews', href: '/reviews' }];
const HELP_LINKS = [{ label: 'Track your order', href: '/track-order' }, { label: 'FAQ', href: '/faq' }, { label: 'Contact us', href: '/contact' }, { label: 'Shipping', href: '/shipping-policy' }, { label: 'Returns & refunds', href: '/refund-policy' }];
const linkClass = 'inline-flex min-h-10 items-center text-small text-white/70 transition-colors hover:text-white';
const heading = 'mb-3 font-sans text-caption font-bold uppercase tracking-[0.18em] text-peach';
const iconLink = 'grid size-11 place-items-center rounded-full bg-white/10 text-accent transition-colors hover:bg-accent hover:text-primary-deep';

function NewsletterForm() {
    const { showToast } = useToast();
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [done, setDone] = useState(false);

    const submit = async (event) => {
        event.preventDefault();
        setLoading(true);
        try {
            await api.post('/api/newsletter/subscribe', { email, source: 'footer' });
            setDone(true);
            setEmail('');
        } catch {
            showToast('Could not subscribe. Please try again.', 'error');
        } finally {
            setLoading(false);
        }
    };

    if (done) return <p className="text-small font-semibold text-accent" role="status">Thank you. You are on the list.</p>;
    return (
        <form onSubmit={submit} className="flex w-full max-w-md gap-2">
            <label htmlFor="footer-email" className="sr-only">Email address</label>
            <input id="footer-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Your email" autoComplete="email" className="h-12 min-w-0 flex-1 rounded-full border-0 bg-white/10 px-5 text-small text-white placeholder:text-white/50 focus:bg-white/15 focus:outline-none focus:ring-2 focus:ring-accent/60" />
            <button type="submit" disabled={loading} className="inline-flex h-12 items-center gap-2 rounded-full bg-accent px-6 text-small font-bold text-primary-deep transition-colors hover:bg-accent-hover disabled:opacity-60">{loading ? 'Sending' : 'Subscribe'} <ArrowRight size={16} aria-hidden="true" /></button>
        </form>
    );
}

export default function Footer() {
    const { content } = useSiteContent();
    const { social, footer, contact } = content;
    const { categories } = useCategories();
    const { getWhatsAppUrl } = useWhatsApp();
    const instagramUrl = social.instagramUrl?.trim();
    const collections = categories.slice(0, 7);

    return (
        <footer className="bg-primary-deep pb-40 text-white lg:pb-0">
            <div className="container-page pt-14 lg:pt-20">
                <div className="flex flex-col gap-10 border-b border-white/12 pb-12 lg:flex-row lg:items-end lg:justify-between">
                    <div className="max-w-md">
                        <span className="inline-block rounded-2xl bg-accent px-4 py-3"><img src="/brand/chikit-logo.webp" alt="Chikit, Ayurveda and Wellness" width="1000" height="305" className="h-12 w-auto" /></span>
                        <p className="mt-5 font-display text-h4 leading-snug text-white/90">{footer.description || 'Rooted in Ayurveda. Thoughtfully crafted for a healthier, happier you.'}</p>
                    </div>
                    <div className="w-full lg:max-w-md">
                        <p className={heading}>{footer.newsletterTitle || 'Stay in the loop'}</p>
                        <p className="mb-4 text-small text-white/70">{footer.newsletterDescription || 'New launches, offers and Ayurvedic wellness tips.'}</p>
                        <NewsletterForm />
                    </div>
                </div>

                <div className="grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-4">
                    <nav aria-label="Shop">
                        <h2 className={heading}>Shop</h2>
                        <ul>
                            {collections.map((c) => <li key={c.slug || c.id}><Link to={`/category/${c.slug || c.id}`} className={linkClass}>{c.label}</Link></li>)}
                            <li><Link to="/shop" className={`${linkClass} font-semibold !text-accent`}>Shop all</Link></li>
                        </ul>
                    </nav>
                    <nav aria-label="Company">
                        <h2 className={heading}>Company</h2>
                        <ul>{COMPANY_LINKS.map((i) => <li key={i.href}><Link to={i.href} className={linkClass}>{i.label}</Link></li>)}</ul>
                    </nav>
                    <nav aria-label="Help">
                        <h2 className={heading}>Help</h2>
                        <ul>{HELP_LINKS.map((i) => <li key={i.href}><Link to={i.href} className={linkClass}>{i.label}</Link></li>)}</ul>
                    </nav>
                    <div>
                        <h2 className={heading}>Talk to us</h2>
                        {contact?.businessHours && <p className="mb-4 text-small text-white/70">{contact.businessHours}</p>}
                        <ul className="flex flex-wrap gap-2">
                            <li><a href={getWhatsAppUrl()} target="_blank" rel="noopener noreferrer" className={iconLink} aria-label="WhatsApp"><WhatsAppIcon size={18} /></a></li>
                            {hasInstagramUrl(instagramUrl) && <li><a href={instagramUrl} target="_blank" rel="noopener noreferrer" className={iconLink} aria-label="Instagram"><InstagramIcon size={18} /></a></li>}
                            {contact?.email && <li><a href={`mailto:${contact.email}`} className={iconLink} aria-label="Email us"><Mail size={18} /></a></li>}
                        </ul>
                        <Link to="/club" className="mt-5 inline-flex items-center gap-2 rounded-full bg-gold-soft px-4 py-2 text-small font-bold text-primary-deep hover:bg-accent"><Crown size={15} aria-hidden="true" /> Join the Chikit Club</Link>
                    </div>
                </div>
            </div>

            <div className="border-t border-white/12">
                <div className="container-page flex flex-col items-center justify-between gap-2 py-5 text-caption text-white/55 sm:flex-row">
                    <p>&copy; {new Date().getFullYear()} {content.brandName}. All rights reserved.</p>
                    <ul className="flex flex-wrap items-center justify-center gap-x-5">
                        <li><Link to="/privacy" className="inline-flex min-h-10 items-center hover:text-white">Privacy</Link></li>
                        <li><Link to="/terms" className="inline-flex min-h-10 items-center hover:text-white">Terms</Link></li>
                        <li>{DEVELOPER_CREDIT} <a href={DEVELOPER_URL} target="_blank" rel="noopener noreferrer" className="font-semibold text-white hover:text-accent">{DEVELOPER_NAME}</a></li>
                    </ul>
                </div>
            </div>
        </footer>
    );
}
