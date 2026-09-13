import { useState } from 'react';
import { motion } from 'framer-motion';
import { Phone, Mail, Clock, MessageCircle } from 'lucide-react';
import SectionTitle from '@/components/ui/SectionTitle';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import InstagramIcon from '@/components/ui/InstagramIcon';
import { useWhatsApp } from '@/hooks/useWhatsApp';
import { api } from '@/services/api';
import { useSiteContent } from '@/contexts/SiteContentContext';
import { hasInstagramUrl } from '@/utils/socialLinks';

export default function ContactPage() {
    const { content } = useSiteContent();
    const { contact, social, contactPage } = content;
    const instagramUrl = social.instagramUrl?.trim();
    const instagramLinked = hasInstagramUrl(instagramUrl);
    const { getWhatsAppUrl } = useWhatsApp();

    const [form, setForm] = useState({ name: '', email: '', phone: '', message: '' });
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setError('');
        try {
            await api.post('/api/feedback', form);
            setSubmitted(true);
            setForm({ name: '', email: '', phone: '', message: '' });
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to send message');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="pb-20 px-4 sm:px-6 lg:px-8 pt-2 sm:pt-4">
            <div className="max-w-7xl mx-auto px-6 lg:px-8">
                <SectionTitle
                    subtitle={contactPage.subtitle}
                    title={contactPage.title}
                    description={contactPage.description}
                />

                <div className="grid lg:grid-cols-2 gap-16 mb-24">
                    <motion.form
                        initial={{ opacity: 0, x: -30 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        onSubmit={handleSubmit}
                        className="space-y-5"
                    >
                        <Input label="Full Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                        <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
                        <Input label="Phone" type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                        <div>
                            <label className="block text-xs tracking-[0.15em] uppercase text-slate mb-2 font-medium">
                                Message
                            </label>
                            <textarea
                                value={form.message}
                                onChange={(e) => setForm({ ...form, message: e.target.value })}
                                rows={5}
                                required
                                className="w-full px-4 py-3.5 bg-cream/50 border border-sand/60 text-ink placeholder:text-slate/50 focus:outline-none focus:border-turmeric-ink focus:ring-1 focus:ring-turmeric-ink/30 transition-all font-light resize-none"
                                placeholder="How can we help you?"
                            />
                        </div>
                        {submitted ? (
                            <p className="text-emerald font-light">Thank you! We&apos;ll get back to you soon.</p>
                        ) : (
                            <>
                                {error && <p className="text-red-500 text-sm">{error}</p>}
                                <Button variant="turmeric" size="lg" type="submit" className="w-full sm:w-auto" disabled={submitting}>
                                    {submitting ? 'Sending...' : 'Send Message'}
                                </Button>
                            </>
                        )}
                    </motion.form>

                    <motion.div
                        initial={{ opacity: 0, x: 30 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        className="space-y-8"
                    >
                        {instagramLinked && (
                        <a
                            href={instagramUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-4 p-5 rounded-2xl bg-gradient-to-r from-[#833AB4]/10 via-[#FD1D1D]/8 to-[#FCAF45]/10 border border-[#833AB4]/20 hover:border-[#833AB4]/35 transition-colors group"
                        >
                            <div className="w-12 h-12 flex items-center justify-center rounded-full bg-gradient-to-tr from-[#833AB4] via-[#FD1D1D] to-[#FCAF45] p-[2px] flex-shrink-0 group-hover:scale-105 transition-transform">
                                <span className="w-full h-full rounded-full bg-cream flex items-center justify-center">
                                    <InstagramIcon size={22} className="text-forest" filled />
                                </span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-xs tracking-[0.15em] uppercase text-[#833AB4] mb-0.5 font-medium">Instagram</p>
                                <p className="text-ink font-medium truncate">@{social.instagramHandle}</p>
                                <p className="text-xs text-slate mt-0.5">New collections, styling &amp; updates</p>
                            </div>
                        </a>
                        )}

                        <a
                            href={getWhatsAppUrl('Hi! I would like to get in touch.')}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-4 p-5 rounded-2xl bg-[#25D366]/10 border border-[#25D366]/25 hover:bg-[#25D366]/15 transition-colors group"
                        >
                            <div className="w-12 h-12 flex items-center justify-center rounded-full bg-[#25D366] text-white flex-shrink-0 group-hover:scale-105 transition-transform">
                                <MessageCircle size={22} strokeWidth={1.5} />
                            </div>
                            <div>
                                <p className="text-xs tracking-[0.15em] uppercase text-[#128C7E] mb-0.5 font-medium">WhatsApp (Fastest Reply)</p>
                                <p className="text-ink font-medium">{contact.whatsappDisplay}</p>
                                <p className="text-xs text-slate mt-0.5">Tap to open chat instantly</p>
                            </div>
                        </a>

                        <div className="space-y-6">
                            {[
                                { icon: Phone, label: 'Phone / WhatsApp', value: contact.whatsappDisplay, href: getWhatsAppUrl() },
                                { icon: Mail, label: 'Email', value: contact.email, href: `mailto:${contact.email}` },
                                { icon: Clock, label: 'Hours', value: contact.businessHours },
                            ].map((item) => (
                                <div key={item.label} className="flex gap-4">
                                    <div className="w-12 h-12 flex items-center justify-center bg-cream text-forest flex-shrink-0 rounded-xl">
                                        <item.icon size={20} strokeWidth={1.2} />
                                    </div>
                                    <div>
                                        <p className="text-xs tracking-[0.15em] uppercase text-slate mb-1">{item.label}</p>
                                        {item.href ? (
                                            <a href={item.href} target={item.href.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer" className="text-ink font-light hover:text-forest transition-colors">
                                                {item.value}
                                            </a>
                                        ) : (
                                            <p className="text-ink font-light">{item.value}</p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                </div>
            </div>
        </div>
    );
}
