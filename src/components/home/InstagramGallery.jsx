import { motion } from 'framer-motion';
import SectionTitle from '@/components/ui/SectionTitle';
import InstagramIcon from '@/components/ui/InstagramIcon';
import Button from '@/components/ui/Button';
import { useSiteContent } from '@/contexts/SiteContentContext';
import { imageUrl } from '@/services/api';
import { hasInstagramUrl } from '@/utils/socialLinks';

export default function InstagramGallery() {
    const { content } = useSiteContent();
    const ig = content.instagram;
    const { social } = content;
    const images = (ig.images ?? []).filter(Boolean);
    const profileUrl = social.instagramUrl?.trim();
    const showProfileLink = hasInstagramUrl(profileUrl);

    if (images.length === 0 && !showProfileLink) return null;

    return (
        <section className="py-14 md:py-20 px-4 sm:px-6 lg:px-8 bg-cream/50" aria-labelledby="instagram-section-title">
            <div className="max-w-6xl mx-auto">
                <SectionTitle
                    subtitle={ig.subtitle || `@${social.instagramHandle}`}
                    title={ig.title}
                    description={ig.description}
                />

                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-40px' }}
                    transition={{ duration: 0.45 }}
                    className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 mb-10 sm:mb-12 p-6 sm:p-8 rounded-2xl border border-forest/10 bg-white/80"
                >
                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full p-[3px] bg-gradient-to-tr from-[#833AB4] via-[#FD1D1D] to-[#FCAF45] flex-shrink-0">
                        <div className="w-full h-full rounded-full bg-cream flex items-center justify-center">
                            <InstagramIcon size={36} className="text-forest" filled />
                        </div>
                    </div>
                    <div className="text-center sm:text-left">
                        <h2 id="instagram-section-title" className="font-display text-xl sm:text-2xl text-ink mb-1">
                            @{social.instagramHandle}
                        </h2>
                        {showProfileLink && (
                            <p className="text-sm text-slate font-light mb-4">
                                instagram.com/{social.instagramHandle}
                            </p>
                        )}
                        {showProfileLink && (
                            <a href={profileUrl} target="_blank" rel="noopener noreferrer" className="inline-flex">
                                <Button variant="outline" size="md" className="gap-2 border-forest/25 text-forest hover:bg-forest/5">
                                    <InstagramIcon size={18} filled />
                                    View on Instagram
                                </Button>
                            </a>
                        )}
                    </div>
                </motion.div>

                {images.length > 0 && (
                <div className="grid grid-cols-3 md:grid-cols-6 gap-2 sm:gap-3 md:gap-4">
                    {images.map((src) => (
                        showProfileLink ? (
                        <a
                            key={src}
                            href={profileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group relative aspect-square overflow-hidden rounded-lg sm:rounded-xl ring-1 ring-border/30 hover:ring-forest/30 transition-all duration-300"
                            aria-label={`View @${social.instagramHandle} on Instagram`}
                        >
                            <img
                                src={imageUrl(src)}
                                alt=""
                                loading="lazy"
                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                            />
                            <div className="absolute inset-0 bg-forest/0 group-hover:bg-forest/40 transition-colors duration-400 flex items-center justify-center">
                                <InstagramIcon
                                    size={22}
                                    className="text-cream opacity-0 group-hover:opacity-100 transition-opacity duration-400"
                                />
                            </div>
                        </a>
                        ) : (
                        <div
                            key={src}
                            className="relative aspect-square overflow-hidden rounded-lg sm:rounded-xl ring-1 ring-border/30"
                        >
                            <img
                                src={imageUrl(src)}
                                alt=""
                                loading="lazy"
                                className="w-full h-full object-cover"
                            />
                        </div>
                        )
                    ))}
                </div>
                )}
            </div>
        </section>
    );
}
