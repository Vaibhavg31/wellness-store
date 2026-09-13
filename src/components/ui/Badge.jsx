import { cn } from '@/utils/formatPrice';
const variantStyles = {
    new: 'bg-emerald text-cream',
    bestseller: 'bg-turmeric text-ink',
    sale: 'bg-emerald-dark text-cream',
    stock: 'bg-sand text-slate border border-border',
    default: 'bg-sand text-ink',
};
export default function Badge({ children, variant = 'default', className }) {
    return (<span className={cn('inline-block px-3 py-1 rounded-full text-[9px] tracking-[0.2em] uppercase font-medium', variantStyles[variant], className)}>
      {children}
    </span>);
}
