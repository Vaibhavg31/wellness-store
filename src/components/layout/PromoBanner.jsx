import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useState } from 'react';
import { useSiteContent } from '@/contexts/SiteContentContext';

export default function PromoBanner() {
    const { content } = useSiteContent();
    const promo = content.promo;
    const [dismissed, setDismissed] = useState(() => {
        try {
            return sessionStorage.getItem('krivea-promo-dismissed') === '1';
        } catch {
            return false;
        }
    });

    if (!promo?.enabled || dismissed || content.sections?.promoBanner === false) {
        return null;
    }

    const dismiss = () => {
        setDismissed(true);
        try {
            sessionStorage.setItem('krivea-promo-dismissed', '1');
        } catch { /* ignore */ }
    };

    return (
        <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            className="relative z-[60] bg-gradient-to-r from-wine via-wine-deep to-wine text-ivory text-center type-announce sm:text-sm py-2.5 px-10"
        >
            <Link to={promo.href || '/shop'} className="hover:text-blush transition-colors inline-block">
                {promo.text}{' '}
                <span className="font-semibold text-gold tracking-wide">{promo.code}</span>
                {promo.suffix ? ` ${promo.suffix}` : ''}
            </Link>
            <button
                type="button"
                onClick={dismiss}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-ivory/50 hover:text-ivory"
                aria-label="Dismiss offer"
            >
                <X size={14} />
            </button>
        </motion.div>
    );
}
