/**
 * Copies text to the clipboard and resolves to whether it worked.
 * `navigator.clipboard` only exists on secure origins (HTTPS / localhost), so on a plain-HTTP preview or an in-app
 * browser it is missing or throws. The fallback selects a hidden field and uses the older copy command, which still works there.
 */
export async function copyText(text) {
    const value = String(text ?? '');
    if (!value) return false;
    if (window.isSecureContext && navigator.clipboard?.writeText) {
        try {
            await navigator.clipboard.writeText(value);
            return true;
        } catch {
            /* denied or blocked — try the fallback */
        }
    }
    const field = document.createElement('textarea');
    field.value = value;
    field.setAttribute('readonly', '');
    // Off-screen, but real and 16px so phones neither scroll nor zoom to it while it is selected.
    field.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;font-size:16px;';
    const previous = document.activeElement;
    document.body.appendChild(field);
    field.focus({ preventScroll: true });
    field.select();
    field.setSelectionRange(0, value.length);
    let ok = false;
    try {
        ok = document.execCommand('copy');
    } catch {
        ok = false;
    }
    document.body.removeChild(field);
    if (previous instanceof HTMLElement) previous.focus({ preventScroll: true });
    return ok;
}
