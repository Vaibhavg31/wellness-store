import { useState } from 'react';
import Seo, { SITE_URL } from '@/components/seo/Seo';
import { Clock, Mail, MessageCircle, Phone } from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import Button from '@/components/ui/Button';
import InstagramIcon from '@/components/ui/InstagramIcon';
import { useWhatsApp } from '@/hooks/useWhatsApp';
import { api } from '@/services/api';
import { useSiteContent } from '@/contexts/SiteContentContext';
import { hasInstagramUrl } from '@/utils/socialLinks';

const EMPTY_FORM = { name: '', email: '', phone: '', message: '' };

function ContactRow({ icon: Icon, label, value, href }) {
    const external = href?.startsWith('http');
    return (
        <li className="flex gap-4">
            <span className="grid size-12 shrink-0 place-items-center rounded-full bg-primary-tint text-primary"><Icon size={20} aria-hidden="true" /></span>
            <div>
                <p className="text-caption font-semibold uppercase tracking-wider text-muted">{label}</p>
                {href ? (
                    <a href={href} {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})} className="text-ink hover:text-primary">{value}</a>
                ) : <p className="text-ink">{value}</p>}
            </div>
        </li>
    );
}

export default function ContactPage() {
    const { content } = useSiteContent();
    const { contact, social, contactPage } = content;
    const { getWhatsAppUrl } = useWhatsApp();
    const instagramUrl = social.instagramUrl?.trim();

    const [form, setForm] = useState(EMPTY_FORM);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setError('');
        try {
            await api.post('/api/feedback', form);
            setSubmitted(true);
            setForm(EMPTY_FORM);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to send message');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <>
            <Seo title="Contact Us" description={contactPage.description} path="/contact" jsonLd={{ '@context': 'https://schema.org', '@type': 'ContactPage', name: 'Contact Chikit', url: `${SITE_URL}/contact` }} />
            <PageHeader eyebrow={contactPage.subtitle} title={contactPage.title} description={contactPage.description} />
            <div className="container-page grid gap-12 py-10 lg:grid-cols-2 lg:gap-20 lg:py-16">
                {submitted ? (
                    <div className="rounded-xl bg-success-tint p-8" role="status">
                        <h2 className="mb-2 text-h3">Message sent</h2>
                        <p className="text-muted">Thank you! We&apos;ll get back to you soon.</p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <Input label="Full name" value={form.name} onChange={set('name')} autoComplete="name" required />
                        <Input label="Email" type="email" value={form.email} onChange={set('email')} autoComplete="email" required />
                        <Input label="Phone (optional)" type="tel" value={form.phone} onChange={set('phone')} autoComplete="tel" />
                        <Textarea label="Message" value={form.message} onChange={set('message')} rows={5} placeholder="How can we help you?" required />
                        {error && <p className="text-small text-danger" role="alert">{error}</p>}
                        <Button type="submit" size="lg" loading={submitting}>Send message</Button>
                    </form>
                )}

                <div className="space-y-8">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <a href={getWhatsAppUrl('Hi! I would like to get in touch.')} target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 rounded-lg border border-line bg-surface p-5 transition-shadow hover:shadow-md">
                            <span className="grid size-12 shrink-0 place-items-center rounded-full bg-success text-white"><MessageCircle size={22} aria-hidden="true" /></span>
                            <span>
                                <span className="block text-caption font-semibold uppercase tracking-wider text-success">WhatsApp · fastest</span>
                                <span className="font-medium text-ink">{contact.whatsappDisplay}</span>
                            </span>
                        </a>
                        {hasInstagramUrl(instagramUrl) && (
                            <a href={instagramUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 rounded-lg border border-line bg-surface p-5 transition-shadow hover:shadow-md">
                                <span className="grid size-12 shrink-0 place-items-center rounded-full bg-primary text-white"><InstagramIcon size={22} /></span>
                                <span>
                                    <span className="block text-caption font-semibold uppercase tracking-wider text-primary">Instagram</span>
                                    <span className="font-medium text-ink">@{social.instagramHandle}</span>
                                </span>
                            </a>
                        )}
                    </div>

                    <ul className="space-y-6">
                        <ContactRow icon={Phone} label="Phone / WhatsApp" value={contact.whatsappDisplay} href={getWhatsAppUrl()} />
                        <ContactRow icon={Mail} label="Email" value={contact.email} href={`mailto:${contact.email}`} />
                        <ContactRow icon={Clock} label="Hours" value={contact.businessHours} />
                    </ul>
                </div>
            </div>
        </>
    );
}
