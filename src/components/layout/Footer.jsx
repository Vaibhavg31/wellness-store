import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import InstagramIcon from '@/components/ui/InstagramIcon';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useWhatsApp } from '@/hooks/useWhatsApp';
import Logo from '@/components/ui/Logo';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { api } from '@/services/api';
import { useToast } from '@/contexts/ToastContext';
import { useSiteContent } from '@/contexts/SiteContentContext';
import { useCategories } from '@/hooks/useApi';
import { DEVELOPER_NAME, DEVELOPER_URL, DEVELOPER_CREDIT } from '@/constants';
import { hasInstagramUrl } from '@/utils/socialLinks';

const socialIcons = {
    instagram: (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>),
    whatsapp:  (<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.881 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>),
};

export default function Footer() {
    const { content } = useSiteContent();
    const reducedMotion = useReducedMotion();
    const { social, footer, brandName } = content;
    const instagramUrl = social.instagramUrl?.trim();
    const instagramLinked = hasInstagramUrl(instagramUrl);
    const { getWhatsAppUrl } = useWhatsApp();
    const { categories } = useCategories();
    const [email, setEmail] = useState('');
    const [subscribed, setSubscribed] = useState(false);
    const [loading, setLoading] = useState(false);
    const { showToast } = useToast();

    const handleNewsletter = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.post('/api/newsletter/subscribe', { email, source: 'footer' });
            setSubscribed(true);
            setEmail('');
            setTimeout(() => setSubscribed(false), 4000);
        } catch {
            showToast('Could not subscribe. Please try again.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const FOOTER_COLLECTIONS_LIMIT = 6;
    const allCollectionLinks = categories.length > 0
        ? categories.map((c) => ({ id: c.slug || c.id, label: c.label }))
        : (content.navLinks ?? []).filter((l) => l.href.startsWith('/category')).map((l) => ({
            id: l.href.replace('/category/', ''),
            label: l.label,
        }));
    const collectionLinks = allCollectionLinks.slice(0, FOOTER_COLLECTIONS_LIMIT);
    const hasMoreCollections = allCollectionLinks.length > FOOTER_COLLECTIONS_LIMIT;

    return (
        <footer className="bg-footer-gradient text-cream/80 relative overflow-hidden">
            {/* Decorative ambient blobs — slow drift (see .animate-drift-ambient*
                in index.css), "alive, natural" rather than static or sparkling. */}
            <div className="absolute inset-0 opacity-40 pointer-events-none" aria-hidden="true">
                <div className={`absolute top-0 left-1/4 w-96 h-96 bg-sage-light/25 rounded-full blur-3xl ${reducedMotion ? '' : 'animate-drift-ambient-slow'}`} />
                <div className={`absolute bottom-0 right-1/4 w-80 h-80 bg-turmeric/15 rounded-full blur-3xl ${reducedMotion ? '' : 'animate-drift-ambient'}`} />
            </div>

            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-turmeric-light/20 to-transparent" />

            <div className="relative max-w-7xl mx-auto px-6 lg:px-12 pt-28 pb-12">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-16 lg:gap-10">
                    <motion.div
                        initial={reducedMotion ? false : { opacity: 0, y: 28 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, amount: 0.2 }}
                        transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
                        className="lg:col-span-4">
                        <Logo size="lg" showHover withWordmark className="mb-8 text-cream" />
                        <p className="text-sm font-light leading-relaxed text-cream/60 max-w-xs mb-2">
                            {footer.tagline}
                        </p>
                        <p className="text-sm font-light leading-relaxed text-cream/40 max-w-xs">
                            {footer.description}
                        </p>
                        <div className="flex gap-3 mt-10">
                            {instagramLinked && (
                            <motion.a
                                whileHover={reducedMotion ? {} : { scale: 1.1, y: -3 }}
                                whileTap={{ scale: 0.92 }}
                                href={instagramUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-3 rounded-full border border-cream/15 text-cream/55 hover:border-turmeric-light hover:text-turmeric-light hover:bg-turmeric-light/10 transition-colors duration-500"
                                aria-label="Instagram"
                            >
                                {socialIcons.instagram}
                            </motion.a>
                            )}
                            <motion.a
                                whileHover={reducedMotion ? {} : { scale: 1.1, y: -3 }}
                                whileTap={{ scale: 0.92 }}
                                href={getWhatsAppUrl()}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-3 rounded-full border border-[#25D366]/40 text-[#25D366] hover:bg-[#25D366] hover:text-white hover:border-[#25D366] transition-colors duration-500"
                                aria-label="WhatsApp"
                            >
                                {socialIcons.whatsapp}
                            </motion.a>
                        </div>

                        {instagramLinked && (
                        <a
                            href={instagramUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-6 block p-4 rounded-xl border border-cream/12 bg-cream/5 hover:bg-cream/10 hover:border-turmeric-light/30 transition-all duration-300 group"
                        >
                            <div className="flex items-center gap-3 mb-2">
                                <span className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#833AB4] via-[#FD1D1D] to-[#FCAF45] p-[2px] flex-shrink-0">
                                    <span className="w-full h-full rounded-full bg-forest-deep flex items-center justify-center">
                                        <InstagramIcon size={16} className="text-cream" filled />
                                    </span>
                                </span>
                                <div>
                                    <p className="type-eyebrow text-turmeric-light/70">Instagram</p>
                                    <p className="text-sm font-medium text-cream group-hover:text-turmeric-light transition-colors">@{social.instagramHandle}</p>
                                </div>
                            </div>
                            <p className="text-xs text-cream/45 leading-relaxed">{footer.instagramCardText}</p>
                            <span className="inline-block mt-3 text-xs tracking-wide text-turmeric-light/80 group-hover:text-turmeric-light">
                                View profile →
                            </span>
                        </a>
                        )}
                    </motion.div>

                    <motion.div
                        initial={reducedMotion ? false : { opacity: 0, y: 28 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, amount: 0.2 }}
                        transition={{ duration: 0.6, delay: 0.08, ease: [0.25, 0.46, 0.45, 0.94] }}
                        className="lg:col-span-2"
                    >
                        <h4 className="type-eyebrow text-turmeric-light/70 mb-7">Explore</h4>
                        <ul className="space-y-3.5">
                            {(content.navLinks ?? []).map((item) => (
                                <li key={item.href}>
                                    <Link to={item.href} className="inline-block text-sm font-light text-cream/50 hover:text-turmeric-light hover:translate-x-1 transition-[color,transform] duration-300">
                                        {item.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </motion.div>

                    <motion.div
                        initial={reducedMotion ? false : { opacity: 0, y: 28 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, amount: 0.2 }}
                        transition={{ duration: 0.6, delay: 0.16, ease: [0.25, 0.46, 0.45, 0.94] }}
                        className="lg:col-span-3"
                    >
                        <h4 className="type-eyebrow text-turmeric-light/70 mb-7">Collections</h4>
                        <ul className="space-y-3.5">
                            {collectionLinks.map((cat) => (
                                <li key={cat.id}>
                                    <Link to={`/category/${cat.id}`} className="inline-block text-sm font-light text-cream/50 hover:text-turmeric-light hover:translate-x-1 transition-[color,transform] duration-300">
                                        {cat.label}
                                    </Link>
                                </li>
                            ))}
                            {hasMoreCollections && (
                                <li>
                                    <Link to="/shop" className="inline-block text-sm font-light text-turmeric-light/80 hover:text-turmeric-light hover:translate-x-1 transition-[color,transform] duration-300">
                                        View all collections
                                    </Link>
                                </li>
                            )}
                        </ul>
                    </motion.div>

                    <motion.div
                        initial={reducedMotion ? false : { opacity: 0, y: 28 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, amount: 0.2 }}
                        transition={{ duration: 0.6, delay: 0.24, ease: [0.25, 0.46, 0.45, 0.94] }}
                        className="lg:col-span-3"
                    >
                        <h4 className="type-eyebrow text-turmeric-light/70 mb-7">
                            {footer.newsletterTitle}
                        </h4>
                        <p className="text-sm font-light text-cream/45 mb-6 leading-relaxed">
                            {footer.newsletterDescription}
                        </p>

                        {subscribed ? (
                            <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="text-sm text-turmeric-light/80 font-light">
                                ✦ Thank you for subscribing! Welcome to the family.
                            </motion.p>
                        ) : (
                            <form onSubmit={handleNewsletter} className="space-y-3">
                                <Input
                                    type="email"
                                    placeholder="Your email address"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="bg-forest-deep/40 border-cream/15 text-cream placeholder:text-cream/55 rounded-full"
                                    required
                                />
                                <Button variant="turmeric" size="sm" className="w-full" type="submit" disabled={loading}>
                                    {loading ? 'Subscribing...' : 'Subscribe'}
                                </Button>
                            </form>
                        )}
                    </motion.div>
                </div>

                <motion.div
                    initial={{ scaleX: 0 }}
                    whileInView={{ scaleX: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 1.2, ease: [0.25, 0.46, 0.45, 0.94] }}
                    className="mt-24 pt-8 border-t border-cream/10"
                >
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                        <p className="text-xs text-cream/35 tracking-wide">
                            &copy; {new Date().getFullYear()} {brandName}. All rights reserved.
                        </p>
                        <div className="flex gap-8 text-xs text-cream/35">
                            <Link to="/privacy" className="hover:text-turmeric-light/60 transition-colors duration-500">Privacy Policy</Link>
                            <Link to="/terms" className="hover:text-turmeric-light/60 transition-colors duration-500">Terms of Service</Link>
                        </div>
                    </div>

                    <p className="mt-6 flex items-center justify-center gap-3 type-eyebrow text-cream/30 font-light">
                        <span className="text-turmeric/35 select-none" aria-hidden="true">✦</span>
                        <span>
                            {DEVELOPER_CREDIT}{' '}
                            <a
                                href={DEVELOPER_URL}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-turmeric/50 hover:text-turmeric/80 transition-colors duration-500 font-medium tracking-[0.3em]"
                                aria-label={`${DEVELOPER_CREDIT} ${DEVELOPER_NAME}`}
                            >
                                {DEVELOPER_NAME}
                            </a>
                        </span>
                        <span className="text-turmeric/35 select-none" aria-hidden="true">✦</span>
                    </p>
                </motion.div>
            </div>
        </footer>
    );
}
