import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useDialog } from '@/hooks/useDialog';
import { usePresence } from '@/hooks/usePresence';
import { cn } from '@/utils/formatPrice';

/**
 * A panel that rises from the bottom on a phone (a bottom sheet, the thumb-friendly way to ask something without leaving the page)
 * and sits centred as a dialog on a larger screen. Closes on Escape, the dim backdrop or the close button.
 */
export default function Sheet({ open, onClose, title, children, className }) {
    const panelRef = useDialog(open, onClose);
    const { mounted, closing } = usePresence(open);
    if (!mounted) return null;
    return createPortal(
        <div className={cn('fixed inset-0 z-[120] flex items-end justify-center sm:items-center sm:p-6', closing && 'pointer-events-none')}>
            <div className={cn('absolute inset-0 bg-primary-night/55 backdrop-blur-[2px]', closing ? 'animate-fade-out' : 'animate-fade-in')} onClick={onClose} aria-hidden="true" />
            <div
                ref={panelRef}
                role="dialog"
                aria-modal="true"
                aria-label={title}
                tabIndex={-1}
                className={cn(
                    'relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-[1.75rem] bg-surface shadow-lg focus:outline-none sm:max-w-md sm:rounded-[1.75rem]',
                    closing ? 'animate-sheet-down sm:animate-fade-down' : 'animate-sheet-up sm:animate-fade-up',
                    className,
                )}
            >
                <span className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-line sm:hidden" aria-hidden="true" />
                <button type="button" onClick={onClose} aria-label="Close" className="absolute right-3 top-3 z-10 grid size-10 place-items-center rounded-full bg-canvas-alt text-ink transition-colors hover:bg-accent">
                    <X size={18} aria-hidden="true" />
                </button>
                <div className="overflow-y-auto overscroll-contain">{children}</div>
            </div>
        </div>,
        document.body,
    );
}
