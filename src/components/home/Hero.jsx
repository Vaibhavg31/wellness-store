import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Leaf, ShieldCheck, Star } from 'lucide-react';
import Button from '@/components/ui/Button';
import Price from '@/components/ui/Price';
import { useSiteContent } from '@/contexts/SiteContentContext';
import { imageUrl } from '@/services/api';

const BADGE_ICONS = { shield: ShieldCheck, star: Star, sparkles: Leaf };

export default function Hero({ products }) {
    const { content } = useSiteContent();
    const hero = content.hero;

    const featured = useMemo(() => {
        const withImage = products.filter((p) => p.images?.[0]);
        return withImage.find((p) => p.id === hero.featuredProductId) ?? withImage.find((p) => p.isBestSeller) ?? withImage[0] ?? null;
    }, [products, hero.featuredProductId]);

    const image = featured?.images?.[0] ?? hero.images?.[0];

    return (
        <section className="relative overflow-hidden bg-canvas">
            <div className="container-page grid items-center gap-10 py-10 sm:py-14 lg:grid-cols-2 lg:gap-16 lg:py-20">
                <div className="animate-fade-up">
                    {hero.badge && (
                        <p className="mb-5 inline-flex items-center gap-2 rounded-full bg-primary-tint px-4 py-1.5 text-caption font-semibold text-primary-deep">
                            <ShieldCheck size={14} aria-hidden="true" /> {hero.badge}
                        </p>
                    )}
                    <h1>
                        {hero.headline} <span className="text-primary">{hero.headlineAccent}</span>
                    </h1>
                    <p className="mt-5 max-w-xl text-lead text-muted">{hero.subheadline}</p>
                    <div className="mt-8 flex flex-wrap gap-3">
                        <Link to={hero.primaryCta?.href || '/shop'}>
                            <Button size="lg">
                                {hero.primaryCta?.label || 'Shop now'} <ArrowRight size={18} aria-hidden="true" />
                            </Button>
                        </Link>
                        <Link to="/about"><Button size="lg" variant="outline">Our story</Button></Link>
                    </div>
                    {hero.trustBadges?.length > 0 && (
                        <ul className="mt-10 flex flex-wrap gap-x-8 gap-y-3">
                            {hero.trustBadges.map((badge) => {
                                const Icon = BADGE_ICONS[badge.icon] ?? Leaf;
                                return (
                                    <li key={badge.label} className="flex items-center gap-2 text-small font-medium text-ink">
                                        <Icon size={18} className="text-accent-ink" aria-hidden="true" /> {badge.label}
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>

                <div className="relative mx-auto w-full max-w-lg lg:max-w-none">
                    <div className="absolute -inset-4 -z-10 rounded-[2rem] bg-primary-tint" aria-hidden="true" />
                    {image && (
                        <img
                            src={imageUrl(image)}
                            alt={featured?.title ?? ''}
                            width="720"
                            height="800"
                            fetchPriority="high"
                            decoding="async"
                            className="aspect-[9/10] w-full rounded-xl object-cover shadow-lg"
                        />
                    )}
                    {featured && (
                        <Link
                            to={`/product/${featured.id}`}
                            className="absolute -bottom-5 left-4 right-4 flex items-center justify-between gap-4 rounded-lg bg-surface p-4 shadow-md transition-shadow hover:shadow-lg sm:left-auto sm:right-6 sm:w-72"
                        >
                            <span className="min-w-0">
                                <span className="eyebrow block">Featured</span>
                                <span className="block truncate font-medium text-ink">{featured.title}</span>
                                <Price price={featured.price} originalPrice={featured.originalPrice} />
                            </span>
                            <ArrowRight size={20} className="shrink-0 text-primary" aria-hidden="true" />
                        </Link>
                    )}
                </div>
            </div>
        </section>
    );
}
