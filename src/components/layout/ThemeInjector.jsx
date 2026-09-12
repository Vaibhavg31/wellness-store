import { useEffect } from 'react';
import { useSiteContent } from '@/contexts/SiteContentContext';
import { imageUrl } from '@/services/api';

const STYLE_TAG_ID = 'dynamic-theme-vars';
const FAVICON_LINK_ID = 'dynamic-favicon';
const FONT_LINK_ID = 'dynamic-google-fonts';

// Fonts already loaded statically in index.html (Cormorant Garamond, Inter)
// or system fonts that need no stylesheet at all.
const NO_LOAD_NEEDED = new Set([
    'Cormorant Garamond', 'Inter', 'Georgia', 'Times New Roman', 'system-ui',
]);

/** Pull the first (quoted or bare) font family name out of a CSS font-family value. */
function primaryFamily(cssValue) {
    if (!cssValue) return null;
    const first = cssValue.split(',')[0].trim().replace(/^["']|["']$/g, '');
    return first || null;
}

/**
 * Applies admin-configured branding (colors, fonts, favicon) at runtime by
 * overriding the CSS custom properties Tailwind's @theme directive generates
 * in :root (src/index.css). Every utility class built on those tokens
 * (bg-wine, text-gold, border-blush, font-serif, ...) picks up the new value
 * immediately — no rebuild needed.
 */
export default function ThemeInjector() {
    const { content } = useSiteContent();
    const theme = content.theme;

    useEffect(() => {
        if (!theme) return;
        let style = document.getElementById(STYLE_TAG_ID);
        if (!style) {
            style = document.createElement('style');
            style.id = STYLE_TAG_ID;
            document.head.appendChild(style);
        }
        style.textContent = `:root {
            --color-wine: ${theme.primaryColor};
            --color-wine-light: ${theme.primaryLight};
            --color-wine-deep: ${theme.primaryDark};
            --color-emerald: ${theme.primaryColor};
            --color-emerald-light: ${theme.primaryLight};
            --color-emerald-dark: ${theme.primaryDark};
            --color-accent-brown: ${theme.primaryColor};
            --color-gold: ${theme.accentColor};
            --color-gold-light: ${theme.accentLight};
            --color-muted-gold: ${theme.accentColor};
            --color-blush: ${theme.blushColor};
            --color-champagne: ${theme.blushColor};
            --color-ivory: ${theme.backgroundColor};
            --color-cream: ${theme.backgroundColor};
            --color-charcoal: ${theme.textColor};
            --color-dark-chocolate: ${theme.textColor};
            --font-serif: ${theme.fontHeading};
            --font-sans: ${theme.fontBody};
        }`;
    }, [theme]);

    useEffect(() => {
        if (!theme) return;
        const families = [primaryFamily(theme.fontHeading), primaryFamily(theme.fontBody)]
            .filter((f) => f && !NO_LOAD_NEEDED.has(f));

        let link = document.getElementById(FONT_LINK_ID);
        if (families.length === 0) {
            link?.remove();
            return;
        }
        if (!link) {
            link = document.createElement('link');
            link.id = FONT_LINK_ID;
            link.rel = 'stylesheet';
            document.head.appendChild(link);
        }
        const families_param = [...new Set(families)]
            .map((f) => `family=${encodeURIComponent(f)}:ital,wght@0,300;0,400;0,500;0,600;1,400`)
            .join('&');
        link.href = `https://fonts.googleapis.com/css2?${families_param}&display=swap`;
    }, [theme]);

    useEffect(() => {
        if (!content.favicon) return;
        let link = document.getElementById(FAVICON_LINK_ID);
        if (!link) {
            link = document.createElement('link');
            link.id = FAVICON_LINK_ID;
            link.rel = 'icon';
            document.head.appendChild(link);
        }
        link.href = imageUrl(content.favicon);
    }, [content.favicon]);

    return null;
}
