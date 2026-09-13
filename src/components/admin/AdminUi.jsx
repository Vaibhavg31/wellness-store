import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Calendar, Check, Save, Search, X } from 'lucide-react';
import Button from '@/components/ui/Button';
import { cn } from '@/utils/formatPrice';

const STAT_TONES = {
    turmeric: { value: 'text-turmeric-ink', accent: 'border-l-turmeric' },
    blue: { value: 'text-blue-600', accent: 'border-l-blue-500' },
    amber: { value: 'text-amber-700', accent: 'border-l-amber-500' },
    emerald: { value: 'text-emerald', accent: 'border-l-emerald' },
    red: { value: 'text-red-600', accent: 'border-l-red-500' },
    forest: { value: 'text-forest', accent: 'border-l-forest' },
    default: { value: 'text-ink', accent: 'border-l-admin-border' },
};

const SUMMARY_COLS = {
    2: 'sm:grid-cols-2',
    3: 'sm:grid-cols-3',
    4: 'sm:grid-cols-2 lg:grid-cols-4',
    5: 'sm:grid-cols-3 lg:grid-cols-5',
    6: 'sm:grid-cols-3 lg:grid-cols-6',
};

export const adminControlClass =
    'admin-control text-sm text-ink placeholder:text-admin-muted/70';

export function AdminPageHeader({ title, subtitle, actions }) {
    return (
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
            <div>
                <h1 className="text-xl sm:text-2xl font-semibold text-ink tracking-tight max-lg:hidden">{title}</h1>
                {subtitle && <p className="text-admin-muted text-sm mt-1 max-lg:mt-0">{subtitle}</p>}
            </div>
            {actions && <div className="flex flex-wrap gap-2 shrink-0">{actions}</div>}
        </div>
    );
}

