import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, Reorder, useDragControls } from 'framer-motion';
import { Plus, Trash2, Upload, GripVertical, ChevronDown, AlertTriangle, CheckCircle2, Film, X } from 'lucide-react';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { api, imageUrl } from '@/services/api';

export function AdminSection({ title, description, children }) {
    return (
        <div className="bg-canvas rounded-2xl shadow-sm p-6 mb-6">
            <h3 className="font-display text-xl text-ink mb-1">{title}</h3>
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
            className="w-full px-4 py-3 bg-admin-surface-alt border border-sand/60 text-ink placeholder:text-admin-muted/50 focus:outline-none focus:border-accent-ink focus:ring-1 focus:ring-accent-ink/30 transition-all font-light resize-none rounded-lg text-sm"
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
                    <label className="inline-flex items-center gap-2 text-xs text-primary cursor-pointer hover:text-primary-hover">
                        <Upload size={14} />
                        {uploading ? 'Uploading...' : 'Upload image'}
                        <input type="file" accept="image/*" className="hidden" onChange={handleUpload} disabled={uploading} />
                    </label>
                </div>
            </div>
        </AdminField>
    );
}

const MAX_VIDEO_MB = 20;

/** Classifies a video's pixel aspect ratio against a full-width banner's
 *  needs, so the admin gets an informed heads-up before uploading instead
 *  of only discovering a badly-cropped video after it's live. */
function classifyVideoAspect(w, h) {
    if (!w || !h) return null;
    const ratio = w / h;
    if (ratio >= 1.65) {
        return { tone: 'good', message: `${w}×${h} — landscape, close to 16:9. A great fit for a full-width banner.` };
    }
    if (ratio >= 1.2) {
        return { tone: 'warn', message: `${w}×${h} is landscape but narrower than 16:9 — it'll be cropped a little top/bottom to fill the banner. For a perfect fit, use a 16:9 video.` };
    }
    if (ratio >= 0.85) {
        return { tone: 'warn', message: `${w}×${h} is close to square — a large part of it will be cropped to fill a wide banner. A landscape (16:9) video is strongly recommended.` };
    }
    return { tone: 'bad', message: `${w}×${h} is portrait — most of the frame will be cropped out in a wide banner. Use a landscape video, or switch "Fit" to Contain below to show the whole video letterboxed instead.` };
}

/**
 * Video banner upload — reads the file's own resolution client-side (via a
 * hidden <video>'s loadedmetadata) before it ever uploads, and asks the
 * admin to confirm once they've seen how well it'll fit a wide banner,
 * rather than silently accepting a video that'll display badly cropped.
 */
