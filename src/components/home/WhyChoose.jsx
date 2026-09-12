import { motion } from 'framer-motion';
import { Shield, Droplets, Heart, Gem, Sparkles, Sun, MessageCircle } from 'lucide-react';
import SectionTitle from '@/components/ui/SectionTitle';
import Button from '@/components/ui/Button';
import InstagramIcon from '@/components/ui/InstagramIcon';
import { useSiteContent } from '@/contexts/SiteContentContext';
import { useWhatsApp } from '@/hooks/useWhatsApp';
import { hasInstagramUrl } from '@/utils/socialLinks';

const iconMap = {
    shield: Shield,
    droplets: Droplets,
    heart: Heart,
    gem: Gem,
    sparkles: Sparkles,
    sun: Sun,
};

const InstagramIconInline = () => <InstagramIcon size={16} />;

export default function WhyChoose() {
    const { content } = useSiteContent();
    const section = content.whyChoose;
    const { social } = content;
    const instagramUrl = social.instagramUrl?.trim();
    const instagramLinked = hasInstagramUrl(instagramUrl);
    const { getWhatsAppUrl } = useWhatsApp();

    return (
        <section className="py-14 md:py-20 px-4 sm:px-6 lg:px-8 bg-ivory">
            <div className="max-w-6xl mx-auto">
                <SectionTitle
                    subtitle={section.subtitle}
                    title={section.title}
                    description={section.description}
                />

                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
                    {(section.benefits ?? []).map((benefit, i) => {
                        const Icon = iconMap[benefit.icon] ?? Sparkles;
                        return (
                            <motion.div
                                key={benefit.title}
                                initial={{ opacity: 0, y: 16 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true, margin: '-40px' }}
                                transition={{ delay: i * 0.06, duration: 0.45 }}
                                className="group p-6 sm:p-8 rounded-2xl border border-border/40 bg-cream/40 hover:bg-cream hover:border-wine/15 hover:shadow-md transition-all duration-400"
                            >
                                <div className="w-11 h-11 rounded-full bg-wine/8 flex items-center justify-center mb-4 group-hover:bg-wine/12 transition-colors">
                                    <Icon size={20} className="text-wine" strokeWidth={1.25} />
                                </div>
                                <h3 className="font-serif text-lg sm:text-xl text-charcoal mb-2">{benefit.title}</h3>
                                <p className="text-sm text-soft-brown font-light leading-relaxed">{benefit.description}</p>
                            </motion.div>
                        );
                    })}
                </div>

                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.2, duration: 0.5 }}
                    className="mt-12 sm:mt-14 p-6 sm:p-8 rounded-2xl bg-wine/5 border border-wine/10 text-center"
                >
                    <p className="text-sm text-soft-brown mb-5 max-w-md mx-auto">{section.ctaText}</p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                        {instagramLinked && (
                        <a href={instagramUrl} target="_blank" rel="noopener noreferrer" className="inline-flex">
                            <Button variant="outline" size="md" className="gap-2 w-full sm:w-auto border-wine/30 text-wine hover:bg-wine/5">
                                <InstagramIconInline />
                                @{social.instagramHandle}
                            </Button>
                        </a>
                        )}
                        <a
                            href={getWhatsAppUrl('Hi! I have a question about your products.')}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex"
                        >
                            <Button variant="gold" size="md" className="gap-2 w-full sm:w-auto bg-[#25D366] hover:bg-[#20BD5A] border-[#25D366] text-white">
                                <MessageCircle size={18} />
                                Chat on WhatsApp
                            </Button>
                        </a>
                    </div>
                </motion.div>
            </div>
        </section>
    );
}
