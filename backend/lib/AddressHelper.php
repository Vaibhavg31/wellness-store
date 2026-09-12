<?php

declare(strict_types=1);

namespace Krivea;

/**
 * Shared validation for Indian shipping addresses.
 */
final class AddressHelper
{
    /** @return array<string, string> field => error message */
    public static function validate(array $data): array
    {
        $errors = [];

        if (trim((string) ($data['name'] ?? '')) === '') {
            $errors['name'] = 'Name is required';
        }
        if (trim((string) ($data['address'] ?? '')) === '') {
            $errors['address'] = 'Street address is required';
        }
        if (trim((string) ($data['city'] ?? '')) === '') {
            $errors['city'] = 'City is required';
        }
        if (trim((string) ($data['state'] ?? '')) === '') {
            $errors['state'] = 'State is required';
        }

        $pincode = preg_replace('/\D/', '', (string) ($data['pincode'] ?? ''));
        if (strlen($pincode) !== 6) {
            $errors['pincode'] = 'Enter a valid 6-digit PIN code';
        }

        $phone = preg_replace('/\D/', '', (string) ($data['phone'] ?? ''));
        if ($phone !== '' && strlen($phone) < 10) {
            $errors['phone'] = 'Enter a valid 10-digit mobile number';
        }

        return $errors;
    }

    /** @return array<string, mixed> */
    public static function normalize(array $data): array
    {
        $phone = preg_replace('/\D/', '', (string) ($data['phone'] ?? ''));
        if (strlen($phone) > 10) {
            $phone = substr($phone, -10);
        }

        return [
            'label'    => trim((string) ($data['label'] ?? 'Home')) ?: 'Home',
            'name'     => trim((string) ($data['name'] ?? '')),
            'phone'    => $phone,
            'address'  => trim((string) ($data['address'] ?? '')),
            'landmark' => trim((string) ($data['landmark'] ?? '')),
            'city'     => trim((string) ($data['city'] ?? '')),
            'state'    => trim((string) ($data['state'] ?? '')),
            'pincode'  => preg_replace('/\D/', '', (string) ($data['pincode'] ?? '')),
        ];
    }

    /**
     * Ensure exactly one default address in the list.
     *
     * @param list<array<string, mixed>> $addresses
     * @return list<array<string, mixed>>
     */
    public static function ensureDefault(array $addresses): array
    {
        if ($addresses === []) {
            return [];
        }

        $hasDefault = false;
        foreach ($addresses as $addr) {
            if (!empty($addr['isDefault'])) {
                $hasDefault = true;
                break;
            }
        }

        if (!$hasDefault) {
            $addresses[0]['isDefault'] = true;
        }

        return $addresses;
    }
}
