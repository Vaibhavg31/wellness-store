import { cn } from '@/utils/formatPrice';
export default function LuxuryDivider({ className, variant = 'turmeric' }) {
    const colors = {
        turmeric: 'via-turmeric',
        emerald: 'via-emerald',
        subtle: 'via-border',
    };
    return (<div className={cn('flex items-center justify-center gap-4 py-2', className)} aria-hidden="true">
      <span className={cn('h-px flex-1 max-w-24 bg-gradient-to-r from-transparent', colors[variant], 'to-transparent')}/>
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-2 h-2 text-turmeric/70">
        <path d="M12 0L14.5 9.5L24 12L14.5 14.5L12 24L9.5 14.5L0 12L9.5 9.5Z"/>
      </svg>
      <span className={cn('h-px flex-1 max-w-24 bg-gradient-to-l from-transparent', colors[variant], 'to-transparent')}/>
    </div>);
}
