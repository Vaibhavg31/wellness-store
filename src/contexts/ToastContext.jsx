import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, AlertCircle, Info, ShoppingBag, X } from 'lucide-react';
import { imageUrl } from '@/services/api';
import { cn } from '@/utils/formatPrice';

const ToastContext = createContext(null);

const ICONS = { success: CheckCircle, error: AlertCircle, info: Info, cart: ShoppingBag };
const ICON_TONE = { success: 'text-success', error: 'text-danger', info: 'text-info', cart: 'text-success' };

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);
    const navigate = useNavigate();

    const dismissToast = useCallback((id) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    const showToast = useCallback((message, type = 'info', options = {}) => {
        const id = Date.now() + Math.random();
        const duration = options.duration ?? (options.product ? 4200 : 3500);
        setToasts((prev) => [...prev, { id, message, type: options.product ? 'cart' : type, product: options.product || null }]);
        setTimeout(() => dismissToast(id), duration);
    }, [dismissToast]);

    const value = useMemo(() => ({ showToast }), [showToast]);

    return (
        <ToastContext.Provider value={value}>
            {children}
            <div
                className="pointer-events-none fixed bottom-4 right-4 z-[110] flex max-w-[calc(100vw-2rem)] flex-col gap-2 sm:bottom-6 sm:right-6 sm:max-w-sm"
                role="region"
                aria-live="polite"
                aria-label="Notifications"
            >
                {toasts.map((toast) => {
                    const Icon = ICONS[toast.type] || Info;
                    const openCart = toast.type === 'cart'
                        ? () => { dismissToast(toast.id); navigate('/cart'); }
                        : undefined;
                    return (
                        <div
                            key={toast.id}
                            role="status"
                            className={cn(
                                'pointer-events-auto flex animate-fade-up items-center gap-3 rounded-lg border border-line bg-surface p-3 pr-2 shadow-md',
                                openCart && 'cursor-pointer',
                            )}
                            onClick={openCart}
                        >
                            {toast.product?.image ? (
                                <img src={imageUrl(toast.product.image)} alt="" width="44" height="44" className="size-11 shrink-0 rounded-md object-cover" />
                            ) : (
                                <Icon size={20} className={cn('shrink-0', ICON_TONE[toast.type])} aria-hidden="true" />
                            )}
                            <div className="min-w-0 flex-1">
                                <p className="text-small font-medium text-ink">{toast.message}</p>
                                {toast.product?.title && <p className="truncate text-caption text-muted">{toast.product.title}</p>}
                                {openCart && <p className="text-caption font-medium text-primary">View bag</p>}
                            </div>
                            <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); dismissToast(toast.id); }}
                                className="grid size-8 shrink-0 place-items-center rounded-full text-muted hover:bg-canvas-alt hover:text-ink"
                                aria-label="Dismiss notification"
                            >
                                <X size={14} />
                            </button>
                        </div>
                    );
                })}
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
