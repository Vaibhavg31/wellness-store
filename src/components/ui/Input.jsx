import { forwardRef, useId, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '@/utils/formatPrice';

export const fieldClass = (error) =>
    cn(
        'w-full rounded-md border bg-surface px-4 text-body text-ink placeholder:text-subtle',
        'transition-[border-color,box-shadow] duration-200',
        'focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20',
        'disabled:bg-disabled disabled:text-subtle',
        error ? 'border-danger focus:border-danger focus:ring-danger/20' : 'border-line-strong',
    );

export function Field({ id, label, error, hint, children }) {
    return (
        <div className="w-full">
            {label && (
                <label htmlFor={id} className="mb-1.5 block text-small font-medium text-ink">
                    {label}
                </label>
            )}
            {children}
            {hint && !error && <p className="mt-1.5 text-caption text-muted">{hint}</p>}
            {error && (
                <p id={`${id}-error`} className="mt-1.5 text-caption text-danger" role="alert">
                    {error}
                </p>
            )}
        </div>
    );
}

const Input = forwardRef(function Input({ className, label, error, hint, id, type, ...props }, ref) {
    const autoId = useId();
    const inputId = id || autoId;
    const [show, setShow] = useState(false);
    const isPassword = type === 'password';

    return (
        <Field id={inputId} label={label} error={error} hint={hint}>
            <div className="relative">
                <input
                    ref={ref}
                    id={inputId}
                    type={isPassword && show ? 'text' : type}
                    aria-invalid={error ? true : undefined}
                    aria-describedby={error ? `${inputId}-error` : undefined}
                    className={cn(fieldClass(error), 'h-11', isPassword && 'pr-12', className)}
                    {...props}
                />
                {isPassword && (
                    <button
                        type="button"
                        onClick={() => setShow((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-muted hover:text-ink"
                        aria-label={show ? 'Hide password' : 'Show password'}
                    >
                        {show ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                )}
            </div>
        </Field>
    );
});

export default Input;
