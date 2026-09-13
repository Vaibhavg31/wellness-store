import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '@/utils/formatPrice';

const panelTransition = { duration: 0.4, ease: [0.32, 0.72, 0, 1] };

export default function Drawer({
    isOpen,
    onClose,
    children,
    title,
    subtitle,
    side = 'right',
    wide = false,
    admin = false,
}) {
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
                <div className={cn('fixed inset-0 z-[100] h-dvh w-screen', admin && 'admin-panel')}>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="absolute inset-0 bg-ink/50 backdrop-blur-[3px]"
                        onClick={onClose}
                        aria-hidden="true"
                    />
                    <motion.div
                        initial={{ x: side === 'right' ? '100%' : '-100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: side === 'right' ? '100%' : '-100%' }}
                        transition={panelTransition}
                        className={cn(
                            'absolute top-0 h-dvh w-full bg-cream soft-shadow-lg flex flex-col',
                            side === 'right' ? 'right-0' : 'left-0',
                            wide ? 'max-w-xl' : 'max-w-md',
                        )}
                        role="dialog"
                        aria-modal="true"
                        aria-label={title}
                    >
                        <div className={cn(
                            'flex items-start justify-between gap-4 px-5 py-4 sm:px-6 sm:py-5 border-b flex-shrink-0 bg-cream',
                            admin ? 'border-admin-border' : 'border-border/40',
                        )}>
                            <div className="min-w-0">
                                {title && (
                                    <h3
                                        className={cn(
                                            'text-lg sm:text-xl text-ink truncate',
                                            admin
                                                ? 'font-semibold'
                                                : 'font-display font-light text-ink',
                                        )}
                                    >
                                        {title}
                                    </h3>
                                )}
                                {subtitle && (
                                    <p className={cn('text-xs mt-1 leading-relaxed', admin ? 'text-admin-muted' : 'text-slate')}>
                                        {subtitle}
                                    </p>
                                )}
                            </div>
                            <button
                                onClick={onClose}
                                className="flex-shrink-0 p-2 -mr-1 hover:bg-cream rounded-full transition-colors"
                                aria-label="Close drawer"
                            >
                                <X size={18} className="text-ink" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6 sm:py-6">
                            {children}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>,
        document.body,
    );
}
