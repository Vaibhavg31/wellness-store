export default function CategoryFilterTabs({ categories, active, onChange }) {
    const tabs = [
        { slug: 'all', label: 'All' },
        ...categories.map((c) => ({ slug: c.slug, label: c.label })),
    ];

    return (
        <div className="relative w-full">
            <div className="pointer-events-none absolute inset-y-0 left-0 w-6 bg-gradient-to-r from-cream to-transparent z-10" aria-hidden="true" />
            <div className="pointer-events-none absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-cream to-transparent z-10" aria-hidden="true" />
            <div className="flex flex-nowrap items-center gap-5 sm:gap-7 py-0.5 sm:py-1 px-4 sm:px-1 overflow-x-auto hide-scrollbar scroll-smooth snap-x snap-proximity border-b border-border/60">
                {tabs.map((tab) => {
                    const isActive = active === tab.slug;
                    return (
                        <button
                            key={tab.slug}
                            type="button"
                            onClick={() => onChange(tab.slug)}
                            className={`relative flex-shrink-0 snap-start pb-2.5 type-eyebrow-sm sm:type-eyebrow whitespace-nowrap transition-colors duration-300 ${
                                isActive ? 'text-forest' : 'text-slate hover:text-ink'
                            }`}
                            aria-pressed={isActive}
                        >
                            {tab.label}
                            <span
                                className={`absolute left-0 right-0 -bottom-px h-[2px] rounded-full bg-forest transition-transform duration-300 origin-left ${
                                    isActive ? 'scale-x-100' : 'scale-x-0'
                                }`}
                                aria-hidden="true"
                            />
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
