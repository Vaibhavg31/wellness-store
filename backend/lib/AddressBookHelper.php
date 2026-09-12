<?php

declare(strict_types=1);

namespace Krivea;

use Krivea\Repository\UserRepository;

/**
 * Saved address book — max 3 per user, tracks last-used for checkout prefill.
 * Phone OTP verification is not required; only field validation applies.
 */
final class AddressBookHelper
{
    public const MAX_ADDRESSES = 3;

    /**
     * After checkout: mark selected/matching address as last used; auto-save new address when under limit.
     *
     * @param array<string, mixed> $shipping
     * @param array<string, mixed> $addressBook selectedId?, address?, landmark?
     */
    public static function syncFromCheckout(string $userId, array $shipping, array $addressBook): void
    {
        $repo = new UserRepository();
        $user = $repo->getById($userId);
        if (!$user) {
            return;
        }

        $addresses = $user['addresses'] ?? [];
        $selectedId = trim((string) ($addressBook['selectedId'] ?? ''));

        if ($selectedId !== '') {
            foreach ($addresses as $addr) {
                if (($addr['id'] ?? '') === $selectedId) {
                    $repo->setLastUsedAddress($userId, $selectedId);
                    return;
                }
            }
        }

        $street = trim((string) ($addressBook['address'] ?? ''));
        if ($street === '') {
            $street = trim((string) ($shipping['address'] ?? ''));
        }

        $payload = [
            'label'    => 'Home',
            'name'     => trim((string) ($shipping['name'] ?? '')),
            'phone'    => trim((string) ($shipping['phone'] ?? '')),
            'address'  => $street,
            'landmark' => trim((string) ($addressBook['landmark'] ?? $shipping['landmark'] ?? '')),
            'city'     => trim((string) ($shipping['city'] ?? '')),
            'state'    => trim((string) ($shipping['state'] ?? '')),
            'pincode'  => trim((string) ($shipping['pincode'] ?? '')),
        ];

        $normalized = AddressHelper::normalize($payload);
        $errors = AddressHelper::validate($normalized);
        if ($errors !== []) {
            return;
        }

        $matchId = self::findMatchingId($addresses, $normalized);

        if ($matchId !== null) {
            $repo->setLastUsedAddress($userId, $matchId);
        } elseif (count($addresses) < self::MAX_ADDRESSES) {
            $newAddr = $repo->addAddress($userId, array_merge($normalized, [
                'isDefault' => $addresses === [],
            ]));
            $repo->setLastUsedAddress($userId, (string) ($newAddr['id'] ?? ''));
        }
    }

    public static function setLastUsed(string $userId, string $addressId): void
    {
        $repo = new UserRepository();
        $user = $repo->getById($userId);
        if (!$user) {
            return;
        }
        foreach ($user['addresses'] ?? [] as $addr) {
            if (($addr['id'] ?? '') === $addressId) {
                $repo->setLastUsedAddress($userId, $addressId);
                return;
            }
        }
    }

    /**
     * @param list<array<string, mixed>> $addresses
     */
    public static function findMatchingId(array $addresses, array $normalized): ?string
    {
        foreach ($addresses as $addr) {
            if (self::isSameLocation($addr, $normalized)) {
                $id = (string) ($addr['id'] ?? '');
                return $id !== '' ? $id : null;
            }
        }

        return null;
    }

    /** @param array<string, mixed> $a @param array<string, mixed> $b */
    public static function isSameLocation(array $a, array $b): bool
    {
        $pinA = preg_replace('/\D/', '', (string) ($a['pincode'] ?? ''));
        $pinB = preg_replace('/\D/', '', (string) ($b['pincode'] ?? ''));

        return $pinA === $pinB
            && self::normText($a['city'] ?? '') === self::normText($b['city'] ?? '')
            && self::normText($a['state'] ?? '') === self::normText($b['state'] ?? '')
            && self::normStreet($a) === self::normStreet($b);
    }

  /** @param array<string, mixed> $addr */
    private static function normStreet(array $addr): string
    {
        return self::normText((string) ($addr['address'] ?? ''));
    }

    private static function normText(string $value): string
    {
        return strtolower(preg_replace('/\s+/', ' ', trim($value)) ?? '');
    }
}
