import { HttpError } from './response.js';

/**
 * Small, shared input checks for the admin and public forms. Each throws an HttpError(400) whose message is a sentence the
 * form can show as it is, so a bad value comes back as a clear 400 instead of a 500 from the database (or, worse, being
 * silently cut to the column width).
 */

/** A practical e-mail check: one @, a dot in the domain, no spaces, no empty or doubled dots, within the 254-character limit. */
export function isValidEmail(value) {
    const email = String(value ?? '').trim();
    if (email.length < 6 || email.length > 254) return false;
    return /^[^\s@.]+(?:\.[^\s@.]+)*@[^\s@.]+(?:\.[^\s@.]+)+$/.test(email);
}

/** Text with a maximum length. `required` rejects blank. Non-strings (objects, arrays) are refused. */
export function assertText(value, label, max, { required = false } = {}) {
    if (value === undefined || value === null || value === '') {
        if (required) throw new HttpError(`${label} is required`, 400);
        return;
    }
    if (typeof value !== 'string') throw new HttpError(`${label} must be text`, 400);
    if (required && !value.trim()) throw new HttpError(`${label} is required`, 400);
    if (value.length > max) throw new HttpError(`${label} must be ${max} characters or fewer`, 400);
}

/** A whole number within [min, max]. Accepts numeric strings (form fields), refuses "abc", 1.5, NaN, Infinity, booleans. */
export function assertWhole(value, label, { min = 0, max = 1000000 } = {}) {
    const ok = ['number', 'string'].includes(typeof value) && String(value).trim() !== '' && Number.isInteger(Number(value));
    if (!ok || Number(value) < min || Number(value) > max) throw new HttpError(`${label} must be a whole number from ${min} to ${max}`, 400);
    return Number(value);
}

/** A finite amount within [min, max]. */
export function assertAmount(value, label, { min = 0, max = 10000000 } = {}) {
    const ok = ['number', 'string'].includes(typeof value) && String(value).trim() !== '' && Number.isFinite(Number(value));
    if (!ok || Number(value) < min || Number(value) > max) throw new HttpError(`${label} must be a number from ${min} to ${max}`, 400);
    return Number(value);
}

const DANGEROUS_SCHEME = /^\s*(javascript|data|vbscript|file):/i;

/**
 * A picture address: an own-site path ("/uploads/x.webp"), or an http(s) address. Never javascript:/data: and never
 * a non-string (an object used to be saved as the text "[object Object]").
 */
export function assertImageUrl(value, label, { required = false } = {}) {
    if (value === undefined || value === null || value === '') {
        if (required) throw new HttpError(`${label} is required`, 400);
        return;
    }
    if (typeof value !== 'string' || value.length > 2048) throw new HttpError(`${label} must be an image address of 2048 characters or fewer`, 400);
    if (DANGEROUS_SCHEME.test(value) || !(value.startsWith('/') || /^https?:\/\//i.test(value))) {
        throw new HttpError(`${label} must be an uploaded picture or an http(s) address`, 400);
    }
}

/** A link a button may point to: an own-site path, #anchor, http(s), mailto: or tel:. Never javascript:/data:. */
export function assertLink(value, label) {
    if (value === undefined || value === null || value === '') return;
    if (typeof value !== 'string' || value.length > 2048) throw new HttpError(`${label} must be a link of 2048 characters or fewer`, 400);
    if (DANGEROUS_SCHEME.test(value) || !/^(\/|#|\?|https?:\/\/|mailto:|tel:)/i.test(value.trim())) {
        throw new HttpError(`${label} must start with / or http(s)://, mailto: or tel:`, 400);
    }
}

/** Both dates (when given) must parse, and the end must come after the start. */
export function assertDateRange(start, end, { startLabel = 'Start date', endLabel = 'End date' } = {}) {
    const parse = (v, label) => {
        if (!v) return null;
        const t = Date.parse(v);
        if (Number.isNaN(t)) throw new HttpError(`${label} is not a valid date`, 400);
        return t;
    };
    const s = parse(start, startLabel);
    const e = parse(end, endLabel);
    if (s !== null && e !== null && e <= s) throw new HttpError(`${endLabel} must be after ${startLabel.toLowerCase()}`, 400);
}
