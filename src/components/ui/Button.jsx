import { forwardRef } from 'react';
import { Link } from 'react-router-dom';
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
    sm: 'h-9 px-4 text-small max-sm:h-11',
    md: 'h-11 px-6 text-small',
    lg: 'h-12 px-8 text-body',
};

/** The classes of a button, for the rare element that must look like one without being a Button. */
export function buttonClass({ variant = 'primary', size = 'md', className } = {}) {
    return cn(
        'inline-flex items-center justify-center gap-2 rounded-full font-medium whitespace-nowrap select-none',
        'transition-[background-color,color,transform,box-shadow] duration-200 active:scale-[0.98]',
        'disabled:bg-disabled disabled:text-subtle disabled:border-transparent disabled:active:scale-100',
        variants[variant],
        sizes[size],
        className,
    );
}

/**
 * The one button. With `to` it is a page link and with `href` an outside link, styled the same: a link that looks like a
 * button must be a link, never a <button> inside an <a> (that is two tab stops and invalid HTML).
 */
const Button = forwardRef(function Button(
    { className, variant = 'primary', size = 'md', loading = false, children, disabled, type = 'button', to, href, ...props },
    ref,
) {
    const classes = buttonClass({ variant, size, className });
    if (to !== undefined || href !== undefined) {
        const inner = children;
        return to !== undefined
            ? <Link ref={ref} to={to} className={classes} {...props}>{inner}</Link>
            : <a ref={ref} href={href} className={classes} {...props}>{inner}</a>;
    }
    return (
        <button
            ref={ref}
            type={type}
            disabled={disabled || loading}
            aria-busy={loading || undefined}
            className={classes}
            {...props}
        >
            {loading && <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" />}
            {children}
        </button>
    );
});

export default Button;
