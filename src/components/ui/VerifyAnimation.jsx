import { motion } from 'framer-motion';

/** Subtle verification check — ring draw + check fade. */
export default function VerifyAnimation({ size = 80, className = '' }) {
    const stroke = size * 0.04;
    const radius = (size - stroke * 2) / 2;

    return (
        <div className={`relative inline-flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="absolute inset-0">
                <motion.circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={stroke}
                    className="text-forest/20"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 1 }}
                    transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
                />
                <motion.path
                    d={`M ${size * 0.3} ${size * 0.52} L ${size * 0.44} ${size * 0.66} L ${size * 0.7} ${size * 0.36}`}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={stroke * 1.2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-forest"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 1 }}
                    transition={{ duration: 0.35, delay: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
                />
            </svg>
        </div>
    );
}
