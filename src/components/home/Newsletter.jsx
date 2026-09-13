import { useState } from 'react';
import { Mail, Sparkles } from 'lucide-react';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Logo from '@/components/ui/Logo';
import { api } from '@/services/api';
import { useToast } from '@/contexts/ToastContext';
import { useSiteContent } from '@/contexts/SiteContentContext';

export default function Newsletter() {
    const { content } = useSiteContent();
    const nl = content.newsletter;
    const [email, setEmail] = useState('');
    const [submitted, setSubmitted] = useState(false);
    const [loading, setLoading] = useState(false);
    const { showToast } = useToast();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.post('/api/newsletter/subscribe', { email, source: 'homepage' });
            setSubmitted(true);
            setEmail('');
            setTimeout(() => setSubmitted(false), 4000);
        } catch {
            showToast('Could not subscribe. Please try again.', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <section className="py-16 md:py-20 px-6 lg:px-8 bg-section-emerald">
            <div className="max-w-6xl mx-auto">
                <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
                    <div>
                        <Logo size="lg" showHover variant="light" className="mb-6" />
                        <span className="inline-flex items-center gap-2 text-xs tracking-[0.3em] uppercase text-turmeric mb-4">
                            <Sparkles size={12} />
                            {nl.badge}
                        </span>
                        <h2 className="font-display text-3xl md:text-4xl font-light text-cream mb-4 leading-tight">
                            {nl.title}
                        </h2>
                        <p className="text-cream/65 font-light leading-relaxed max-w-md">
                            {nl.description}
                        </p>
                    </div>

                    <div className="bg-cream/10 border border-cream/15 rounded-2xl p-8">
                        {submitted ? (
                            <p className="text-center text-cream font-light py-4">{nl.successMessage}</p>
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="relative">
                                    <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate" />
                                    <Input
                                        type="email"
                                        placeholder="Enter your email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                        className="pl-11 bg-cream border-0"
                                    />
                                </div>
                                <Button variant="turmeric" size="lg" className="w-full" type="submit" disabled={loading}>
                                    {loading ? 'Subscribing...' : nl.buttonLabel}
                                </Button>
                                <p className="text-[10px] text-cream/40 text-center tracking-wide">
                                    {nl.disclaimer}
                                </p>
                            </form>
                        )}
                    </div>
                </div>
            </div>
        </section>
    );
}
