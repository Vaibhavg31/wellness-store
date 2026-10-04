/** Shared validation for Indian shipping addresses. Mirrors backend/lib/AddressHelper.php. */
export function validateAddress(data) {
    const errors = {};
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
    let phone = String(data.phone || '').replace(/\D/g, '');
    if (phone.length > 10) phone = phone.slice(-10);

    return {
        label: String(data.label || 'Home').trim() || 'Home',
        name: String(data.name || '').trim(),
        phone,
        address: String(data.address || '').trim(),
        landmark: String(data.landmark || '').trim(),
        city: String(data.city || '').trim(),
        state: String(data.state || '').trim(),
        pincode: String(data.pincode || '').replace(/\D/g, ''),
    };
}

export function ensureDefaultAddress(addresses) {
    if (!addresses.length) return [];
    const hasDefault = addresses.some((a) => a.isDefault);
    if (!hasDefault) addresses[0].isDefault = true;
    return addresses;
}
