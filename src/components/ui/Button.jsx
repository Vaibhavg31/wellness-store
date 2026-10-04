import { forwardRef } from 'react';
import { cn } from '@/utils/formatPrice';

const variants = {
    primary: 'bg-primary text-white hover:bg-primary-hover active:bg-primary-deep',
    secondary: 'bg-primary-tint text-primary-deep hover:bg-primary-tint/70 active:bg-primary-tint',
    outline: 'border border-primary text-primary hover:bg-primary-soft active:bg-primary-tint',
    ghost: 'text-ink hover:bg-canvas-alt active:bg-primary-tint',
    accent: 'bg-accent text-ink hover:bg-accent-hover active:bg-accent',
    danger: 'bg-danger text-white hover:bg-danger/90 active:bg-danger',
};
// Legacy alias still referenced by admin screens.
variants.turmeric = variants.accent;

const sizes = {
    sm: 'h-9 px-4 text-small',
    md: 'h-11 px-6 text-small',
    lg: 'h-12 px-8 text-body',
};

const Button = forwardRef(function Button(
    { className, variant = 'primary', size = 'md', loading = false, children, disabled, type = 'button', ...props },
    ref,
) {
    return (
        <button
            ref={ref}
            type={type}
            disabled={disabled || loading}
            aria-busy={loading || undefined}
            className={cn(
                'inline-flex items-center justify-center gap-2 rounded-full font-medium whitespace-nowrap select-none',
                'transition-[background-color,color,transform,box-shadow] duration-200 active:scale-[0.98]',
                'disabled:bg-disabled disabled:text-subtle disabled:border-transparent disabled:active:scale-100',
                variants[variant],
                sizes[size],
                className,
            )}
            {...props}
        >
            {loading && <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" />}
            {children}
        </button>
    );
});

export default Button;
