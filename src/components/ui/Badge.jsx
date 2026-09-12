import { cn } from '@/utils/formatPrice';
const variantStyles = {
    new: 'bg-emerald text-ivory',
    bestseller: 'bg-gold text-charcoal',
    sale: 'bg-emerald-dark text-ivory',
    stock: 'bg-warm-beige text-soft-brown border border-border',
    default: 'bg-warm-beige text-charcoal',
};
export default function Badge({ children, variant = 'default', className }) {
    return (<span className={cn('inline-block px-3 py-1 rounded-full text-[9px] tracking-[0.2em] uppercase font-medium', variantStyles[variant], className)}>
      {children}
    </span>);
}
