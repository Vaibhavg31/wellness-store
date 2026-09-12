import { forwardRef, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '@/utils/formatPrice';

const Input = forwardRef(({ className, label, error, id, type, ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);
    const isPassword = type === 'password';
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

    return (
        <div className="w-full">
            {label && (
                <label htmlFor={inputId} className="block text-xs tracking-[0.15em] uppercase text-soft-brown mb-2 font-medium">
                    {label}
                </label>
            )}
            <div className="relative">
                <input
                    ref={ref}
                    id={inputId}
                    type={isPassword && showPassword ? 'text' : type}
                    className={cn(
                        'w-full px-5 py-3.5 bg-ivory/60 border border-border rounded-full',
                        'text-dark-chocolate placeholder:text-soft-brown/45',
                        'focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold/20',
                        'transition-all duration-500 font-light',
                        isPassword && 'pr-12',
                        error && 'border-red-400 focus:border-red-400',
                        className,
                    )}
                    {...props}
                />
                {isPassword && (
                    <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-soft-brown hover:text-charcoal transition-colors"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                )}
            </div>
            {error && (
                <p className="mt-1.5 text-xs text-red-500" role="alert">
                    {error}
                </p>
            )}
        </div>
    );
});
Input.displayName = 'Input';
export default Input;
