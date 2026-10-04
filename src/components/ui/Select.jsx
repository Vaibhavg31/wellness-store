import { forwardRef, useId } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/utils/formatPrice';
import { Field, fieldClass } from './Input';

const Select = forwardRef(function Select({ className, label, error, hint, id, children, ...props }, ref) {
    const autoId = useId();
    const fieldId = id || autoId;
    return (
        <Field id={fieldId} label={label} error={error} hint={hint}>
            <div className="relative">
                <select
                    ref={ref}
                    id={fieldId}
                    aria-invalid={error ? true : undefined}
                    className={cn(fieldClass(error), 'h-11 appearance-none pr-10', className)}
                    {...props}
                >
                    {children}
                </select>
                <ChevronDown size={18} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true" />
            </div>
        </Field>
    );
});

export default Select;