export function VideoUploadField({ value, width, height, onChange, adminToken, label = 'Video', hint }) {
    const [pending, setPending] = useState(null); // { file, previewUrl, width, height }
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');
    const probeRef = useRef(null);
    const fileInputRef = useRef(null);

    useEffect(() => () => {
        if (pending?.previewUrl) URL.revokeObjectURL(pending.previewUrl);
    }, [pending]);

    const handleSelect = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setError('');

        if (file.size > MAX_VIDEO_MB * 1024 * 1024) {
            setError(`That file is ${(file.size / (1024 * 1024)).toFixed(1)}MB — max is ${MAX_VIDEO_MB}MB. Trim or compress it and try again.`);
            e.target.value = '';
            return;
        }

        const previewUrl = URL.createObjectURL(file);
        const probe = probeRef.current;
        if (probe) {
            probe.src = previewUrl;
            probe.onloadedmetadata = () => {
                setPending({ file, previewUrl, width: probe.videoWidth, height: probe.videoHeight });
            };
            probe.onerror = () => {
                setError('Could not read that video file — it may be corrupted or an unsupported codec.');
                URL.revokeObjectURL(previewUrl);
            };
        }
        e.target.value = '';
    };

    const cancelPending = () => {
        if (pending?.previewUrl) URL.revokeObjectURL(pending.previewUrl);
        setPending(null);
    };

    const confirmUpload = async () => {
        if (!pending || !adminToken) return;
        setUploading(true);
        setError('');
        try {
            const url = await api.uploadVideo(pending.file, adminToken);
            onChange({ url, width: pending.width, height: pending.height });
            cancelPending();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Upload failed');
        } finally {
            setUploading(false);
        }
    };

    const clearVideo = () => onChange({ url: '', width: null, height: null });

    const pendingAspect = pending ? classifyVideoAspect(pending.width, pending.height) : null;
    const currentAspect = !pending && value ? classifyVideoAspect(width, height) : null;

    return (
        <AdminField label={label} hint={hint}>
            {/* Offscreen probe — never shown, only used to read the file's own
                pixel dimensions before deciding whether to upload it. */}
            <video ref={probeRef} className="hidden" muted playsInline />

            {error && (
                <div className="mb-3 flex items-start gap-2 p-3 rounded-lg bg-danger-tint border border-danger/30 text-danger text-xs">
                    <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
                    <span>{error}</span>
                </div>
            )}

            {pending ? (
                <div className="rounded-xl border border-admin-border bg-admin-surface-alt p-3 space-y-3">
                    <div className="flex gap-3">
                        <video
                            src={pending.previewUrl}
                            className="w-32 h-20 object-cover rounded-lg border border-admin-border bg-black flex-shrink-0"
                            muted
                            playsInline
                            controls
                        />
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-ink truncate">{pending.file.name}</p>
                            <p className="text-[11px] text-admin-muted">{(pending.file.size / (1024 * 1024)).toFixed(1)}MB</p>
                            {pendingAspect && (
                                <div className={`mt-1.5 flex items-start gap-1.5 text-[11px] ${
                                    pendingAspect.tone === 'good' ? 'text-primary' : pendingAspect.tone === 'warn' ? 'text-accent-ink' : 'text-danger'
                                }`}>
                                    {pendingAspect.tone === 'good'
                                        ? <CheckCircle2 size={13} className="flex-shrink-0 mt-0.5" />
                                        : <AlertTriangle size={13} className="flex-shrink-0 mt-0.5" />}
                                    <span>{pendingAspect.message}</span>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button type="button" variant="turmeric" size="sm" onClick={confirmUpload} disabled={uploading} className="normal-case tracking-normal">
                            {uploading ? 'Uploading…' : 'Use this video'}
                        </Button>
                        <Button type="button" variant="outline" size="sm" onClick={cancelPending} disabled={uploading} className="normal-case tracking-normal">
                            Choose a different file
                        </Button>
                    </div>
                </div>
            ) : value ? (
                <div className="flex gap-4 items-start">
                    <video
                        src={imageUrl(value)}
                        className="w-32 h-20 object-cover rounded-lg border border-admin-border bg-black flex-shrink-0"
                        muted
                        playsInline
                        controls
                    />
                    <div className="flex-1 min-w-0 space-y-2">
                        {currentAspect && (
                            <div className={`flex items-start gap-1.5 text-[11px] ${
                                currentAspect.tone === 'good' ? 'text-primary' : currentAspect.tone === 'warn' ? 'text-accent-ink' : 'text-danger'
                            }`}>
                                {currentAspect.tone === 'good'
                                    ? <CheckCircle2 size={13} className="flex-shrink-0 mt-0.5" />
                                    : <AlertTriangle size={13} className="flex-shrink-0 mt-0.5" />}
                                <span>{currentAspect.message}</span>
                            </div>
                        )}
                        <div className="flex gap-3">
                            <label className="inline-flex items-center gap-2 text-xs text-primary cursor-pointer hover:text-primary-hover">
                                <Upload size={14} />
                                Replace video
                                <input ref={fileInputRef} type="file" accept="video/mp4,video/webm,video/quicktime" className="hidden" onChange={handleSelect} />
                            </label>
                            <button type="button" onClick={clearVideo} className="inline-flex items-center gap-1.5 text-xs text-danger hover:text-danger">
                                <X size={14} /> Remove
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                <label className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-admin-border bg-admin-surface-alt py-10 cursor-pointer hover:border-primary/30 hover:bg-primary/5 transition-colors">
                    <Film size={26} className="text-admin-muted/40" />
                    <span className="text-sm text-admin-muted">Click to upload a banner video</span>
                    <span className="text-xs text-admin-muted">MP4 or WebM · 16:9 landscape recommended · max {MAX_VIDEO_MB}MB</span>
                    <input type="file" accept="video/mp4,video/webm,video/quicktime" className="hidden" onChange={handleSelect} />
                </label>
            )}
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
                className="w-full px-4 py-3 bg-admin-surface-alt border border-sand/60 text-ink focus:outline-none focus:border-accent-ink focus:ring-1 focus:ring-accent-ink/30 transition-all rounded-lg text-sm"
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
                        className="p-2 text-admin-muted hover:text-danger transition-colors"
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
                        <button type="button" onClick={() => remove(i)} className="text-admin-muted hover:text-danger">
                            <Trash2 size={14} />
                        </button>
                    </div>
                    <div className="grid sm:grid-cols-3 gap-3">
                        <select
                            value={b.icon}
                            onChange={(e) => update(i, 'icon', e.target.value)}
                            className="px-3 py-2 bg-canvas border border-sand/60 rounded-lg text-sm"
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
                        <button type="button" onClick={() => remove(i)} className="text-admin-muted hover:text-danger">
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
    // Only sections the storefront still renders — settings saved for retired sections are ignored.
    const known = Object.keys(sections).filter((k) => k in labels);
    const keys = known.length ? known : Object.keys(labels);
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
            className="divide-y divide-line/30 rounded-xl border border-admin-border overflow-hidden"
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
            className="relative bg-canvas"
            style={{ touchAction: 'none' }}
        >
            <div className="flex items-center justify-between gap-3 p-4 hover:bg-admin-surface-alt">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                    <span
                        onPointerDown={(e) => dragControls.start(e)}
                        className="text-admin-muted/60 hover:text-primary cursor-grab active:cursor-grabbing p-1 -m-1 touch-none flex-shrink-0"
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
                        <span className="text-sm text-ink truncate font-medium">{label}</span>
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
                    className={`relative w-12 h-6 rounded-full transition-colors flex-shrink-0 ${enabled ? 'bg-primary' : 'bg-muted/30'}`}
                    aria-label={enabled ? 'Disable section' : 'Enable section'}
                >
                    <span className={`absolute top-0.5 w-5 h-5 bg-canvas rounded-full shadow transition-transform ${enabled ? 'left-6' : 'left-0.5'}`} />
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
