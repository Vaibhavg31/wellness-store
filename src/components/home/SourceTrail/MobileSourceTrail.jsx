import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MapPin, ArrowRight } from 'lucide-react';
import { imageUrl } from '@/services/api';
import { REGIONS, productsForIngredient } from './sourceRegions';

/** Mobile: no pin/scrub or DrawSVG — a plain stacked reveal of each stop,
 *  same trade-off as the rest of the homepage's scroll-story sections. */
export default function MobileSourceTrail({ products }) {
    return (
        <div className="max-w-md mx-auto px-6 space-y-10">
            {REGIONS.map((stop, i) => {
                const matches = productsForIngredient(products, stop.keyword);
                const shopHref = `/shop?search=${encodeURIComponent(stop.keyword)}`;
                return (
                    <motion.div
                        key={stop.id}
                        initial={{ opacity: 0, y: 24 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: '-40px' }}
                        transition={{ duration: 0.5, delay: i * 0.03 }}
                    >
                        <div className="flex items-center gap-2 mb-2">
                            <MapPin size={13} className="text-gold-light" />
                            <p className="type-eyebrow text-gold-light">{stop.region}</p>
                        </div>
                        <h3 className="font-serif text-xl text-ivory mb-2">{stop.ingredient}</h3>
                        <p className="text-ivory/60 text-sm font-light leading-relaxed mb-3">{stop.note}</p>

                        {matches[0] && (
                            <div className="flex items-center gap-3 rounded-lg border border-white/15 bg-white/[0.06] p-2.5 mb-3">
                                <img
                                    src={imageUrl(matches[0].images?.[0])}
                                    alt=""
                                    className="w-10 h-10 rounded-md object-cover flex-shrink-0 bg-white/10"
                                />
                                <span className="min-w-0 text-sm text-ivory/90 truncate">{matches[0].title}</span>
                            </div>
                        )}

                        <Link to={shopHref} className="inline-flex items-center gap-1.5 text-sm font-medium text-gold-light">
                            Shop products with this ingredient
                            <ArrowRight size={13} />
                        </Link>
                    </motion.div>
                );
            })}
        </div>
    );
}
