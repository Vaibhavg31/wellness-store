import { ChevronDown } from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import { useSiteContent } from '@/contexts/SiteContentContext';

export default function FaqPage() {
    const { content } = useSiteContent();
    const faqs = content.contactPage.faqs ?? [];

    return (
        <>
            <PageHeader eyebrow="FAQ" title="Frequently asked questions" description="Everything you need to know about our products, purity and orders." />
            <div className="container-page py-10 lg:py-16">
                <ul className="mx-auto max-w-3xl space-y-3">
                    {faqs.map((faq) => (
                        <li key={faq.question}>
                            <details className="group rounded-lg border border-line bg-surface open:shadow-sm">
                                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-lg p-5 [&::-webkit-details-marker]:hidden">
                                    <span className="font-display text-h4">{faq.question}</span>
                                    <ChevronDown size={20} className="shrink-0 text-muted transition-transform duration-300 group-open:rotate-180" aria-hidden="true" />
                                </summary>
                                <p className="px-5 pb-5 text-muted">{faq.answer}</p>
                            </details>
                        </li>
                    ))}
                </ul>
            </div>
        </>
    );
}
