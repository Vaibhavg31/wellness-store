<?php

declare(strict_types=1);

namespace Krivea\Routes;

use Krivea\AddressBookHelper;
use Krivea\AddressHelper;
use Krivea\Auth;
use Krivea\ExportHelper;
use Krivea\OrderRevenue;
use Krivea\Repository\OrderRepository;
use Krivea\Repository\UserRepository;
use Krivea\Request;
use Krivea\Response;

final class UserRoutes
{
    private static function userRepo(): UserRepository
    {
        static $repo = null;
        $repo ??= new UserRepository();
        return $repo;
    }

    private static function orderRepo(): OrderRepository
    {
        static $repo = null;
        $repo ??= new OrderRepository();
        return $repo;
    }


    public static function listAddresses(): void
    {
        $payload = Auth::requireCustomer();
        $user = self::userRepo()->getById((string) $payload['userId']);
        if (!$user) {
            Response::error('User not found', 404);
        }
        Response::json($user['addresses'] ?? []);
    }

    public static function createAddress(): void
    {
        $payload    = Auth::requireCustomer();
        $body       = Request::body();
        $normalized = AddressHelper::normalize($body);
        $errors     = AddressHelper::validate($normalized);
        if ($errors !== []) {
            Response::error(implode(' ', $errors), 400);
        }

        $userId = (string) $payload['userId'];
        $user   = self::userRepo()->getById($userId);
        if (!$user) {
            Response::error('User not found', 404);
        }

        $addresses = $user['addresses'] ?? [];
        if (count($addresses) >= AddressBookHelper::MAX_ADDRESSES) {
            Response::error('Maximum ' . AddressBookHelper::MAX_ADDRESSES . ' saved addresses allowed', 400);
        }

        $isFirst   = $addresses === [];
        $isDefault = $isFirst || !empty($body['isDefault']);

        if ($isDefault && !$isFirst) {
            self::userRepo()->setDefaultAddressForUser($userId, ''); // clear existing defaults
        }

        $newAddr = self::userRepo()->addAddress($userId, array_merge($normalized, [
            'isDefault' => $isDefault,
        ]));

        if ($isDefault) {
            self::userRepo()->setDefaultAddressForUser($userId, $newAddr['id']);
        }

        self::userRepo()->setLastUsedAddress($userId, $newAddr['id']);

        Response::json($newAddr, 201);
    }

    public static function updateAddress(string $addressId): void
    {
        $payload    = Auth::requireCustomer();
        $body       = Request::body();
        $normalized = AddressHelper::normalize($body);
        $errors     = AddressHelper::validate($normalized);
        if ($errors !== []) {
            Response::error(implode(' ', $errors), 400);
        }

        $userId = (string) $payload['userId'];

        if (!empty($body['isDefault'])) {
            self::userRepo()->setDefaultAddressForUser($userId, $addressId);
        }

        $updated = self::userRepo()->updateAddressData($userId, $addressId, array_merge($normalized, [
            'isDefault' => !empty($body['isDefault']),
        ]));

        if (!$updated) {
            Response::error('Address not found', 404);
        }

        Response::json($updated);
    }

    public static function deleteAddress(string $addressId): void
    {
        $payload = Auth::requireCustomer();
        $userId  = (string) $payload['userId'];

        $user = self::userRepo()->getById($userId);
        if (!$user) {
            Response::error('User not found', 404);
        }

        $removed = self::userRepo()->removeAddress($userId, $addressId);
        if (!$removed) {
            Response::error('Address not found', 404);
        }

        // If the deleted address was the last-used, clear it
        if (($user['lastUsedAddressId'] ?? '') === $addressId) {
            $remaining = self::userRepo()->getById($userId)['addresses'] ?? [];
            self::userRepo()->setLastUsedAddress($userId, $remaining[0]['id'] ?? '');
        }

        Response::json(['success' => true]);
    }

    public static function setDefaultAddress(string $addressId): void
    {
        $payload = Auth::requireCustomer();
        $userId  = (string) $payload['userId'];

        $ok = self::userRepo()->setDefaultAddressForUser($userId, $addressId);
        if (!$ok) {
            Response::error('Address not found', 404);
        }

        $user = self::userRepo()->getById($userId);
        Response::json($user['addresses'] ?? []);
    }

    private static function enrichUser(array $user): array
    {
        $userId = (string) ($user['id'] ?? '');
        $email = (string) ($user['email'] ?? '');
        $stats = self::orderRepo()->computeStatsForUser($userId, $email);
        $orders = self::orderRepo()->getForUser($userId, $email);
        $revenue = OrderRevenue::sum($orders);

        return self::sanitizeUser(array_merge($user, [
            'orderCount' => $stats['orderCount'],
            'totalSpent' => $stats['totalSpent'],
            'revenue' => $revenue,
            'deliveredCount' => $stats['deliveredCount'],
            'lastOrderAt' => $stats['lastOrderAt'],
        ]));
    }

