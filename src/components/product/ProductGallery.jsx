import { useState } from 'react';
import Badge from '@/components/ui/Badge';
import { imageUrl } from '@/services/api';
import { cn } from '@/utils/formatPrice';

const TAG_VARIANT = { Sale: 'sale', New: 'new' };

/** Main image + thumbnail strip. Resets to the first image when `images` changes. */
export default function ProductGallery({ images, title, tags = [] }) {
    const [selected, setSelected] = useState(0);
    const [trackedImages, setTrackedImages] = useState(images);

    // Reset selection when the image set changes (product or variant switch).
    if (trackedImages !== images) {
        setTrackedImages(images);
        setSelected(0);
    }

    return (
        <div className="min-w-0">
            <div className="relative aspect-square overflow-hidden rounded-xl bg-canvas-alt">
                <img
                    key={selected}
                    src={imageUrl(images[selected])}
                    alt={title}
                    width="800"
                    height="800"
                    fetchPriority="high"
                    decoding="async"
                    className="size-full animate-fade-in object-cover"
                />
                {tags.length > 0 && (
                    <div className="absolute left-4 top-4 flex flex-col gap-2">
                        {tags.map((tag) => <Badge key={tag} variant={TAG_VARIANT[tag] ?? 'bestseller'}>{tag}</Badge>)}
                    </div>
                )}
            </div>

            {images.length > 1 && (
                <ul className="mt-3 flex gap-2.5 overflow-x-auto pb-1 scrollbar-none">
                    {images.map((img, i) => (
                        <li key={`${img}-${i}`} className="shrink-0">
                            <button
                                type="button"
                                onClick={() => setSelected(i)}
                                aria-label={`View image ${i + 1}`}
                                aria-current={selected === i}
                                className={cn('size-16 overflow-hidden rounded-md border-2 transition-[border-color,opacity] sm:size-20', selected === i ? 'border-primary' : 'border-transparent opacity-60 hover:opacity-100')}
                            >
                                <img src={imageUrl(img)} alt="" width="80" height="80" loading="lazy" className="size-full object-cover" />
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
