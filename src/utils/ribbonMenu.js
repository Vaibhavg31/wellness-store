/** The five items of the top ribbon, in order. The admin can rename each and switch each on or off. */
export const DEFAULT_RIBBON_MENU = [
    { key: 'new', label: 'New Launches', enabled: true },
    { key: 'concern', label: 'Health Needs', enabled: true },
    { key: 'offers', label: 'Offers', enabled: true },
    { key: 'club', label: 'Chikit Club Card', enabled: true },
    { key: 'help', label: 'WhatsApp Help', enabled: true },
];

/**
 * The ribbon items to show: the admin's labels and switches laid over the fixed list of five. `always` lists keys that stay
 * even when switched off (the desktop bar keeps the first spot for its Shop link).
 */
export function ribbonItems(extras, { always = [] } = {}) {
    const saved = Array.isArray(extras?.ribbonMenu) ? extras.ribbonMenu : [];
    return DEFAULT_RIBBON_MENU.map((base) => {
        const own = saved.find((s) => s.key === base.key);
        return { key: base.key, label: (own?.label || '').trim() || base.label, enabled: own ? own.enabled !== false : base.enabled };
    }).filter((item) => item.enabled || always.includes(item.key));
}