    /** @return array<string, mixed> */
    private static function sanitizeUser(array $user): array
    {
        unset($user['passwordHash']);
        return $user;
    }

    /**
     * Orders whose email does not belong to any registered account (e.g. deleted users).
     *
     * @return list<array<string, mixed>>
     */
    private static function guestCustomersFromOrders(): array
    {
        $registeredEmails = [];
        foreach (self::userRepo()->getAll() as $user) {
            $email = strtolower(trim((string) ($user['email'] ?? '')));
            if ($email !== '') {
                $registeredEmails[$email] = true;
            }
        }

        $guests = [];
        foreach (self::orderRepo()->getAll() as $order) {
            $email = strtolower(trim((string) ($order['email'] ?? '')));
            if ($email === '' || isset($registeredEmails[$email])) {
                continue;
            }

            if (!isset($guests[$email])) {
                $shipping = is_array($order['shipping'] ?? null) ? $order['shipping'] : [];
                $guests[$email] = [
                    'id' => 'guest-' . substr(md5($email), 0, 12),
                    'email' => $order['email'],
                    'name' => $shipping['name'] ?? 'Guest customer',
                    'avatar' => null,
                    'phone' => $shipping['phone'] ?? null,
                    'phoneVerified' => false,
                    'createdAt' => $order['createdAt'] ?? null,
                    'lastLogin' => null,
                    'isGuest' => true,
                    'isBlocked' => false,
                ];
            }
        }

        return array_values(array_map(
            fn($guest) => self::enrichUser($guest),
            $guests,
        ));
    }

    private static function filtersFromQuery(): array
    {
        return [
            'search' => $_GET['search'] ?? '',
            'from' => $_GET['from'] ?? '',
            'to' => $_GET['to'] ?? '',
            'phoneVerified' => $_GET['phoneVerified'] ?? '',
            'blocked' => $_GET['blocked'] ?? '',
            'sort' => $_GET['sort'] ?? 'createdAt',
            'order' => $_GET['order'] ?? 'desc',
        ];
    }

    /** @param list<array<string, mixed>> $users */
    private static function applyBlockedFilter(array $users, array $filters): array
    {
        if (($filters['blocked'] ?? '') === '') {
            return $users;
        }

        $wantBlocked = in_array((string) $filters['blocked'], ['1', 'true', 'yes'], true);
        return array_values(array_filter(
            $users,
            fn($user) => !empty($user['isBlocked']) === $wantBlocked,
        ));
    }

    /** @param list<array<string, mixed>> $users */
    private static function sortUsers(array $users, array $filters): array
    {
        $sort = (string) ($filters['sort'] ?? 'createdAt');
        $order = strtolower((string) ($filters['order'] ?? 'desc')) === 'asc' ? 1 : -1;

        if (!in_array($sort, ['orderCount', 'totalSpent', 'createdAt', 'lastLogin'], true)) {
            return $users;
        }

        usort($users, function ($a, $b) use ($sort, $order) {
            $va = $a[$sort] ?? '';
            $vb = $b[$sort] ?? '';
            if ($sort === 'orderCount' || $sort === 'totalSpent') {
                $va = (float) $va;
                $vb = (float) $vb;
            }
            if ($va === $vb) {
                return 0;
            }
            return ($va < $vb ? -1 : 1) * $order;
        });

        return $users;
    }

    public static function listAdmin(): void
    {
        Auth::requireAdmin();
        try {
            $filters = self::filtersFromQuery();
            $users = self::userRepo()->listAdminFiltered($filters);
            $enriched = array_map(fn($user) => self::enrichUser($user), $users);

            if (($filters['phoneVerified'] ?? '') === '' && ($filters['from'] ?? '') === '' && ($filters['to'] ?? '') === '') {
                $enriched = array_merge($enriched, self::guestCustomersFromOrders());
            }

            $enriched = self::applyBlockedFilter($enriched, $filters);
            $enriched = self::sortUsers($enriched, $filters);

            Response::json($enriched);
        } catch (\Exception) {
            Response::error('Failed to fetch users', 500);
        }
    }

