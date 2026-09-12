import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

const sizeStyles = {
    sm: 'max-w-md',
    md: 'max-w-2xl',
    lg: 'max-w-4xl',
};

const panelTransition = { duration: 0.35, ease: [0.32, 0.72, 0, 1] };

export default function Modal({ isOpen, onClose, children, title, size = 'md' }) {
    useEffect(() => {
        if (!isOpen) return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = prev;
        };
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return;
        const handleEsc = (e) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [isOpen, onClose]);

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 h-dvh w-screen">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="absolute inset-0 bg-dark-chocolate/50 backdrop-blur-[3px]"
                        onClick={onClose}
                        aria-hidden="true"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.96, y: 16 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.96, y: 16 }}
                        transition={panelTransition}
                        role="dialog"
                        aria-modal="true"
                        aria-label={title}
                        className={`relative w-full ${sizeStyles[size]} bg-ivory luxury-shadow-lg max-h-[min(90dvh,90vh)] overflow-hidden flex flex-col`}
                    >
                        <div className="flex items-center justify-between px-6 py-5 border-b border-warm-beige/30 flex-shrink-0">
                            {title && (
                                <h3 className="font-serif text-2xl font-light text-dark-chocolate">
                                    {title}
                                </h3>
                            )}
                            <button
                                onClick={onClose}
                                className="ml-auto p-2 hover:bg-cream rounded-full transition-colors"
                                aria-label="Close modal"
                            >
                                <X size={20} className="text-dark-chocolate" />
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto overscroll-contain">{children}</div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>,
        document.body,
    );
}
