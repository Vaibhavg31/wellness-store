/** Shared validation for Indian shipping addresses. Mirrors backend/lib/AddressHelper.php. */
export function validateAddress(data) {
    const errors = {};
    // Text fields must be text (an object used to be saved as "[object Object]") and fit their columns (longer text was cut silently).
    const limits = { label: 50, name: 100, address: 500, landmark: 150, city: 100, state: 100, phone: 20, pincode: 10 };
    for (const [field, max] of Object.entries(limits)) {
        const value = data?.[field];
        if (value === undefined || value === null) continue;
        if (typeof value !== 'string' && typeof value !== 'number') errors[field] = `${field[0].toUpperCase()}${field.slice(1)} must be text`;
        else if (String(value).length > max) errors[field] = `${field[0].toUpperCase()}${field.slice(1)} must be ${max} characters or fewer`;
    }
    if (Object.keys(errors).length > 0) return errors;
    if (!String(data.name || '').trim()) errors.name = 'Name is required';
    if (!String(data.address || '').trim()) errors.address = 'Street address is required';
    if (!String(data.city || '').trim()) errors.city = 'City is required';
    if (!String(data.state || '').trim()) errors.state = 'State is required';

    const pincode = String(data.pincode || '').replace(/\D/g, '');
    if (pincode.length !== 6) errors.pincode = 'Enter a valid 6-digit PIN code';

    const phone = String(data.phone || '').replace(/\D/g, '');
    if (phone && phone.length < 10) errors.phone = 'Enter a valid 10-digit mobile number';

    return errors;
}

export function normalizeAddress(data) {
    // Only text or numbers count: an object or array used to be turned into "[object Object]" and saved.
    const text = (v) => (typeof v === 'string' || typeof v === 'number' ? String(v).trim() : '');
    let phone = text(data.phone).replace(/\D/g, '');
    if (phone.length > 10) phone = phone.slice(-10);

    return {
        label: text(data.label) || 'Home',
        name: text(data.name),
        phone,
        address: text(data.address),
        landmark: text(data.landmark),
        city: text(data.city),
        state: text(data.state),
        pincode: text(data.pincode).replace(/\D/g, ''),
    };
}

export function ensureDefaultAddress(addresses) {
    if (!addresses.length) return [];
    const hasDefault = addresses.some((a) => a.isDefault);
    if (!hasDefault) addresses[0].isDefault = true;
    return addresses;
}