    public static function getOneAdmin(string $id): void
    {
        Auth::requireAdmin();
        try {
            if (str_starts_with($id, 'guest-')) {
                $guests = self::guestCustomersFromOrders();
                $guest = null;
                foreach ($guests as $g) {
                    if (($g['id'] ?? '') === $id) {
                        $guest = $g;
                        break;
                    }
                }
                if (!$guest) {
                    Response::error('Guest customer not found', 404);
                }

                $orders = self::orderRepo()->getForUser('', (string) $guest['email']);
                Response::json([
                    'user' => $guest,
                    'orders' => $orders,
                ]);
            }

            $user = self::userRepo()->getById($id);
            if (!$user) {
                Response::error('User not found', 404);
            }

            $enriched = self::enrichUser($user);
            $orders = self::orderRepo()->getForUser($id, (string) ($user['email'] ?? ''));

            Response::json([
                'user' => $enriched,
                'orders' => $orders,
            ]);
        } catch (\Exception) {
            Response::error('Failed to fetch user', 500);
        }
    }

    public static function setBlocked(string $id): void
    {
        Auth::requireAdmin();
        try {
            if (str_starts_with($id, 'guest-')) {
                Response::error('Guest customers cannot be blocked. Create a block-by-email rule if needed.', 400);
            }

            $user = self::userRepo()->getById($id);
            if (!$user) {
                Response::error('User not found', 404);
            }

            $body = Request::body();
            $blocked = !empty($body['blocked']);
            $updated = self::userRepo()->setBlocked($id, $blocked);
            if (!$updated) {
                Response::error('Failed to update user', 500);
            }

            Response::json(self::enrichUser($updated));
        } catch (\Exception) {
            Response::error('Failed to update user', 500);
        }
    }

    public static function setPhone(string $id): void
    {
        Auth::requireAdmin();
        try {
            if (str_starts_with($id, 'guest-')) {
                Response::error('Guest customers do not have an account to update.', 400);
            }

            $user = self::userRepo()->getById($id);
            if (!$user) {
                Response::error('User not found', 404);
            }

            $body  = Request::body();
            $phone = preg_replace('/\D/', '', (string) ($body['phone'] ?? ''));
            if (strlen($phone) !== 10) {
                Response::error('Enter a valid 10-digit mobile number', 400);
            }

            $updated = self::userRepo()->update($id, [
                'phone'           => $phone,
                'phoneVerified'   => true,
                'phoneVerifiedAt' => gmdate('c'),
            ]);
            if (!$updated) {
                Response::error('Failed to update phone number', 500);
            }

            Response::json(self::enrichUser($updated));
        } catch (\Exception) {
            Response::error('Failed to update phone number', 500);
        }
    }

    public static function exportAdmin(): void
    {
        Auth::requireAdmin();
        try {
            $filters = self::filtersFromQuery();
            $users = self::userRepo()->listAdminFiltered($filters);
            $enriched = array_map(fn($user) => self::enrichUser($user), $users);

            if (($filters['phoneVerified'] ?? '') === '' && ($filters['from'] ?? '') === '' && ($filters['to'] ?? '') === '') {
                $enriched = array_merge($enriched, self::guestCustomersFromOrders());
            }

            $format = strtolower((string) ($_GET['format'] ?? 'csv'));
            if ($format !== 'csv' && $format !== 'pdf') {
                Response::error('Invalid export format. Use csv or pdf.', 400);
            }

            $headers = [
                'User ID',
                'Name',
                'Email',
                'Phone',
                'Phone Verified',
                'Phone Verified At',
                'Joined',
                'Last Login',
                'Blocked',
                'Order Count',
                'Total Spent',
                'Revenue',
                'Delivered Orders',
                'Last Order At',
                'Guest',
            ];

            $rows = [];
            foreach ($enriched as $user) {
                $rows[] = [
                    $user['id'] ?? '',
                    $user['name'] ?? '',
                    $user['email'] ?? '',
                    $user['phone'] ?? '',
                    !empty($user['phoneVerified']) ? 'Yes' : 'No',
                    $user['phoneVerifiedAt'] ?? '',
                    $user['createdAt'] ?? '',
                    $user['lastLogin'] ?? '',
                    !empty($user['isBlocked']) ? 'Yes' : 'No',
                    (string) ($user['orderCount'] ?? 0),
                    (string) ($user['totalSpent'] ?? 0),
                    (string) ($user['revenue'] ?? 0),
                    (string) ($user['deliveredCount'] ?? 0),
                    $user['lastOrderAt'] ?? '',
                    !empty($user['isGuest']) ? 'Yes' : 'No',
                ];
            }

            $from = $filters['from'] ? $filters['from'] : 'all';
            $to = $filters['to'] ? $filters['to'] : 'all';
            $baseName = "wellness-users-{$from}-to-{$to}";

            if ($format === 'pdf') {
                ExportHelper::exportTablePdf("{$baseName}.pdf", 'Users Export', $headers, $rows);
            }

            Response::csv("{$baseName}.csv", $headers, $rows);
        } catch (\Exception) {
            Response::error('Failed to export users', 500);
        }
    }
}
