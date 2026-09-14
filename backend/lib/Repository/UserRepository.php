<?php

declare(strict_types=1);

namespace Wellness\Repository;

use Wellness\Database;

/**
 * Customer accounts — backed by `users` + `user_addresses` tables.
 */
final class UserRepository extends MysqlRepository
{
    protected function tableName(): string { return 'users'; }

    protected function rowToArray(array $row): array
    {
        return array_merge($this->scalarFields($row), [
            'addresses' => $this->fetchAddresses($row['id']),
        ]);
    }

    private function scalarFields(array $row): array
    {
        return [
            'id'                 => $row['id'],
            'email'              => $row['email'],
            'name'               => $row['name'],
            'avatar'             => $row['avatar'],
            'passwordHash'       => $row['password_hash'],
            'phone'              => $row['phone'],
            'phoneVerified'      => $this->bool($row['phone_verified']),
            'phoneVerifiedAt'    => $this->toIso($row['phone_verified_at']),
            'emailVerified'      => $this->bool($row['email_verified']),
            'emailVerifiedAt'    => $this->toIso($row['email_verified_at']),
            'isBlocked'          => $this->bool($row['is_blocked']),
            'blockedAt'          => $this->toIso($row['blocked_at']),
            'createdAt'          => $this->toIso($row['created_at']),
            'lastLogin'          => $this->toIso($row['last_login']),
            'lastUsedAddressId'  => $row['last_used_address_id'],
        ];
    }

    protected function arrayToRow(array $data): array
    {
        $map = [
            'email'             => 'email',
            'name'              => 'name',
            'avatar'            => 'avatar',
            'passwordHash'      => 'password_hash',
            'phone'             => 'phone',
            'phoneVerified'     => 'phone_verified',
            'phoneVerifiedAt'   => 'phone_verified_at',
            'emailVerified'     => 'email_verified',
            'emailVerifiedAt'   => 'email_verified_at',
            'isBlocked'         => 'is_blocked',
            'blockedAt'         => 'blocked_at',
            'createdAt'         => 'created_at',
            'lastLogin'         => 'last_login',
            'lastUsedAddressId' => 'last_used_address_id',
        ];

        $row = [];
        foreach ($map as $php => $col) {
            if (!array_key_exists($php, $data)) {
                continue;
            }
            $v = $data[$php];
            if (in_array($col, ['phone_verified', 'email_verified', 'is_blocked'], true)) {
                $row[$col] = $v ? 1 : 0;
            } elseif (in_array($col, ['phone_verified_at', 'email_verified_at', 'blocked_at', 'created_at', 'last_login'], true)) {
                $row[$col] = $this->toDbDatetime($v);
            } else {
                $row[$col] = $v;
            }
        }
        return $row;
    }

    // -------------------------------------------------------------------------
    // Addresses
    // -------------------------------------------------------------------------

    private function fetchAddresses(string $userId): array
    {
        $stmt = $this->pdo()->prepare(
            'SELECT * FROM user_addresses WHERE user_id = ? ORDER BY is_default DESC, created_at ASC'
        );
        $stmt->execute([$userId]);
        return array_map([$this, 'addressRowToArray'], $stmt->fetchAll());
    }

    private function addressRowToArray(array $row): array
    {
        return [
            'id'        => $row['id'],
            'label'     => $row['label'],
            'name'      => $row['name'],
            'phone'     => $row['phone'],
            'address'   => $row['address'],
            'landmark'  => $row['landmark'],
            'city'      => $row['city'],
            'state'     => $row['state'],
            'pincode'   => $row['pincode'],
            'isDefault' => $this->bool($row['is_default']),
            'createdAt' => $this->toIso($row['created_at']),
        ];
    }

