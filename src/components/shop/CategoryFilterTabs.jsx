export default function CategoryFilterTabs({ categories, active, onChange }) {
    const tabs = [
        { slug: 'all', label: 'All' },
        ...categories.map((c) => ({ slug: c.slug, label: c.label })),
    ];

    return (
        <div className="relative w-full">
            <div className="pointer-events-none absolute inset-y-0 left-0 w-6 bg-gradient-to-r from-ivory to-transparent z-10" aria-hidden="true" />
            <div className="pointer-events-none absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-ivory to-transparent z-10" aria-hidden="true" />
            <div className="flex flex-nowrap gap-1.5 sm:gap-2.5 py-0.5 sm:py-1 px-4 sm:px-1 overflow-x-auto hide-scrollbar scroll-smooth snap-x snap-proximity">
                {tabs.map((tab) => {
                    const isActive = active === tab.slug;
                    return (
                        <button
                            key={tab.slug}
                            type="button"
                            onClick={() => onChange(tab.slug)}
                            className={`flex-shrink-0 snap-start px-2.5 sm:px-5 py-2 sm:py-2.5 type-eyebrow-sm sm:type-eyebrow transition-all duration-300 border rounded-sm whitespace-nowrap ${
                                isActive
                                    ? 'bg-wine text-ivory border-wine shadow-sm sm:scale-[1.02]'
                                    : 'bg-ivory text-charcoal border-charcoal/20 sm:border-charcoal/25 hover:border-wine/50 hover:text-wine'
                            }`}
                            aria-pressed={isActive}
                        >
                            {tab.label}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
