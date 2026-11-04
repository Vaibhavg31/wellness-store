import { useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, ChevronDown, CircleHelp, Leaf } from 'lucide-react';
import { ReelVideo, ReelViewer } from '@/components/video/Reels';
import { imageUrl } from '@/services/api';
import { cn } from '@/utils/formatPrice';

/** A section heading used by every block below the buy box. */
function Heading({ eyebrow, title, children }) {
    return (
        <div className="mb-5 flex flex-col gap-1 sm:mb-6 sm:items-center sm:text-center">
            {eyebrow && <p className="eyebrow">{eyebrow}</p>}
            <h2 className="text-h3">{title}</h2>
            {children}
        </div>
    );
}

/** The key ingredients, each with its picture (or a leaf when it has none yet) and what it does. */
export function HeroIngredients({ product }) {
    const items = product.ingredients ?? [];
    if (items.length === 0) return null;
    return (
        <section aria-labelledby="hero-ingredients" className="section">
            <div className="container-page">
                <Heading eyebrow="What is inside" title={<span id="hero-ingredients">Hero ingredients</span>}>
                    <p className="max-w-xl text-small text-muted">The plants and nutrients that do the work in {product.title}.</p>
                </Heading>
                <ul className="flex flex-wrap justify-center gap-x-4 gap-y-8 sm:gap-x-8">
                    {items.map((item) => (
                        <li key={item.name} className="flex w-[calc(50%-0.5rem)] flex-col items-center text-center sm:w-52">
                            <span className="grid size-28 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-primary-tint to-accent-tint shadow-sm ring-4 ring-surface sm:size-36">
                                {item.image
                                    ? <img src={imageUrl(item.image, 360)} alt="" width="144" height="144" loading="lazy" className="size-full object-cover" />
                                    : <Leaf size={42} strokeWidth={1.4} className="text-primary" aria-hidden="true" />}
                            </span>
                            <h3 className="mt-3 font-sans text-body font-semibold">{item.name}</h3>
                            {item.benefit && <p className="mt-1 max-w-[16rem] text-small text-muted">{item.benefit}</p>}
                        </li>
                    ))}
                </ul>
            </div>
        </section>
    );
}

/** Information banners: the pictures the admin uploaded for this product. Nothing is generated, so a page never repeats what the tabs already say. */
export function InfoBanners({ product }) {
    const uploaded = product.infoBanners ?? [];
    if (uploaded.length === 0) return null;
    return (
        <section aria-label="Product information" className="section bg-canvas-alt">
            <div className="container-page grid gap-5 lg:gap-6">
                {uploaded.map((b) => (
                    <img key={b.image} src={imageUrl(b.image, 1400)} alt={b.alt || ''} loading="lazy" className="w-full rounded-xl object-cover shadow-sm" />
                ))}
            </div>
        </section>
    );
}

/** Frequently asked questions in two columns, one open at a time within a column. */
export function ProductFaq({ product }) {
    const faqs = product.faqs ?? [];
    const [open, setOpen] = useState(null);
    const columns = useMemo(() => {
        const half = Math.ceil(faqs.length / 2);
        return [faqs.slice(0, half), faqs.slice(half)];
    }, [faqs]);
    if (faqs.length === 0) return null;

    const item = (faq, id) => {
        const isOpen = open === id;
        return (
            <li key={id} className="rounded-xl bg-surface ring-1 ring-line">
                <button type="button" onClick={() => setOpen(isOpen ? null : id)} aria-expanded={isOpen} aria-controls={`faq-${id}`} className="flex w-full items-center gap-3 px-4 py-3.5 text-left">
                    <CircleHelp size={20} className="shrink-0 text-primary" strokeWidth={1.6} aria-hidden="true" />
                    <span className="flex-1 text-small font-medium text-ink sm:text-body">{faq.question}</span>
                    <ChevronDown size={18} className={cn('shrink-0 text-muted transition-transform duration-200', isOpen && 'rotate-180')} aria-hidden="true" />
                </button>
                {isOpen && <p id={`faq-${id}`} className="animate-fade-in px-4 pb-4 pl-12 text-small leading-relaxed text-muted">{faq.answer}</p>}
            </li>
        );
    };

    return (
        <section aria-labelledby="product-faq" className="section">
            <div className="container-page">
                <Heading title={<span id="product-faq">Frequently asked questions</span>} />
                <div className="grid items-start gap-3 md:grid-cols-2 md:gap-4">
                    {columns.map((column, c) => (
                        <ul key={c} className="space-y-3 md:space-y-4">{column.map((faq, i) => item(faq, `${c}-${i}`))}</ul>
                    ))}
                </div>
            </div>
        </section>
    );
}

/** Short videos about the product, right under the questions. */
export function ProductVideos({ product }) {
    const videos = useMemo(() => (product.videos ?? []).map((v, i) => ({ id: `${product.id}-v${i}`, title: v.title, videoUrl: v.url, poster: v.poster })), [product]);
    const [openIndex, setOpenIndex] = useState(null);
    const scroller = useRef(null);
    if (videos.length === 0) return null;
    const slide = (d) => scroller.current?.scrollBy({ left: d * scroller.current.clientWidth * 0.8, behavior: 'smooth' });

    return (
        <section aria-labelledby="product-videos" className="section pt-0">
            <div className="container-page">
                <Heading eyebrow="Watch" title={<span id="product-videos">See it in action</span>} />
                <div className="relative">
                    <ul ref={scroller} className="scrollbar-none -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-pl-4 px-4 pb-2 sm:mx-0 sm:justify-center sm:px-0">
                        {videos.map((reel, i) => (
                            <li key={reel.id} className="w-[56%] shrink-0 snap-start sm:w-56 lg:w-60">
                                <ReelVideo reel={reel} label={reel.title || product.title} onOpen={() => setOpenIndex(i)} />
                            </li>
                        ))}
                    </ul>
                    {videos.length > 4 && (
                        <>
                            <button type="button" onClick={() => slide(-1)} aria-label="Scroll videos left" className="absolute -left-4 top-1/2 hidden size-10 -translate-y-1/2 place-items-center rounded-full border border-line-strong bg-surface shadow-md lg:grid"><ChevronLeft size={18} /></button>
                            <button type="button" onClick={() => slide(1)} aria-label="Scroll videos right" className="absolute -right-4 top-1/2 hidden size-10 -translate-y-1/2 place-items-center rounded-full border border-line-strong bg-surface shadow-md lg:grid"><ChevronRight size={18} /></button>
                        </>
                    )}
                </div>
            </div>
            {openIndex !== null && <ReelViewer reels={videos} index={openIndex} productFor={() => null} onIndex={setOpenIndex} onClose={() => setOpenIndex(null)} />}
        </section>
    );
}
