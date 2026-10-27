const PINCODE_API = 'https://api.postalpincode.in/pincode';

/** @returns {Promise<{ city: string, state: string, district: string } | null>} */
export async function lookupPincode(pincode) {
    const digits = String(pincode || '').replace(/\D/g, '');
    if (digits.length !== 6) return null;

    try {
        const res = await fetch(`${PINCODE_API}/${digits}`);
        if (!res.ok) return null;

        const data = await res.json();
        if (!Array.isArray(data) || data[0]?.Status !== 'Success') return null;

        const offices = data[0]?.PostOffice;
        if (!Array.isArray(offices) || offices.length === 0) return null;

        const primary = offices[0];
        return {
            city: primary.District || primary.Block || primary.Name || '',
            state: primary.State || '',
            district: primary.District || '',
        };
    } catch {
        return null;
    }
}

export function isValidPincode(value) {
    return /^\d{6}$/.test(String(value || '').replace(/\D/g, ''));
}