export function AdminSummaryGrid({ stats, columns = 4, className }) {
    return (
        <div className={cn('grid grid-cols-2 gap-3 mb-6', SUMMARY_COLS[columns] || SUMMARY_COLS[4], className)}>
            {stats.map((stat) => {
                const tone = STAT_TONES[stat.tone] || STAT_TONES.default;
                return (
                    <div
                        key={stat.label}
                        className={cn('admin-stat-card border-l-[3px]', tone.accent)}
                    >
                        <p className="admin-stat-card-label">{stat.label}</p>
                        <p className={cn('admin-stat-card-value', stat.color || tone.value)}>
                            {stat.value}
                        </p>
                        {stat.sub && (
                            <p className="text-[11px] text-admin-muted mt-1 font-medium">{stat.sub}</p>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

export function AdminStatStrip(props) {
    return <AdminSummaryGrid {...props} />;
}

export function AdminFilterBar({ children, footer, className }) {
    return (
        <div className={cn('admin-filter-bar', className)}>
            <div className="admin-filter-bar-row">{children}</div>
            {footer && <div className="admin-filter-bar-footer">{footer}</div>}
        </div>
    );
}

export function AdminToolbar(props) {
    return <AdminFilterBar {...props} />;
}

export function AdminSearchInput({ value, onChange, placeholder, className }) {
    return (
        <div className={cn('relative flex-1 min-w-[12rem]', className)}>
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-admin-muted pointer-events-none" />
            <input
                type="search"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className={cn(adminControlClass, 'w-full pl-9 pr-9 py-2')}
                aria-label={placeholder}
            />
            {value && (
                <button
                    type="button"
                    onClick={() => onChange('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md text-admin-muted hover:text-ink hover:bg-admin-surface-alt"
                    aria-label="Clear search"
                >
                    <X size={14} />
                </button>
            )}
        </div>
    );
}

export function AdminSelect({ value, onChange, options, className, 'aria-label': ariaLabel }) {
    return (
        <select
            value={value}
            onChange={onChange}
            aria-label={ariaLabel}
            className={cn(adminControlClass, 'min-w-[9rem] py-2 px-3 cursor-pointer', className)}
        >
            {options.map((o) => (
                <option key={o.value ?? o.label} value={o.value}>{o.label}</option>
            ))}
        </select>
    );
}

export function AdminDateInput({ value, onChange, label, title, className, min, max }) {
    return (
        <div className={cn('admin-date-field', className)}>
            {label && <span className="admin-date-label">{label}</span>}
            <div className="admin-date-input-wrap">
                <Calendar size={14} className="admin-date-icon" aria-hidden />
                <input
                    type="date"
                    value={value}
                    onChange={onChange}
                    title={title || label}
                    min={min}
                    max={max}
                    className={cn(adminControlClass, 'admin-date-input py-2 pl-8 pr-2')}
                />
            </div>
        </div>
    );
}

export function AdminDateRange({ from, to, onFromChange, onToChange, className }) {
    return (
        <div className={cn('admin-date-range', className)}>
            <AdminDateInput label="From" value={from} onChange={onFromChange} />
            <span className="admin-date-sep" aria-hidden>–</span>
            <AdminDateInput label="To" value={to} onChange={onToChange} min={from || undefined} />
        </div>
    );
}

export function AdminClearButton({ onClick, label = 'Clear', className }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                'inline-flex items-center gap-1 text-sm text-admin-muted hover:text-ink px-2 py-2 shrink-0 font-medium transition-colors rounded-lg hover:bg-admin-surface-alt',
                className,
            )}
        >
            <X size={14} /> {label}
        </button>
    );
}

export function AdminTableShell({ children, className }) {
    return <div className={cn('admin-table-shell', className)}>{children}</div>;
}

export function AdminLoadingState() {
    return (
        <div className="flex items-center justify-center py-20">
            <div className="w-7 h-7 border-2 border-forest/15 border-t-forest rounded-full animate-spin" />
        </div>
    );
}

export function AdminEmptyState({ icon: Icon, title, description }) {
    return (
        <div className="text-center py-16 px-6">
            {Icon && <Icon size={32} className="text-admin-muted/35 mx-auto mb-3" strokeWidth={1.25} />}
            <p className="text-ink font-medium text-sm">{title}</p>
            {description && <p className="text-sm text-admin-muted mt-1 max-w-sm mx-auto">{description}</p>}
        </div>
    );
}

export function AdminErrorBanner({ message, onDismiss }) {
    if (!message) return null;
    return (
        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200/80 flex items-start gap-3 text-red-700 text-sm" role="alert">
            <div className="flex-1">
                <p className="font-medium">Something went wrong</p>
                <p className="mt-0.5 opacity-90">{message}</p>
            </div>
            {onDismiss && (
                <button type="button" onClick={onDismiss} className="p-1 hover:bg-red-100 rounded-md shrink-0">
                    <X size={16} />
                </button>
            )}
        </div>
    );
}

export function AdminQuickLink({ to, icon: Icon, label, value, sub, highlight }) {
    return (
        <Link
            to={to}
            className={cn(
                'admin-quick-link block rounded-xl p-4 transition-all duration-150',
                highlight && 'admin-quick-link-highlight',
            )}
        >
            {Icon && <Icon size={18} className={highlight ? 'text-turmeric-ink mb-2.5' : 'text-forest mb-2.5'} strokeWidth={1.5} />}
            <p className="text-xl font-semibold text-ink tabular-nums">{value}</p>
            <p className="text-sm text-admin-muted font-medium mt-0.5">{label}</p>
            {sub && <p className="text-xs text-turmeric-ink mt-1 font-semibold">{sub}</p>}
        </Link>
    );
}

const ICON_BTN_VARIANTS = {
    default: 'text-ink hover:bg-admin-surface-alt',
    success: 'text-emerald hover:bg-emerald/10',
    warning: 'text-turmeric-ink hover:bg-turmeric/10',
    danger: 'text-red-600 hover:bg-red-50',
};

export function AdminIconButton({ onClick, icon: Icon, variant = 'default', title, size = 16, className }) {
    return (
        <button
            type="button"
            onClick={onClick}
            title={title}
            className={cn('p-2 rounded-lg transition-colors', ICON_BTN_VARIANTS[variant], className)}
        >
            <Icon size={size} />
        </button>
    );
}

export function AdminStatusPill({ children, tone = 'default' }) {
    const tones = {
        success: 'bg-emerald/10 text-emerald',
        warning: 'bg-amber-50 text-amber-800',
        muted: 'bg-admin-surface-alt text-admin-muted',
        forest: 'bg-forest/8 text-forest',
        danger: 'bg-red-50 text-red-700',
        default: 'bg-admin-surface-alt text-ink',
    };
    return (
        <span className={cn('inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium', tones[tone])}>
            {children}
        </span>
    );
}

export function AdminPromoCard({ to, icon: Icon, title, description }) {
    return (
        <Link to={to} className="admin-promo-card block mb-6 group">
            <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-forest/10 flex items-center justify-center shrink-0 group-hover:bg-forest/15 transition-colors">
                    <Icon size={18} className="text-forest" />
                </div>
                <div>
                    <p className="font-semibold text-ink group-hover:text-forest transition-colors">{title}</p>
                    <p className="text-sm text-admin-muted mt-0.5">{description}</p>
                </div>
            </div>
        </Link>
    );
}

export function AdminSaveBar({
    hasChanges,
    saving,
    saved,
    onSave,
    saveLabel = 'Save changes',
    className,
    sticky = false,
}) {
    const bar = (
        <motion.div
            layout
            className={cn(
                'flex items-center gap-3 flex-wrap',
                sticky && 'justify-between sm:justify-end',
                className,
            )}
        >
            <AnimatePresence mode="wait">
                {hasChanges && !saved && !saving && (
                    <motion.span
                        key="unsaved"
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -8 }}
                        transition={{ duration: 0.2 }}
                        className="inline-flex items-center gap-1.5 text-sm font-medium text-amber-700"
                    >
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 animate-pulse" aria-hidden />
                        Unsaved changes
                    </motion.span>
                )}
                {saved && !hasChanges && !saving && (
                    <motion.span
                        key="saved"
                        initial={{ opacity: 0, scale: 0.92 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.92 }}
                        transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
                        className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald"
                    >
                        <Check size={14} strokeWidth={2.5} aria-hidden />
                        Saved successfully
                    </motion.span>
                )}
                {saving && (
                    <motion.span
                        key="saving"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="inline-flex items-center gap-1.5 text-sm font-medium text-admin-muted"
                    >
                        <span className="w-3.5 h-3.5 border-2 border-forest/20 border-t-forest rounded-full animate-spin shrink-0" aria-hidden />
                        Saving…
                    </motion.span>
                )}
            </AnimatePresence>
            <Button
                variant="turmeric"
                onClick={onSave}
                disabled={saving || (!hasChanges && !saved)}
                loading={saving}
                className="gap-2 min-w-[9rem] transition-all duration-300"
            >
                {!saving && (saved ? <Check size={16} /> : <Save size={16} />)}
                {saving ? 'Saving…' : saved ? 'Saved!' : saveLabel}
            </Button>
        </motion.div>
    );

    // The Save button itself is always rendered (disabled until there's
    // something to save) so it's a reliable, findable, permanent fixture —
    // it used to disappear entirely with nothing on screen when there were
    // no changes yet, which read as "there is no Save button".
    if (!sticky) {
        return bar;
    }

    // Portaled straight to <body>: every admin page is wrapped in a
    // framer-motion page-transition div (PageTransition.jsx) that animates
    // via `transform`, and CSS makes any transformed ancestor the containing
    // block for `position: fixed` descendants — so without the portal this
    // bar would be "fixed" to the bottom of that (possibly very tall,
    // scrollable) page wrapper instead of the actual browser viewport,
    // requiring a scroll to ever see it. Portaling escapes that entirely.
    return createPortal(
        <div className="fixed bottom-0 left-0 right-0 z-40 lg:left-[15.5rem] border-t border-admin-border bg-cream/95 backdrop-blur-md shadow-[0_-8px_32px_rgba(0,0,0,0.08)] px-4 sm:px-6 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            {bar}
        </div>,
        document.body,
    );
}
