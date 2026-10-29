import { useCallback, useRef, useState } from 'react';
import { Maximize2 } from 'lucide-react';
import Badge from '@/components/ui/Badge';
import ImageLightbox from '@/components/product/ImageLightbox';
import { imageUrl } from '@/services/api';
import { cn } from '@/utils/formatPrice';

const TAG_VARIANT = { Sale: 'sale', New: 'new' };
const SWIPE_PX = 40;

/**
 * Main image + thumbnails. On phones the photo is square (so the name and price stay near the first screen), swipes
 * left/right between photos and shows dots instead of the thumbnail row. Resets to the first image when `images` changes.
 */
export default function ProductGallery({ images, title, tags = [] }) {
    const [selected, setSelected] = useState(0);
    const [viewing, setViewing] = useState(false);
    const closeViewer = useCallback(() => setViewing(false), []);
    const [trackedImages, setTrackedImages] = useState(images);
    const touch = useRef(null);
    const count = images.length;

    // Reset selection when the image set changes (product or variant switch).
    if (trackedImages !== images) {
        setTrackedImages(images);
        setSelected(0);
    }

    const step = (dir) => setSelected((i) => Math.min(count - 1, Math.max(0, i + dir)));
    const onTouchStart = (event) => { touch.current = { x: event.touches[0].clientX, y: event.touches[0].clientY }; };
    const onTouchEnd = (event) => {
        const start = touch.current;
        touch.current = null;
        if (!start || count < 2) return;
        const dx = event.changedTouches[0].clientX - start.x;
        const dy = event.changedTouches[0].clientY - start.y;
        if (Math.abs(dx) > SWIPE_PX && Math.abs(dx) > Math.abs(dy) * 1.5) step(dx < 0 ? 1 : -1);
    };

    return (
        <div className="mx-auto min-w-0 lg:max-w-[min(100%,calc((100svh-13rem)*0.8))]">
            <div
                className="relative aspect-square cursor-zoom-in touch-pan-y overflow-hidden rounded-xl bg-canvas-alt sm:aspect-[4/5]"
                onTouchStart={onTouchStart}
                onTouchEnd={onTouchEnd}
                onClick={(event) => { if (!event.target.closest('button')) setViewing(true); }}
            >
                <img
                    key={selected}
                    src={imageUrl(images[selected], 900)}
                    alt={title}
                    width="800"
                    height="1000"
                    fetchPriority="high"
                    decoding="async"
                    draggable={false}
                    className="size-full animate-fade-in object-contain mix-blend-multiply"
                />
                <button
                    type="button"
                    onClick={() => setViewing(true)}
                    aria-label="Open photo full screen and zoom"
                    className="absolute bottom-3 right-3 grid size-10 place-items-center rounded-full bg-surface/90 text-ink shadow-xs ring-1 ring-line transition-colors hover:bg-surface"
                >
                    <Maximize2 size={18} aria-hidden="true" />
                </button>
                {tags.length > 0 && (
                    <div className="absolute left-4 top-4 flex flex-col gap-2">
                        {tags.slice(0, 1).map((tag) => <Badge key={tag} variant={TAG_VARIANT[tag] ?? 'bestseller'}>{tag}</Badge>)}
                    </div>
                )}
                {count > 1 && (
                    <>
                        <p className="absolute right-3 top-3 rounded-full bg-surface/85 px-2.5 py-1 text-caption font-medium tabular-nums text-ink sm:hidden" aria-hidden="true">{selected + 1} / {count}</p>
                        <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5 sm:hidden">
                            {images.map((img, i) => (
                                <button
                                    key={`${img}-${i}`}
                                    type="button"
                                    onClick={() => setSelected(i)}
                                    aria-label={`View image ${i + 1}`}
                                    aria-current={selected === i}
                                    className="grid size-6 place-items-center"
                                >
                                    <span className={cn('block h-2 rounded-full transition-all', selected === i ? 'w-5 bg-primary' : 'w-2 bg-ink/25')} />
                                </button>
                            ))}
                        </div>
                    </>
                )}
            </div>

            {count > 1 && (
                <ul className="mt-3 hidden gap-2.5 overflow-x-auto pb-1 scrollbar-none sm:flex">
                    {images.map((img, i) => (
                        <li key={`${img}-${i}`} className="shrink-0">
                            <button
                                type="button"
                                onClick={() => setSelected(i)}
                                aria-label={`View image ${i + 1}`}
                                aria-current={selected === i}
                                className={cn('size-16 overflow-hidden rounded-md border-2 transition-[border-color,opacity] sm:size-20', selected === i ? 'border-primary' : 'border-transparent opacity-60 hover:opacity-100')}
                            >
                                <img src={imageUrl(img, 160)} alt="" width="80" height="80" loading="lazy" className="size-full bg-canvas-alt object-contain mix-blend-multiply" />
                            </button>
                        </li>
                    ))}
                </ul>
            )}

            <ImageLightbox isOpen={viewing} images={images} index={selected} title={title} onIndexChange={setSelected} onClose={closeViewer} />
        </div>
    );
}
