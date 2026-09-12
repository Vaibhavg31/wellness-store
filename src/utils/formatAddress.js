/**
 * Indian address layout:
 * Street → Landmark → City, State — PIN
 */

export function formatIndianAddress(shipping, { multiline = false } = {}) {
    const s = shipping || {};
    const lines = [];

    if (s.address?.trim()) lines.push(s.address.trim());

    const landmark = s.landmark?.trim();
    if (landmark && !s.address?.includes(landmark)) {
        lines.push(landmark);
    }

    const cityState = [s.city, s.state].filter(Boolean).join(', ');
    const locality = [cityState, s.pincode].filter(Boolean).join(', ');
    if (locality) lines.push(locality);

    if (multiline) return lines.join('\n');
    return lines.join(', ');
}
