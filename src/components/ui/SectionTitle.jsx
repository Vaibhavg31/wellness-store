import { cn } from '@/utils/formatPrice';
import LuxuryDivider from '@/components/ui/LuxuryDivider';
export default function SectionTitle({ subtitle, title, description, align = 'center', className, light = false, }) {
    return (<div className={cn('mb-12 md:mb-16', align === 'center' && 'text-center', className)}>
      {subtitle && (<span className={cn('inline-flex items-center gap-3 type-eyebrow mb-4 text-turmeric')}>
          {align === 'center' && (<span className="hidden sm:block w-8 h-px bg-gradient-to-r from-transparent to-turmeric/60"/>)}
          {subtitle}
          {align === 'center' && (<span className="hidden sm:block w-8 h-px bg-gradient-to-l from-transparent to-turmeric/60"/>)}
        </span>)}

      <h2 className={cn('font-display text-3xl md:text-[2.5rem] lg:text-5xl font-medium leading-[1.1]', light ? 'text-cream' : 'text-ink')}>
        {title}
      </h2>

      {description && (<p className={cn('mt-4 font-light text-base md:text-lg max-w-2xl leading-relaxed', align === 'center' ? 'mx-auto' : '', light ? 'text-cream/65' : 'text-slate')}>
          {description}
        </p>)}

      <LuxuryDivider className="mt-6" variant="turmeric"/>
    </div>);
}
