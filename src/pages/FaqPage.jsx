import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import SectionTitle from '@/components/ui/SectionTitle';
import { useSiteContent } from '@/contexts/SiteContentContext';

export default function FaqPage() {
    const { content } = useSiteContent();
    const { contactPage } = content;
    const faqs = contactPage.faqs ?? [];
    const [openFaq, setOpenFaq] = useState(null);

    return (
        <div className="pb-20 px-4 sm:px-6 lg:px-8 pt-2 sm:pt-4">
            <div className="max-w-3xl mx-auto px-6 lg:px-8">
                <SectionTitle
                    subtitle="FAQ"
                    title="Frequently Asked Questions"
                    description="Everything you need to know about our products, purity, and orders."
                />

                <div className="space-y-3">
                    {faqs.map((faq, i) => (
                        <div key={i} className="border border-warm-beige/30">
                            <button
                                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                                className="w-full flex items-center justify-between p-5 text-left hover:bg-cream/30 transition-colors"
                                aria-expanded={openFaq === i}
                            >
                                <span className="font-serif text-lg text-dark-chocolate pr-4">{faq.question}</span>
                                <ChevronDown size={18} className={`flex-shrink-0 text-soft-brown transition-transform duration-300 ${openFaq === i ? 'rotate-180' : ''}`} />
                            </button>
                            <AnimatePresence>
                                {openFaq === i && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.3 }}
                                        className="overflow-hidden"
                                    >
                                        <p className="px-5 pb-5 text-soft-brown font-light leading-relaxed text-sm">{faq.answer}</p>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
