import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useDialog } from '@/hooks/useDialog';
import { usePresence } from '@/hooks/usePresence';
import { cn } from '@/utils/formatPrice';

/**
 * A side panel. `confirmClose` (true or a message): while the form inside has unsaved changes, closing the panel by a tap
 * outside, Esc or the × asks first, so a stray tap does not throw the typing away. Saving closes it without asking.
 */
export default function Drawer({ isOpen, onClose, children, title, subtitle, side = 'right', wide = false, size, flush = false, admin = false, confirmClose = false }) {
    const requestClose = () => {
        if (confirmClose && !window.confirm(typeof confirmClose === 'string' ? confirmClose : 'Close without saving? The changes you made here will be lost.')) return;
        onClose();
    };
    const panelRef = useDialog(isOpen, requestClose);
    const { mounted, closing } = usePresence(isOpen);
    if (!mounted) return null;

    return createPortal(
        <div className={cn('fixed inset-0 z-[100]', admin && 'admin-panel', closing && 'pointer-events-none')}>
            <div className={cn('absolute inset-0 bg-ink/50', closing ? 'animate-fade-out' : 'animate-fade-in')} onClick={requestClose} aria-hidden="true" />
            <div
                ref={panelRef}
                role="dialog"
                aria-modal="true"
                aria-label={title}
                tabIndex={-1}
                className={cn(
                    'absolute top-0 flex h-dvh w-full flex-col bg-surface shadow-lg focus:outline-none',
                    side === 'right'
                        ? cn('right-0', closing ? 'animate-slide-out-right' : 'animate-slide-in-right')
                        : cn('left-0', closing ? 'animate-slide-out-left' : 'animate-slide-in-left'),
                    size === 'xl' ? 'max-w-[min(72rem,100vw)]' : (size === 'lg' || wide) ? 'max-w-xl' : 'max-w-md',
                )}
            >
                <div className="flex shrink-0 items-start justify-between gap-4 border-b border-line px-5 py-4 sm:px-6">
                    <div className="min-w-0">
                        {title && <h3 className={cn('truncate', admin ? 'font-sans text-h4' : 'text-h4')}>{title}</h3>}
                        {subtitle && <p className="mt-1 text-small text-muted">{subtitle}</p>}
                    </div>
                    <button type="button" onClick={requestClose} className="-mr-2 grid size-11 shrink-0 place-items-center rounded-full text-ink hover:bg-canvas-alt sm:size-9" aria-label="Close panel">
                        <X size={18} />
                    </button>
                </div>
                <div className={cn('min-h-0 flex-1', flush ? 'overflow-hidden' : 'overflow-y-auto overscroll-contain px-5 py-5 sm:px-6 sm:py-6')}>{children}</div>
            </div>
        </div>,
        document.body,
    );
}
