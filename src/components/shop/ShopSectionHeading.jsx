import { motion } from 'framer-motion';
import { cn } from '@/utils/formatPrice';

export default function ShopSectionHeading({ title, className = '', align = 'center' }) {
    return (
        <motion.h2
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45 }}
            className={cn(
                'type-eyebrow font-semibold text-charcoal',
                align === 'center' ? 'text-center' : 'text-left',
                className,
            )}
        >
            {title}
        </motion.h2>
    );
}
