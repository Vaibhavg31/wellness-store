export const fieldClass =
    'admin-control w-full text-sm text-ink px-3 py-2.5';

export function FormLabel({ children, required }) {
    return (
        <label className="text-xs font-semibold text-ink block mb-1.5">
            {children}
            {required && <span className="text-forest ml-0.5">*</span>}
        </label>
    );
}

export function ToggleSwitch({ enabled, onChange, ariaLabel }) {
    return (
        <button
            type="button"
            role="switch"
            onClick={() => onChange(!enabled)}
            aria-checked={enabled}
            aria-label={ariaLabel}
            className={`
                group relative inline-flex shrink-0 items-center
                w-[3.25rem] h-7 rounded-full p-0.5
                border transition-all duration-200 ease-out
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest/25 focus-visible:ring-offset-2
                ${enabled
                    ? 'bg-forest border-forest/80 shadow-inner'
                    : 'bg-admin-surface border-admin-border shadow-sm'}
            `}
        >
            <span
                className={`
                    pointer-events-none block h-6 w-6 rounded-full bg-white
                    shadow-[0_1px_3px_rgba(0,0,0,0.18)]
                    ring-1 ring-black/5
                    transition-transform duration-200 ease-out
                    ${enabled ? 'translate-x-[1.25rem]' : 'translate-x-0'}
                `}
            />
        </button>
    );
}

export function OptionalSection({ icon: Icon, title, description, enabled, onToggle, children }) {
    return (
        <div
            className={`rounded-xl border overflow-hidden transition-colors duration-200 ${
                enabled
                    ? 'border-forest/25 bg-white shadow-sm'
                    : 'border-admin-border bg-admin-surface-alt'
            }`}
        >
            <div className="flex items-center gap-3 p-4 sm:px-5 sm:py-4">
                {Icon && (
                    <div
                        className={`flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${
                            enabled ? 'bg-forest/12' : 'bg-ink/5'
                        }`}
                    >
                        <Icon size={18} className={enabled ? 'text-forest' : 'text-admin-muted'} />
                    </div>
                )}
                <button
                    type="button"
                    onClick={() => onToggle(!enabled)}
                    className="flex-1 min-w-0 text-left rounded-lg -my-1 py-1 hover:opacity-90 transition-opacity"
                >
                    <p className="text-sm font-semibold text-ink">{title}</p>
                    <p className="text-xs text-admin-muted mt-0.5 leading-relaxed">{description}</p>
                </button>
                <div className="flex items-center gap-2.5 shrink-0 pl-1">
                    <span
                        className={`text-[11px] font-semibold uppercase tracking-wider transition-colors ${
                            enabled ? 'text-forest' : 'text-admin-muted/70'
                        }`}
                    >
                        {enabled ? 'On' : 'Off'}
                    </span>
                    <ToggleSwitch
                        enabled={enabled}
                        onChange={onToggle}
                        ariaLabel={`${enabled ? 'Disable' : 'Enable'} ${title}`}
                    />
                </div>
            </div>
            {enabled && (
                <div className="px-4 sm:px-5 pb-5 pt-2 border-t border-admin-border-light bg-white/80 space-y-3">
                    {children}
                </div>
            )}
        </div>
    );
}

export function SectionHeader({ icon: Icon, title, description, action }) {
    return (
        <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-forest/10 flex items-center justify-center shrink-0">
                    <Icon size={20} className="text-forest" />
                </div>
                <div>
                    <h2 className="font-display text-xl text-ink">{title}</h2>
                    {description && <p className="text-xs text-admin-muted">{description}</p>}
                </div>
            </div>
            {action}
        </div>
    );
}

export function FormSection({ children, className = '' }) {
    return (
        <section className={`rounded-2xl border border-admin-border bg-white shadow-sm p-5 sm:p-6 space-y-4 ${className}`}>
            {children}
        </section>
    );
}
