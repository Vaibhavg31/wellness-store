import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useDialog } from '@/hooks/useDialog';
import { cn } from '@/utils/formatPrice';

export default function Drawer({ isOpen, onClose, children, title, subtitle, side = 'right', wide = false, admin = false }) {
    const panelRef = useDialog(isOpen, onClose);
    if (!isOpen) return null;

    return createPortal(
        <div className={cn('fixed inset-0 z-[100]', admin && 'admin-panel')}>
            <div className="absolute inset-0 animate-fade-in bg-ink/50" onClick={onClose} aria-hidden="true" />
            <div
                ref={panelRef}
                role="dialog"
                aria-modal="true"
                aria-label={title}
                tabIndex={-1}
                className={cn(
                    'absolute top-0 flex h-dvh w-full flex-col bg-surface shadow-lg focus:outline-none',
                    side === 'right' ? 'right-0 animate-slide-in-right' : 'left-0',
                    wide ? 'max-w-xl' : 'max-w-md',
                )}
            >
                <div className="flex shrink-0 items-start justify-between gap-4 border-b border-line px-5 py-4 sm:px-6">
                    <div className="min-w-0">
                        {title && <h3 className={cn('truncate', admin ? 'font-sans text-h4' : 'text-h4')}>{title}</h3>}
                        {subtitle && <p className="mt-1 text-small text-muted">{subtitle}</p>}
                    </div>
                    <button type="button" onClick={onClose} className="-mr-2 grid size-9 shrink-0 place-items-center rounded-full text-ink hover:bg-canvas-alt" aria-label="Close panel">
                        <X size={18} />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6 sm:py-6">{children}</div>
            </div>
        </div>,
        document.body,
    );
}
