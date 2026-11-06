import { Router } from 'express';
import { requireAdmin } from '../lib/auth.js';
import { asyncRoute, sendJson, HttpError } from '../lib/response.js';
import { assertText, assertWhole, assertAmount, assertImageUrl, assertLink, isValidEmail } from '../lib/validate.js';
import { resetClubConfigCache } from '../lib/club.js';
import { SettingsRepository } from '../repositories/settingsRepository.js';

const router = Router();
const repo = new SettingsRepository();

const COLOR = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const sectionOf = (c, key) => {
    if (!(key in c)) return null;
    if (!c[key] || typeof c[key] !== 'object' || Array.isArray(c[key])) throw new HttpError(`"${key}" must be a group of settings`, 400);
    return c[key];
};
const assertFlag = (group, key, label) => {
    if (key in group && typeof group[key] !== 'boolean') throw new HttpError(`${label} must be on or off`, 400);
};

/**
 * Admin input rules for the store settings. Only the settings that are present are checked (the admin pages save one
 * group at a time), and a bad value is refused with a sentence the form can show. Without this a negative delivery fee
 * lowered every order, "abc" caused a 500, and long text was cut silently to the column width.
 */
function assertValidSettings(c) {
    if (!c || typeof c !== 'object' || Array.isArray(c)) throw new HttpError('Settings must be sent as an object', 400);

    assertText(c.siteName, 'Site name', 255);
    assertText(c.brandName, 'Brand name', 255);
    assertText(c.brandShort, 'Short brand name', 100);
    assertText(c.brandTagline, 'Tagline', 500);
    if ('logo' in c) assertImageUrl(c.logo, 'Logo');
    if ('favicon' in c) assertImageUrl(c.favicon, 'Favicon');

    const theme = sectionOf(c, 'theme');
    if (theme) {
        for (const [key, value] of Object.entries(theme)) {
            if (/Color$|Light$|Dark$/.test(key) && !COLOR.test(String(value))) throw new HttpError(`Theme colour "${key}" must be a hex colour such as #602460`, 400);
            if (key.startsWith('font')) {
                assertText(value, 'Font', 255);
                if (/[{};<>]/.test(String(value))) throw new HttpError('A font name cannot contain { } ; < >', 400);
            }
        }
    }

    const contact = sectionOf(c, 'contact');
    if (contact) {
        if (contact.email && !isValidEmail(contact.email)) throw new HttpError('Contact email is not a valid email address', 400);
        if (contact.whatsappNumber && !/^[+()\d\s-]{6,20}$/.test(String(contact.whatsappNumber))) throw new HttpError('WhatsApp number may only have digits, spaces, + - ( ) (6 to 20 characters)', 400);
        assertText(contact.whatsappDisplay, 'WhatsApp display number', 50);
        assertText(contact.businessHours, 'Business hours', 255);
    }

    const social = sectionOf(c, 'social');
    if (social) {
        assertText(social.instagramHandle, 'Instagram handle', 100);
        if (social.instagramUrl && !/^https?:\/\//i.test(String(social.instagramUrl))) throw new HttpError('Instagram link must start with http:// or https://', 400);
    }

    const delivery = sectionOf(c, 'delivery');
    if (delivery) {
        if ('fee' in delivery) assertAmount(delivery.fee, 'Delivery fee', { min: 0, max: 100000 });
        if ('freeThreshold' in delivery) assertAmount(delivery.freeThreshold, 'Free-delivery amount', { min: 0, max: 10000000 });
        if ('returnDays' in delivery) assertWhole(delivery.returnDays, 'Return days', { min: 0, max: 365 });
    }

    for (const key of ['payments', 'services']) {
        const group = sectionOf(c, key);
        if (group) for (const [k, v] of Object.entries(group)) if (typeof v !== 'boolean') throw new HttpError(`${k} must be on or off`, 400);
    }

    const sections = sectionOf(c, 'sections');
    if (sections) {
        if (Object.keys(sections).length > 60) throw new HttpError('Too many homepage sections', 400);
        for (const [k, v] of Object.entries(sections)) {
            if (!/^[A-Za-z][A-Za-z0-9]{0,39}$/.test(k)) throw new HttpError(`"${k.slice(0, 40)}" is not a valid homepage section name`, 400);
            if (typeof v !== 'boolean') throw new HttpError(`Homepage section "${k}" must be on or off`, 400);
        }
    }

    const promo = sectionOf(c, 'promo');
    if (promo) {
        assertFlag(promo, 'enabled', 'Promo bar');
        assertText(promo.text, 'Promo text', 255);
        assertText(promo.code, 'Promo code', 50);
        assertText(promo.suffix, 'Promo text after the code', 255);
        assertLink(promo.href, 'Promo link');
    }

    const popup = sectionOf(c, 'popup');
    if (popup) {
        assertFlag(popup, 'enabled', 'Popup');
        assertText(popup.title, 'Popup title', 255);
        assertText(popup.ctaLabel, 'Popup button', 255);
        assertText(popup.couponCode, 'Popup coupon code', 50);
        assertLink(popup.ctaHref, 'Popup link');
        if ('image' in popup) assertImageUrl(popup.image, 'Popup image');
        if ('delaySeconds' in popup) assertWhole(popup.delaySeconds, 'Popup delay', { min: 0, max: 300 });
    }

    if ('navLinks' in c) {
        if (!Array.isArray(c.navLinks) || c.navLinks.length > 12) throw new HttpError('The menu can have up to 12 links', 400);
        for (const link of c.navLinks) {
            assertText(link?.label, 'Menu link name', 40, { required: true });
            assertLink(link?.href, 'Menu link address');
        }
    }
}

router.get('/settings', asyncRoute(async (req, res) => {
    // Deliberately not browser-cached — see backend/lib/Routes/SettingsRoutes.php for why.
    sendJson(res, await repo.get());
}, 'Failed to fetch settings'));

router.put('/settings', asyncRoute(async (req, res) => {
    requireAdmin(req);
    assertValidSettings(req.body || {});
    const updated = await repo.set(req.body || {});
    resetClubConfigCache(); // a new club discount applies to the very next page view
    sendJson(res, updated);
}, 'Failed to update settings'));

export default router;