    public function addAddress(string $userId, array $addr): array
    {
        $id = $addr['id'] ?? Database::generateId('addr');
        $now = $addr['createdAt'] ?? gmdate('c');

        $this->pdo()->prepare(
            'INSERT INTO user_addresses
             (id, user_id, label, name, phone, address, landmark, city, state, pincode, is_default, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        )->execute([
            $id,
            $userId,
            $addr['label']    ?? 'Home',
            $addr['name']     ?? '',
            $addr['phone']    ?? '',
            $addr['address']  ?? '',
            $addr['landmark'] ?? null,
            $addr['city']     ?? '',
            $addr['state']    ?? '',
            $addr['pincode']  ?? '',
            $addr['isDefault'] ? 1 : 0,
            $this->toDbDatetime($now),
        ]);

        return array_merge($addr, ['id' => $id, 'createdAt' => $now]);
    }

    public function updateAddressData(string $userId, string $addressId, array $data): ?array
    {
        $stmt = $this->pdo()->prepare(
            'SELECT * FROM user_addresses WHERE id = ? AND user_id = ?'
        );
        $stmt->execute([$addressId, $userId]);
        $existing = $stmt->fetch();
        if (!$existing) {
            return null;
        }

        $this->pdo()->prepare(
            'UPDATE user_addresses
             SET label = ?, name = ?, phone = ?, address = ?, landmark = ?, city = ?, state = ?, pincode = ?, is_default = ?
             WHERE id = ? AND user_id = ?'
        )->execute([
            $data['label']    ?? $existing['label'],
            $data['name']     ?? $existing['name'],
            $data['phone']    ?? $existing['phone'],
            $data['address']  ?? $existing['address'],
            $data['landmark'] ?? $existing['landmark'],
            $data['city']     ?? $existing['city'],
            $data['state']    ?? $existing['state'],
            $data['pincode']  ?? $existing['pincode'],
            isset($data['isDefault']) ? ($data['isDefault'] ? 1 : 0) : $existing['is_default'],
            $addressId,
            $userId,
        ]);

        $stmt->execute([$addressId, $userId]);
        $updated = $stmt->fetch();
        return $updated ? $this->addressRowToArray($updated) : null;
    }

    public function removeAddress(string $userId, string $addressId): bool
    {
        $stmt = $this->pdo()->prepare(
            'DELETE FROM user_addresses WHERE id = ? AND user_id = ?'
        );
        $stmt->execute([$addressId, $userId]);
        return $stmt->rowCount() > 0;
    }

    public function setDefaultAddressForUser(string $userId, string $addressId): bool
    {
        $this->pdo()->prepare(
            'UPDATE user_addresses SET is_default = 0 WHERE user_id = ?'
        )->execute([$userId]);

        $stmt = $this->pdo()->prepare(
            'UPDATE user_addresses SET is_default = 1 WHERE id = ? AND user_id = ?'
        );
        $stmt->execute([$addressId, $userId]);
        return $stmt->rowCount() > 0;
    }

    public function countAddresses(string $userId): int
    {
        $stmt = $this->pdo()->prepare('SELECT COUNT(*) FROM user_addresses WHERE user_id = ?');
        $stmt->execute([$userId]);
        return (int) $stmt->fetchColumn();
    }

    public function setLastUsedAddress(string $userId, string $addressId): void
    {
        $this->pdo()->prepare(
            'UPDATE users SET last_used_address_id = ? WHERE id = ?'
        )->execute([$addressId, $userId]);
    }

    // -------------------------------------------------------------------------
    // Domain methods
    // -------------------------------------------------------------------------

    public function findByEmail(string $email): ?array
    {
        return $this->findOneBy('email', strtolower($email));
    }

    public function upsertByEmail(string $email, array $fields): array
    {
        $existing = $this->findByEmail($email);
        if (!$existing) {
            $data = array_merge(['id' => Database::generateId('user'), 'email' => $email], $fields);
            return $this->create($data);
        }
        $updated = $this->update($existing['id'], $fields);
        return $updated ?? $existing;
    }

    public function listAdminFiltered(array $filters = []): array
    {
        $sql    = 'SELECT * FROM users WHERE 1=1';
        $params = [];

        if (!empty($filters['search'])) {
            $q      = '%' . strtolower(trim((string) $filters['search'])) . '%';
            $sql   .= ' AND (LOWER(id) LIKE ? OR LOWER(email) LIKE ? OR LOWER(IFNULL(name,"")) LIKE ? OR LOWER(IFNULL(phone,"")) LIKE ?)';
            $params = array_merge($params, [$q, $q, $q, $q]);
        }

        if (isset($filters['phoneVerified']) && $filters['phoneVerified'] !== '') {
            $v      = in_array((string) $filters['phoneVerified'], ['1', 'true', 'yes'], true) ? 1 : 0;
            $sql   .= ' AND phone_verified = ?';
            $params[] = $v;
        }

        if (!empty($filters['from'])) {
            $from     = gmdate('Y-m-d H:i:s', strtotime((string) $filters['from']) ?: 0);
            $sql     .= ' AND created_at >= ?';
            $params[] = $from;
        }

        if (!empty($filters['to'])) {
            $to       = gmdate('Y-m-d H:i:s', strtotime((string) $filters['to'] . ' 23:59:59') ?: PHP_INT_MAX);
            $sql     .= ' AND created_at <= ?';
            $params[] = $to;
        }

        $sortMap = [
            'createdAt' => 'created_at',
            'lastLogin' => 'last_login',
            'email'     => 'email',
            'name'      => 'name',
        ];
        $sortCol = $sortMap[$filters['sort'] ?? 'createdAt'] ?? 'created_at';
        $dir     = strtolower((string) ($filters['order'] ?? 'desc')) === 'asc' ? 'ASC' : 'DESC';
        $sql    .= " ORDER BY {$sortCol} {$dir}";

        $stmt = $this->pdo()->prepare($sql);
        $stmt->execute($params);
        // The admin user list table never renders per-user addresses, so skip
        // the N extra address queries entirely here (not just batch them) —
        // full detail (with addresses) is still available via getById().
        return array_map(fn($row) => array_merge($this->scalarFields($row), ['addresses' => []]), $stmt->fetchAll());
    }

    public function setBlocked(string $id, bool $blocked): ?array
    {
        $changes = $blocked
            ? ['isBlocked' => true,  'blockedAt' => gmdate('c')]
            : ['isBlocked' => false, 'blockedAt' => null];
        return $this->update($id, $changes);
    }

    public function isBlocked(string $id): bool
    {
        $stmt = $this->pdo()->prepare('SELECT is_blocked FROM users WHERE id = ?');
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        return $row ? $this->bool($row['is_blocked']) : false;
    }
}
