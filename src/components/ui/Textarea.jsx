import { forwardRef, useId } from 'react';
import { cn } from '@/utils/formatPrice';
import { Field, fieldClass } from './Input';

const Textarea = forwardRef(function Textarea({ className, label, error, hint, id, rows = 4, ...props }, ref) {
    const autoId = useId();
    const fieldId = id || autoId;
    return (
        <Field id={fieldId} label={label} error={error} hint={hint}>
            <textarea
                ref={ref}
                id={fieldId}
                rows={rows}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? `${fieldId}-error` : undefined}
                className={cn(fieldClass(error), 'py-3 resize-y', className)}
                {...props}
            />
        </Field>
    );
});

export default Textarea;
