import { createContext, useContext, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, AlertCircle, Info, ShoppingBag, X } from 'lucide-react';
import { imageUrl } from '@/services/api';

const ToastContext = createContext(null);

const ICONS = {
    success: CheckCircle,
    error: AlertCircle,
    info: Info,
    cart: ShoppingBag,
};

const STYLES = {
    success: 'bg-charcoal/95 text-ivory border border-emerald/30',
    error: 'bg-charcoal/95 text-ivory border border-red-400/30',
    info: 'bg-charcoal/95 text-ivory border border-ivory/10',
    cart: 'bg-charcoal/95 text-ivory border border-wine/30',
};

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);
    const navigate = useNavigate();

    const dismissToast = useCallback((id) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    const showToast = useCallback((message, type = 'info', options = {}) => {
        const id = Date.now() + Math.random();
        const duration = options.duration ?? (options.product ? 4200 : 3500);
        const toastType = options.product ? 'cart' : type;

        setToasts((prev) => [...prev, {
            id,
            message,
            type: toastType,
            product: options.product || null,
        }]);

        setTimeout(() => dismissToast(id), duration);
    }, [dismissToast]);

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            <div className="fixed bottom-6 right-4 sm:right-6 z-[100] flex flex-col gap-2.5 max-w-[calc(100vw-2rem)] sm:max-w-sm pointer-events-none">
                <AnimatePresence mode="popLayout">
                    {toasts.map((toast) => {
                        const Icon = ICONS[toast.type] || Info;
                        const goToCart = toast.type === 'cart'
                            ? () => { dismissToast(toast.id); navigate('/cart'); }
                            : undefined;
                        return (
                            <motion.div
                                key={toast.id}
                                layout
                                role="status"
                                initial={{ opacity: 0, y: 16, scale: 0.96 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, x: 24, scale: 0.96 }}
                                transition={{ duration: 0.32, ease: [0.25, 0.46, 0.45, 0.94] }}
                                onClick={goToCart}
                                className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl backdrop-blur-sm ${STYLES[toast.type]} ${goToCart ? 'cursor-pointer hover:brightness-110 transition-[filter]' : ''}`}
                            >
                                {toast.product?.image ? (
                                    <img
                                        src={imageUrl(toast.product.image)}
                                        alt=""
                                        className="w-11 h-11 object-cover rounded-lg flex-shrink-0 ring-1 ring-ivory/10"
                                    />
                                ) : (
                                    <Icon size={18} className="flex-shrink-0 text-emerald" strokeWidth={1.5} />
                                )}
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium leading-snug">{toast.message}</p>
                                    {toast.product?.title && (
                                        <p className="text-xs text-ivory/60 line-clamp-1 mt-0.5">{toast.product.title}</p>
                                    )}
                                </div>
                                <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); dismissToast(toast.id); }}
                                    className="flex-shrink-0 p-1 rounded-full text-ivory/40 hover:text-ivory/80 transition-colors"
                                    aria-label="Dismiss"
                                >
                                    <X size={14} />
                                </button>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </div>
        </ToastContext.Provider>
    );
}

export function useToast() {
    const ctx = useContext(ToastContext);
    if (!ctx) throw new Error('useToast must be used within ToastProvider');
    return ctx;
}

/** Consistent add-to-cart toast with product preview. */
export function showCartToast(showToast, product, message = 'Added to bag') {
    showToast(message, 'success', {
        product: {
            title: product.title,
            image: product.images?.[0],
        },
    });
}
