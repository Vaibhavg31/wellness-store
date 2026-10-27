const KEY = 'chikit-spin';
const DAY = 24 * 60 * 60 * 1000;

/** The visitor's last spin on this browser: { at, label, win, code }, or null. */
export function readSpin() {
    try {
        const saved = JSON.parse(localStorage.getItem(KEY) || 'null');
        return saved && typeof saved.at === 'number' ? saved : null;
    } catch {
        return null;
    }
}

export function writeSpin(result) {
    try {
        localStorage.setItem(KEY, JSON.stringify({ at: Date.now(), label: result.label, win: Boolean(result.win), code: result.code || '' }));
    } catch {
        /* storage blocked — the server still limits spins per IP */
    }
}

/** True while this browser has already spun and the cooldown (0 = never again) hasn't passed. */
export function spinCooldownActive(cooldownDays) {
    const last = readSpin();
    if (!last) return false;
    return cooldownDays === 0 || Date.now() - last.at < cooldownDays * DAY;
}
