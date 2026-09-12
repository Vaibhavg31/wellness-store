import { useState } from 'react';
import { AnimatePresence, motion, Reorder, useDragControls } from 'framer-motion';
import { Plus, Trash2, Upload, GripVertical, ChevronDown } from 'lucide-react';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { api, imageUrl } from '@/services/api';

export function AdminSection({ title, description, children }) {
    return (
        <div className="bg-ivory rounded-2xl luxury-shadow p-6 mb-6">
            <h3 className="font-serif text-xl text-charcoal mb-1">{title}</h3>
            {description && <p className="text-sm text-admin-muted mb-5">{description}</p>}
            {children}
        </div>
    );
}

export function AdminField({ label, hint, children }) {
    return (
        <div className="mb-4">
            <label className="block text-xs tracking-[0.12em] uppercase text-admin-muted mb-2 font-medium">
                {label}
            </label>
            {children}
            {hint && <p className="text-[11px] text-admin-muted/70 mt-1">{hint}</p>}
        </div>
    );
}

export function AdminTextarea({ value, onChange, rows = 3, placeholder }) {
    return (
        <textarea
            value={value}
            onChange={onChange}
            rows={rows}
            placeholder={placeholder}
            className="w-full px-4 py-3 bg-admin-surface-alt border border-warm-beige/60 text-charcoal placeholder:text-admin-muted/50 focus:outline-none focus:border-muted-gold focus:ring-1 focus:ring-muted-gold/30 transition-all font-light resize-none rounded-lg text-sm"
        />
    );
}

export function ImageUploadField({ value, onChange, adminToken, label = 'Image', hint }) {
    const [uploading, setUploading] = useState(false);

    const handleUpload = async (e) => {
        if (!adminToken || !e.target.files?.length) return;
        setUploading(true);
        try {
            const urls = await api.upload(Array.from(e.target.files), adminToken);
            if (urls[0]) onChange(urls[0]);
        } finally {
            setUploading(false);
        }
    };

    return (
        <AdminField label={label} hint={hint}>
            <div className="flex gap-4 items-start">
                {value && (
                    <img
                        src={imageUrl(value)}
                        alt=""
                        className="w-24 h-24 object-cover rounded-xl border border-admin-border"
                    />
                )}
                <div className="flex-1 space-y-2">
                    <Input value={value || ''} onChange={(e) => onChange(e.target.value)} placeholder="Image URL or upload" />
                    <label className="inline-flex items-center gap-2 text-xs text-wine cursor-pointer hover:text-wine-light">
                        <Upload size={14} />
                        {uploading ? 'Uploading...' : 'Upload image'}
                        <input type="file" accept="image/*" className="hidden" onChange={handleUpload} disabled={uploading} />
                    </label>
                </div>
            </div>
        </AdminField>
    );
}

export function ColorField({ label, hint, value, onChange }) {
    return (
        <AdminField label={label} hint={hint}>
            <div className="flex items-center gap-3">
                <input
                    type="color"
                    value={value || '#000000'}
                    onChange={(e) => onChange(e.target.value)}
                    className="w-11 h-11 rounded-lg border border-admin-border cursor-pointer bg-transparent p-0.5 flex-shrink-0"
                    aria-label={label}
                />
                <Input value={value || ''} onChange={(e) => onChange(e.target.value)} placeholder="#5A0009" className="flex-1" />
            </div>
        </AdminField>
    );
}

export function FontField({ label, hint, value, onChange, options }) {
    return (
        <AdminField label={label} hint={hint}>
            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="w-full px-4 py-3 bg-admin-surface-alt border border-warm-beige/60 text-charcoal focus:outline-none focus:border-muted-gold focus:ring-1 focus:ring-muted-gold/30 transition-all rounded-lg text-sm"
                style={{ fontFamily: value }}
            >
                {options.map((opt) => (
                    <option key={opt.value} value={opt.value} style={{ fontFamily: opt.value }}>
                        {opt.label}
                    </option>
                ))}
            </select>
        </AdminField>
    );
}

