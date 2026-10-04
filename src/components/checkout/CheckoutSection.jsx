import { forwardRef } from 'react';
import { cn } from '@/utils/formatPrice';

/** Titled card used for each checkout step (contact, address, payment). */
const CheckoutSection = forwardRef(function CheckoutSection({ icon: Icon, title, className, children }, ref) {
    return (
        <section ref={ref} className={cn('rounded-lg border border-line bg-surface p-5 sm:p-6 lg:p-8', className)}>
            <h2 className="mb-5 flex items-center gap-3 font-sans text-h4 sm:mb-6">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary-tint text-primary"><Icon size={18} strokeWidth={1.75} aria-hidden="true" /></span>
                {title}
            </h2>
            {children}
        </section>
    );
});

export default CheckoutSection;
