import { useCallback, useRef, useState } from 'react';
import { Maximize2 } from 'lucide-react';
import ImageLightbox from '@/components/product/ImageLightbox';
import { imageUrl } from '@/services/api';
import { cn } from '@/utils/formatPrice';

const SWIPE_PX = 40;

/**
 * Product pictures: on a desktop a column of thumbnails beside one large beige tile, on a phone a swipeable tile with a counter and
 * dots. Tap or click opens the full-screen zoom. Resets to the first picture when the pack (and so the image set) changes.
 */
export default function ProductGallery({ images, title, badge }) {
    const [selected, setSelected] = useState(0);
    const [viewing, setViewing] = useState(false);
    const closeViewer = useCallback(() => setViewing(false), []);
    const [trackedImages, setTrackedImages] = useState(images);
    const touch = useRef(null);
    const count = images.length;

    if (trackedImages !== images) {
        setTrackedImages(images);
        setSelected(0);
    }

    const step = (dir) => setSelected((i) => Math.min(count - 1, Math.max(0, i + dir)));
    const onTouchStart = (e) => { touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; };
    const onTouchEnd = (e) => {
        const start = touch.current;
        touch.current = null;
        if (!start || count < 2) return;
        const dx = e.changedTouches[0].clientX - start.x;
        const dy = e.changedTouches[0].clientY - start.y;
        if (Math.abs(dx) > SWIPE_PX && Math.abs(dx) > Math.abs(dy) * 1.5) step(dx < 0 ? 1 : -1);
    };

    return (
        <div className="flex min-w-0 gap-4">
            {count > 1 && (
                <ul className="hidden w-20 shrink-0 flex-col gap-3 lg:flex" aria-label="Product pictures">
                    {images.map((img, i) => (
                        <li key={`${img}-${i}`}>
                            <button type="button" onClick={() => setSelected(i)} aria-label={`View picture ${i + 1}`} aria-current={selected === i} className={cn('block aspect-square w-full overflow-hidden rounded-2xl bg-accent-tint ring-2 transition-all', selected === i ? 'ring-primary' : 'ring-transparent opacity-70 hover:opacity-100')}>
                                <img src={imageUrl(img, 160)} alt="" width="80" height="80" loading="lazy" className="size-full object-contain mix-blend-multiply" />
                            </button>
                        </li>
                    ))}
                </ul>
            )}

            <div
                className="relative aspect-[4/5] min-w-0 flex-1 cursor-zoom-in touch-pan-y overflow-hidden rounded-[1.75rem] bg-accent-tint ring-1 ring-line sm:aspect-square lg:aspect-[4/5]"
                onTouchStart={onTouchStart}
                onTouchEnd={onTouchEnd}
                onClick={(e) => { if (!e.target.closest('button')) setViewing(true); }}
            >
                <img key={selected} src={imageUrl(images[selected], 900)} alt={title} width="800" height="1000" fetchPriority="high" decoding="async" draggable={false} className="size-full animate-fade-in object-contain mix-blend-multiply" />
                {badge && <span className="absolute left-4 top-4 rounded-full bg-primary px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-white">{badge}</span>}
                <button type="button" onClick={() => setViewing(true)} aria-label="Open picture full screen and zoom" className="absolute bottom-4 right-4 grid size-11 place-items-center rounded-full bg-surface/95 text-ink shadow-md transition-colors hover:text-primary"><Maximize2 size={18} aria-hidden="true" /></button>
                {count > 1 && (
                    <div className="absolute inset-x-0 bottom-4 flex justify-center gap-1.5 lg:hidden">
                        {images.map((img, i) => (
                            <button key={`${img}-${i}`} type="button" onClick={() => setSelected(i)} aria-label={`View picture ${i + 1}`} aria-current={selected === i} className="grid size-6 place-items-center">
                                <span className={cn('block h-2 rounded-full transition-all', selected === i ? 'w-6 bg-primary' : 'w-2 bg-ink/25')} />
                            </button>
                        ))}
                    </div>
                )}
            </div>

            <ImageLightbox isOpen={viewing} images={images} index={selected} title={title} onIndexChange={setSelected} onClose={closeViewer} />
        </div>
    );
}