export function StringListEditor({ items = [], onChange, placeholder = 'New item' }) {
    const update = (index, value) => {
        const next = [...items];
        next[index] = value;
        onChange(next);
    };

    const add = () => onChange([...items, '']);
    const remove = (index) => onChange(items.filter((_, i) => i !== index));

    const handleBlur = (index) => {
        if (items[index]?.trim() === '') remove(index);
    };

    return (
        <div className="space-y-2">
            {items.map((item, i) => (
                <div key={`${i}-${item.slice(0, 24)}`} className="flex gap-2 items-center">
                    <GripVertical size={14} className="text-admin-muted/40 flex-shrink-0" />
                    <Input
                        value={item}
                        onChange={(e) => update(i, e.target.value)}
                        onBlur={() => handleBlur(i)}
                        placeholder={placeholder}
                        className="flex-1"
                    />
                    <button
                        type="button"
                        onClick={() => remove(i)}
                        className="p-2 text-admin-muted hover:text-red-500 transition-colors"
                        aria-label="Remove item"
                    >
                        <Trash2 size={14} />
                    </button>
                </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={add} className="gap-1">
                <Plus size={14} /> Add item
            </Button>
        </div>
    );
}

export function BenefitEditor({ benefits = [], onChange }) {
    const update = (index, field, value) => {
        const next = benefits.map((b, i) => (i === index ? { ...b, [field]: value } : b));
        onChange(next);
    };

    const add = () => onChange([...benefits, { icon: 'sparkles', title: '', description: '' }]);
    const remove = (index) => onChange(benefits.filter((_, i) => i !== index));

    const icons = ['shield', 'droplets', 'heart', 'gem', 'sparkles', 'sun'];

    return (
        <div className="space-y-4">
            {benefits.map((b, i) => (
                <div key={i} className="p-4 rounded-xl border border-admin-border bg-admin-surface-alt space-y-3">
                    <div className="flex justify-between items-center">
                        <span className="text-xs text-admin-muted uppercase tracking-wider">Benefit {i + 1}</span>
                        <button type="button" onClick={() => remove(i)} className="text-admin-muted hover:text-red-500">
                            <Trash2 size={14} />
                        </button>
                    </div>
                    <div className="grid sm:grid-cols-3 gap-3">
                        <select
                            value={b.icon}
                            onChange={(e) => update(i, 'icon', e.target.value)}
                            className="px-3 py-2 bg-ivory border border-warm-beige/60 rounded-lg text-sm"
                        >
                            {icons.map((ic) => (
                                <option key={ic} value={ic}>{ic}</option>
                            ))}
                        </select>
                        <Input value={b.title} onChange={(e) => update(i, 'title', e.target.value)} placeholder="Title" />
                    </div>
                    <AdminTextarea
                        value={b.description}
                        onChange={(e) => update(i, 'description', e.target.value)}
                        placeholder="Description"
                        rows={2}
                    />
                </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={add} className="gap-1">
                <Plus size={14} /> Add benefit
            </Button>
        </div>
    );
}

export function FaqEditor({ faqs = [], onChange }) {
    const update = (index, field, value) => {
        const next = faqs.map((f, i) => (i === index ? { ...f, [field]: value } : f));
        onChange(next);
    };

    const add = () => onChange([...faqs, { question: '', answer: '' }]);
    const remove = (index) => onChange(faqs.filter((_, i) => i !== index));

    return (
        <div className="space-y-4">
            {faqs.map((faq, i) => (
                <div key={i} className="p-4 rounded-xl border border-admin-border bg-admin-surface-alt space-y-3">
                    <div className="flex justify-between items-center">
                        <span className="text-xs text-admin-muted uppercase tracking-wider">FAQ {i + 1}</span>
                        <button type="button" onClick={() => remove(i)} className="text-admin-muted hover:text-red-500">
                            <Trash2 size={14} />
                        </button>
                    </div>
                    <Input value={faq.question} onChange={(e) => update(i, 'question', e.target.value)} placeholder="Question" />
                    <AdminTextarea value={faq.answer} onChange={(e) => update(i, 'answer', e.target.value)} placeholder="Answer" rows={3} />
                </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={add} className="gap-1">
                <Plus size={14} /> Add FAQ
            </Button>
        </div>
    );
}

/**
 * Object key order in `sections` IS the homepage render order (see
 * SettingsRepository::fetchSections / HomePage.jsx) — dragging a row
 * rebuilds the object with keys re-inserted in the new order so it
 * round-trips correctly through JSON on save.
 *
 * Uses framer-motion's Reorder primitive (already a project dependency) for
 * real press-and-drag reordering with a dedicated grip handle, rather than
 * up/down step buttons.
 */
/**
 * One unified list for the whole homepage: drag to reorder, switch to
 * show/hide, and click a row to expand/collapse THAT section's own content
 * editor right there — no separate "which tab has this section's fields"
 * hunting. `renderContent(key)` supplies what's inside each row when
 * expanded; return null/undefined for a section with nothing to configure
 * (e.g. it just pulls from Products or another admin page).
 */
export function SectionToggles({ sections, onChange, labels, renderContent }) {
    const keys = Object.keys(sections).length ? Object.keys(sections) : Object.keys(labels);
    const [expandedKeys, setExpandedKeys] = useState(() => new Set());

    const handleReorder = (nextKeys) => {
        const next = {};
        nextKeys.forEach((k) => { next[k] = sections[k]; });
        onChange(next);
    };

    const toggleExpand = (key) => {
        setExpandedKeys((prev) => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key); else next.add(key);
            return next;
        });
    };

    return (
        <Reorder.Group
            as="div"
            axis="y"
            values={keys}
            onReorder={handleReorder}
            className="divide-y divide-border/30 rounded-xl border border-admin-border overflow-hidden"
        >
            {keys.map((key) => (
                <SectionAccordionRow
                    key={key}
                    itemKey={key}
                    label={labels[key] ?? key}
                    enabled={sections[key]}
                    onToggle={() => onChange({ ...sections, [key]: !sections[key] })}
                    expanded={expandedKeys.has(key)}
                    onToggleExpand={() => toggleExpand(key)}
                >
                    {renderContent?.(key)}
                </SectionAccordionRow>
            ))}
        </Reorder.Group>
    );
}

function SectionAccordionRow({ itemKey, label, enabled, onToggle, expanded, onToggleExpand, children }) {
    const dragControls = useDragControls();
    const hasContent = children != null;

    return (
        <Reorder.Item
            as="div"
            value={itemKey}
            dragListener={false}
            dragControls={dragControls}
            whileDrag={{ scale: 1.015, boxShadow: '0 10px 28px rgba(35,20,20,0.14)', cursor: 'grabbing' }}
            className="relative bg-ivory"
            style={{ touchAction: 'none' }}
        >
            <div className="flex items-center justify-between gap-3 p-4 hover:bg-admin-surface-alt">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                    <span
                        onPointerDown={(e) => dragControls.start(e)}
                        className="text-admin-muted/60 hover:text-wine cursor-grab active:cursor-grabbing p-1 -m-1 touch-none flex-shrink-0"
                        aria-label={`Drag to reorder ${label}`}
                        role="button"
                        tabIndex={-1}
                    >
                        <GripVertical size={16} />
                    </span>
                    <button
                        type="button"
                        onClick={() => hasContent && onToggleExpand()}
                        className={`flex items-center gap-1.5 min-w-0 text-left ${hasContent ? 'cursor-pointer' : 'cursor-default'}`}
                        disabled={!hasContent}
                        aria-expanded={hasContent ? expanded : undefined}
                    >
                        <span className="text-sm text-charcoal truncate font-medium">{label}</span>
                        {hasContent && (
                            <ChevronDown
                                size={15}
                                className={`text-admin-muted flex-shrink-0 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
                            />
                        )}
                    </button>
                </div>
                <button
                    type="button"
                    onClick={onToggle}
                    className={`relative w-12 h-6 rounded-full transition-colors flex-shrink-0 ${enabled ? 'bg-emerald' : 'bg-soft-brown/30'}`}
                    aria-label={enabled ? 'Disable section' : 'Enable section'}
                >
                    <span className={`absolute top-0.5 w-5 h-5 bg-ivory rounded-full shadow transition-transform ${enabled ? 'left-6' : 'left-0.5'}`} />
                </button>
            </div>

            <AnimatePresence initial={false}>
                {hasContent && expanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                        style={{ overflow: 'hidden' }}
                    >
                        <div className="px-4 sm:px-5 pb-5 pt-1 bg-admin-surface-alt/50 border-t border-admin-border-light">
                            {children}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </Reorder.Item>
    );
}
