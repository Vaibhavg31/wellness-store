import { forwardRef } from 'react';
import { cn } from '@/utils/formatPrice';
const variantStyles = {
    primary: 'bg-forest text-cream hover:bg-forest-light',
    secondary: 'bg-sand text-ink hover:bg-cream border border-border',
    outline: 'border border-forest/30 text-forest hover:bg-forest hover:text-cream bg-cream/60',
    ghost: 'text-ink hover:bg-sand/60',
    turmeric: 'bg-turmeric text-ink hover:bg-turmeric-light border border-turmeric/30 font-semibold',
};
const sizeStyles = {
    sm: 'px-5 py-2.5 text-xs tracking-[0.14em]',
    md: 'px-8 py-3.5 text-sm tracking-[0.12em]',
    lg: 'px-10 py-4 text-sm tracking-[0.14em]',
};
const Button = forwardRef(({ className, variant = 'primary', size = 'md', loading = false, children, disabled, type = 'button', ...props }, ref) => {
    return (<button ref={ref} type={type} className={cn('inline-flex items-center justify-center font-sans font-medium uppercase rounded-full', 'transition-colors duration-200', variantStyles[variant], sizeStyles[size], (disabled || loading) && 'opacity-50 cursor-not-allowed pointer-events-none', className)} disabled={disabled || loading} {...props}>
        {loading && (<span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2"/>)}
        {children}
      </button>);
});
Button.displayName = 'Button';
export default Button;
