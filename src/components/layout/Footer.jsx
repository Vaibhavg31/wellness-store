import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Mail } from 'lucide-react';
import WhatsAppIcon from '@/components/ui/WhatsAppIcon';
import Logo from '@/components/ui/Logo';
import Button from '@/components/ui/Button';
import InstagramIcon from '@/components/ui/InstagramIcon';
import { useSiteContent } from '@/contexts/SiteContentContext';
import { useToast } from '@/contexts/ToastContext';
import { useCategories } from '@/hooks/useApi';
import { useWhatsApp } from '@/hooks/useWhatsApp';
import { api } from '@/services/api';
import { hasInstagramUrl } from '@/utils/socialLinks';
import { DEVELOPER_CREDIT, DEVELOPER_NAME, DEVELOPER_URL } from '@/constants';

const COLLECTION_LIMIT = 6;

/** Pages every shopper may need, linked from the footer whatever the admin's menu holds. */
const COMPANY_LINKS = [{ label: 'Our story', href: '/about' }, { label: 'Reviews', href: '/reviews' }];
const HELP_LINKS = [{ label: 'Track your order', href: '/track-order' }, { label: 'FAQ', href: '/faq' }, { label: 'Contact us', href: '/contact' }];
const linkClass = 'inline-flex min-h-9 items-center text-small text-muted transition-colors hover:text-primary';

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

    if (done) return <p className="text-small font-medium text-success" role="status">Thank you for subscribing!</p>;

    return (
        <form onSubmit={submit} className="flex gap-2">
            <label htmlFor="footer-email" className="sr-only">Email address</label>
            <input
                id="footer-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Your email"
                autoComplete="email"
                className="h-11 min-w-0 flex-1 rounded-full border border-line-strong bg-surface px-4 text-small text-ink placeholder:text-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <Button type="submit" loading={loading}>Subscribe</Button>
        </form>
    );
}

export default function Footer() {
    const { content } = useSiteContent();
    const { pathname } = useLocation();
    // The home page already ends with its own sign-up card, so the footer does not repeat it right underneath.
    const homeHasSignup = pathname === '/' && content.sections?.newsletter !== false;
    const { social, footer, contact } = content;
    const { categories } = useCategories();
    const { getWhatsAppUrl } = useWhatsApp();
    const instagramUrl = social.instagramUrl?.trim();
    const known = new Set(['/', '/shop', ...COMPANY_LINKS.map((l) => l.href), ...HELP_LINKS.map((l) => l.href)]);
    const companyLinks = [...COMPANY_LINKS, ...(content.navLinks ?? []).filter((l) => !known.has(l.href) && !l.href.startsWith('/category'))];

    const collections = (categories.length > 0
        ? categories.map((c) => ({ id: c.slug || c.id, label: c.label }))
        : (content.navLinks ?? [])
            .filter((l) => l.href.startsWith('/category'))
            .map((l) => ({ id: l.href.replace('/category/', ''), label: l.label }))
    ).slice(0, COLLECTION_LIMIT);

    return (
        <footer className="border-t-4 border-primary bg-canvas-alt">
            <div className="container-page grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-12 lg:py-16">
                <div className="lg:col-span-4">
                    <Logo size="lg" />
                    <p className="mt-4 max-w-xs text-small text-muted">{footer.description}</p>
                    <ul className="mt-5 flex gap-2">
                        {hasInstagramUrl(instagramUrl) && (
                            <li>
                                <a href={instagramUrl} target="_blank" rel="noopener noreferrer" className="grid size-10 place-items-center rounded-full bg-surface text-primary shadow-xs transition-colors hover:bg-primary hover:text-white" aria-label="Instagram">
                                    <InstagramIcon size={18} />
                                </a>
                            </li>
                        )}
                        <li>
                            <a href={getWhatsAppUrl()} target="_blank" rel="noopener noreferrer" className="grid size-10 place-items-center rounded-full bg-surface text-primary shadow-xs transition-colors hover:bg-primary hover:text-white" aria-label="WhatsApp">
                                <WhatsAppIcon size={18} />
                            </a>
                        </li>
                        {contact?.email && (
                            <li>
                                <a href={`mailto:${contact.email}`} className="grid size-10 place-items-center rounded-full bg-surface text-primary shadow-xs transition-colors hover:bg-primary hover:text-white" aria-label="Email us">
                                    <Mail size={18} />
                                </a>
                            </li>
                        )}
                    </ul>
                </div>

                <nav aria-label="Footer" className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:col-span-5">
                    <div>
                        <h2 className="mb-4 font-sans text-small font-semibold text-ink">Shop</h2>
                        <ul className="space-y-1">
                            {collections.map((cat) => (
                                <li key={cat.id}><Link to={`/category/${cat.id}`} className={linkClass}>{cat.label}</Link></li>
                            ))}
                            <li><Link to="/shop" className={`${linkClass} font-medium text-primary`}>Shop all</Link></li>
                        </ul>
                    </div>
                    <div>
                        <h2 className="mb-4 font-sans text-small font-semibold text-ink">Company</h2>
                        <ul className="space-y-1">
                            {companyLinks.map((item) => (
                                <li key={item.href}><Link to={item.href} className={linkClass}>{item.label}</Link></li>
                            ))}
                        </ul>
                    </div>
                    <div>
                        <h2 className="mb-4 font-sans text-small font-semibold text-ink">Help</h2>
                        <ul className="space-y-1">
                            {HELP_LINKS.map((item) => (
                                <li key={item.href}><Link to={item.href} className={linkClass}>{item.label}</Link></li>
                            ))}
                        </ul>
                    </div>
                </nav>

                <div className={homeHasSignup ? 'hidden' : 'sm:col-span-2 lg:col-span-3'}>
                    <h2 className="mb-2 font-sans text-small font-semibold text-ink">{footer.newsletterTitle}</h2>
                    <p className="mb-4 text-small text-muted">{footer.newsletterDescription}</p>
                    <NewsletterForm />
                    {contact?.businessHours && <p className="mt-4 text-caption text-muted">{contact.businessHours}</p>}
                </div>
            </div>

            <div className="border-t border-line">
                <div className="container-page flex flex-col items-center justify-between gap-3 py-5 text-caption text-muted sm:flex-row">
                    <p>© {new Date().getFullYear()} {content.brandName}. All rights reserved.</p>
                    <ul className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1">
                        <li><Link to="/privacy" className="inline-flex min-h-9 items-center hover:text-primary">Privacy Policy</Link></li>
                        <li><Link to="/terms" className="inline-flex min-h-9 items-center hover:text-primary">Terms of Service</Link></li>
                        <li><Link to="/shipping-policy" className="inline-flex min-h-9 items-center hover:text-primary">Shipping</Link></li>
                        <li><Link to="/refund-policy" className="inline-flex min-h-9 items-center hover:text-primary">Returns &amp; Refunds</Link></li>
                        <li>
                            {DEVELOPER_CREDIT}{' '}
                            <a href={DEVELOPER_URL} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-9 items-center px-1 font-medium text-ink hover:text-primary">{DEVELOPER_NAME}</a>
                        </li>
                    </ul>
                </div>
            </div>
        </footer>
    );
}
