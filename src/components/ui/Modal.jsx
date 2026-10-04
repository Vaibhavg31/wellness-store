import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useDialog } from '@/hooks/useDialog';
import { cn } from '@/utils/formatPrice';

const sizes = {
    sm: 'max-w-md',
    md: 'max-w-2xl',
    lg: 'max-w-4xl',
};

export default function Modal({ isOpen, onClose, children, title, size = 'md' }) {
    const panelRef = useDialog(isOpen, onClose);
    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 animate-fade-in bg-ink/50" onClick={onClose} aria-hidden="true" />
            <div
                ref={panelRef}
                role="dialog"
                aria-modal="true"
                aria-label={title}
                tabIndex={-1}
                className={cn('relative flex max-h-[90dvh] w-full animate-fade-up flex-col rounded-xl bg-surface shadow-lg focus:outline-none', sizes[size])}
            >
                <div className="flex items-center justify-between gap-4 border-b border-line px-6 py-4">
                    {title && <h3 className="text-h4">{title}</h3>}
                    <button type="button" onClick={onClose} className="-mr-2 ml-auto grid size-9 place-items-center rounded-full text-ink hover:bg-canvas-alt" aria-label="Close dialog">
                        <X size={18} />
                    </button>
                </div>
                <div className="overflow-y-auto overscroll-contain p-6">{children}</div>
            </div>
        </div>,
        document.body,
    );
}
