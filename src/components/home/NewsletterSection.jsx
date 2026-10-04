import { useState } from 'react';
import { CheckCircle } from 'lucide-react';
import Button from '@/components/ui/Button';
import { useSiteContent } from '@/contexts/SiteContentContext';
import { useToast } from '@/contexts/ToastContext';
import { api } from '@/services/api';

export default function NewsletterSection() {
    const { content } = useSiteContent();
    const { showToast } = useToast();
    const nl = content.newsletter;
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const submit = async (event) => {
        event.preventDefault();
        setLoading(true);
        try {
            await api.post('/api/newsletter/subscribe', { email, source: 'homepage' });
            setSubmitted(true);
            setEmail('');
        } catch {
            showToast('Could not subscribe. Please try again.', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <section className="section bg-canvas">
            <div className="container-page">
                <div className="mx-auto max-w-2xl rounded-xl bg-primary px-6 py-12 text-center text-white sm:px-12">
                    <p className="eyebrow !text-accent-hover">{nl.badge}</p>
                    <h2 className="mt-3 !text-white">{nl.title}</h2>
                    <p className="mt-3 text-white/85">{nl.description}</p>

                    {submitted ? (
                        <p className="mt-8 inline-flex items-center gap-2 font-medium" role="status">
                            <CheckCircle size={20} aria-hidden="true" /> {nl.successMessage}
                        </p>
                    ) : (
                        <form onSubmit={submit} className="mx-auto mt-8 flex max-w-md flex-col gap-3 sm:flex-row">
                            <label htmlFor="newsletter-email" className="sr-only">Email address</label>
                            <input
                                id="newsletter-email"
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="Your email address"
                                autoComplete="email"
                                className="h-12 min-w-0 flex-1 rounded-full bg-surface px-5 text-body text-ink placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-accent"
                            />
                            <Button type="submit" variant="accent" size="lg" loading={loading}>{nl.buttonLabel}</Button>
                        </form>
                    )}
                    <p className="mt-4 text-caption text-white/75">{nl.disclaimer}</p>
                </div>
            </div>
        </section>
    );
}
