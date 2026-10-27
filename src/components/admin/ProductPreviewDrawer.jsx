import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AlertCircle, Monitor, Smartphone } from 'lucide-react';
import Drawer from '@/components/ui/Drawer';
import { PREVIEW_MESSAGE, PREVIEW_PATH, PREVIEW_READY } from '@/utils/productPreview';
import { cn } from '@/utils/formatPrice';

const PHONE = { width: 390, label: 'Phone' };
const DESKTOP = { width: 1280, label: 'Desktop' };

/** Width/height of an element, kept up to date as the drawer or window is resized. */
function useBox() {
    const ref = useRef(null);
    const [box, setBox] = useState({ width: 0, height: 0 });
    const attach = useCallback((node) => {
        ref.current?.observer?.disconnect();
        if (!node) return;
        const observer = new ResizeObserver(([entry]) => setBox({ width: Math.floor(entry.contentRect.width), height: Math.floor(entry.contentRect.height) }));
        observer.observe(node);
        ref.current = { observer };
    }, []);
    return [attach, box];
}

/**
 * Admin "Preview" drawer: shows the product page exactly as customers will see it, from the form's unsaved data.
 * The page runs inside an <iframe> of real phone (390px) or desktop (1280px) width, so its responsive layout is the
 * genuine one, not an approximation. The draft is sent to the frame with postMessage and refreshed whenever it changes.
 */
export default function ProductPreviewDrawer({ isOpen, onClose, product, missing = [] }) {
    const frameRef = useRef(null);
    const [ready, setReady] = useState(false);
    const [stageRef, stage] = useBox();
    const [device, setDevice] = useState(null); // null until we know how much room there is

    // Start on Phone when the drawer is narrow (an admin on a phone), Desktop when there is room for it.
    useLayoutEffect(() => {
        if (device === null && stage.width > 0) setDevice(stage.width >= 760 ? 'desktop' : 'phone');
    }, [device, stage.width]);
    useEffect(() => { if (!isOpen) { setReady(false); setDevice(null); } }, [isOpen]);

    // The frame announces when it is listening; then (and on every edit) it gets the latest draft.
    useEffect(() => {
        if (!isOpen) return undefined;
        const onMessage = (event) => {
            if (event.origin === window.location.origin && event.source === frameRef.current?.contentWindow && event.data?.type === PREVIEW_READY) setReady(true);
        };
        window.addEventListener('message', onMessage);
        return () => window.removeEventListener('message', onMessage);
    }, [isOpen]);

    useEffect(() => {
        if (isOpen && ready) frameRef.current?.contentWindow?.postMessage({ type: PREVIEW_MESSAGE, product }, window.location.origin);
    }, [isOpen, ready, product]);

    const phone = device !== 'desktop';
    const pad = stage.width < 520 ? 0 : 20; // the phone frame goes edge to edge when the drawer itself is phone-sized
    const availW = Math.max(0, stage.width - pad * 2);
    const availH = Math.max(0, stage.height - pad * 2);

    let frameStyle = { width: '100%', height: '100%' };
    let wrapperStyle = { width: availW, height: availH };
    if (device && stage.width > 0) {
        if (phone) {
            // With the phone bezel (8px each side) the screen inside must still be a true 390px wide.
            const bezel = pad > 0 ? 16 : 0;
            const screen = Math.min(PHONE.width, availW - bezel);
            wrapperStyle = { width: screen + bezel, height: Math.min(availH, 860 + bezel) };
            frameStyle = { width: '100%', height: '100%' };
        } else {
            const scale = Math.min(1, availW / DESKTOP.width);
            wrapperStyle = { width: DESKTOP.width * scale, height: availH };
            frameStyle = { width: DESKTOP.width, height: availH / scale, transform: `scale(${scale})`, transformOrigin: 'top left' };
        }
    }

    return (
        <Drawer isOpen={isOpen} onClose={onClose} title="Product preview" subtitle="How customers will see this page. Nothing is saved yet." size="xl" flush admin>
            <div className="flex h-full min-h-0 flex-col">
                <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3 sm:px-6">
                    <div role="radiogroup" aria-label="Preview device" className="inline-flex rounded-lg border border-admin-border bg-admin-surface-alt p-0.5">
                        {[['phone', Smartphone, PHONE], ['desktop', Monitor, DESKTOP]].map(([key, Icon, info]) => (
                            <button
                                key={key}
                                type="button"
                                role="radio"
                                aria-checked={device === key}
                                onClick={() => setDevice(key)}
                                className={cn('inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-small font-medium transition-colors', device === key ? 'bg-admin-surface text-primary-deep shadow-xs' : 'text-admin-muted hover:text-ink')}
                            >
                                <Icon size={15} aria-hidden="true" /> {info.label}
                            </button>
                        ))}
                    </div>
                    <p className="text-caption text-admin-muted">Buttons and links are switched off here.</p>
                </div>

                {missing.length > 0 && (
                    <p className="flex shrink-0 items-start gap-2 border-b border-warning/30 bg-warning-tint px-4 py-2.5 text-caption text-ink sm:px-6" role="status">
                        <AlertCircle size={15} className="mt-0.5 shrink-0 text-warning" aria-hidden="true" />
                        <span>Still needed for a complete page: {missing.join(', ')}.</span>
                    </p>
                )}

                <div ref={stageRef} className="min-h-0 flex-1 overflow-hidden bg-admin-surface-alt" style={{ padding: pad }}>
                    {device && (
                        <div className="mx-auto" style={wrapperStyle}>
                            <div
                                className={cn('size-full overflow-hidden bg-canvas', phone && pad > 0 ? 'rounded-[1.75rem] border-[8px] border-ink shadow-lg' : '', !phone && 'rounded-lg border border-admin-border shadow-md')}
                            >
                                <iframe
                                    ref={frameRef}
                                    src={PREVIEW_PATH}
                                    title="Product page preview"
                                    className="block border-0 bg-canvas"
                                    style={frameStyle}
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </Drawer>
    );
}
