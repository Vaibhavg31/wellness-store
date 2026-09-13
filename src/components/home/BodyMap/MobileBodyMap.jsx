import { motion } from 'framer-motion';
import { bestMatchForGoal } from '../wellnessRituals';
import { ZONES } from './bodyMapZones';
import BodyFigure from './BodyFigure';
import ZoneProductCard from './ZoneProductCard';

/** Mobile: the figure sits once, above the text, static (no pin/scrub —
 *  fighting mobile scroll chrome costs more than it adds). Zones fade in
 *  as a plain stacked reveal, same "low -> full" read as the rest of the
 *  homepage's story sections on small screens. */
export default function MobileBodyMap({ products }) {
    return (
        <div className="relative bg-[#0A3D25] py-16 px-6">
            <div className="max-w-md mx-auto mb-12 flex justify-center">
                <BodyFigure reducedMotion />
            </div>
            <div className="max-w-md mx-auto space-y-10">
                {ZONES.map((zone, i) => {
                    const Icon = zone.icon;
                    const product = bestMatchForGoal(products, zone.goalId);
                    return (
                        <motion.div
                            key={zone.id}
                            initial={{ opacity: 0, y: 24 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: '-40px' }}
                            transition={{ duration: 0.5, delay: i * 0.03 }}
                        >
                            <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-white/10 border border-white/15 mb-3">
                                <Icon size={16} className="text-turmeric-light" />
                            </span>
                            <h3 className="font-display text-xl text-cream mb-2">{zone.title}</h3>
                            <p className="text-cream/60 text-sm font-light leading-relaxed mb-3">{zone.copy}</p>
                            <ZoneProductCard product={product} />
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
}
