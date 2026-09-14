<?php

declare(strict_types=1);

namespace Wellness\Repository;

use Wellness\Database;

/**
 * MySQL PDO base repository — replaces JsonRepository.
 *
 * Subclasses must implement:
 *   - tableName(): string        — the DB table
 *   - rowToArray(array $row): array — map snake_case DB columns → camelCase PHP array
 *   - arrayToRow(array $data): array — map camelCase PHP array → snake_case DB columns (for insert/update)
 */
abstract class MysqlRepository implements RepositoryInterface
{
    abstract protected function tableName(): string;

    /** Convert a DB row (snake_case) to the camelCase format the routes expect. */
    abstract protected function rowToArray(array $row): array;

    /** Convert a camelCase PHP array to DB column names for INSERT/UPDATE. Exclude id. */
    abstract protected function arrayToRow(array $data): array;

    protected function pdo(): \PDO
    {
        return Database::pdo();
    }

    public function getAll(): array
    {
        $stmt = $this->pdo()->query('SELECT * FROM `' . $this->tableName() . '`');
        $rows = $stmt->fetchAll();
        return array_map([$this, 'rowToArray'], $rows);
    }

    public function getById(string $id): ?array
    {
        $stmt = $this->pdo()->prepare('SELECT * FROM `' . $this->tableName() . '` WHERE id = ?');
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        return $row ? $this->rowToArray($row) : null;
    }

    public function create(array $data): array
    {
        $row = $this->arrayToRow($data);
        // include id
        if (isset($data['id'])) {
            $row['id'] = $data['id'];
        }

        $cols   = implode(', ', array_map(fn($c) => "`{$c}`", array_keys($row)));
        $places = implode(', ', array_fill(0, count($row), '?'));
        $sql    = "INSERT INTO `{$this->tableName()}` ({$cols}) VALUES ({$places})";

        $this->pdo()->prepare($sql)->execute(array_values($row));
        return $data;
    }

    public function update(string $id, array $changes): ?array
    {
        $existing = $this->getById($id);
        if (!$existing) {
            return null;
        }

        $row = $this->arrayToRow($changes);
        if (empty($row)) {
            return $existing;
        }

        $sets = implode(', ', array_map(fn($c) => "`{$c}` = ?", array_keys($row)));
        $sql  = "UPDATE `{$this->tableName()}` SET {$sets} WHERE id = ?";
        $this->pdo()->prepare($sql)->execute([...array_values($row), $id]);

        return $this->getById($id);
    }

    public function delete(string $id): bool
    {
        $stmt = $this->pdo()->prepare('DELETE FROM `' . $this->tableName() . '` WHERE id = ?');
        $stmt->execute([$id]);
        return $stmt->rowCount() > 0;
    }

    /** Return all records where $field = $value. */
    public function findBy(string $dbCol, mixed $value): array
    {
        $stmt = $this->pdo()->prepare(
            'SELECT * FROM `' . $this->tableName() . '` WHERE `' . $dbCol . '` = ?'
        );
        $stmt->execute([$value]);
        return array_map([$this, 'rowToArray'], $stmt->fetchAll());
    }

    /** Return first record where $field = $value, or null. */
    public function findOneBy(string $dbCol, mixed $value): ?array
    {
        $stmt = $this->pdo()->prepare(
            'SELECT * FROM `' . $this->tableName() . '` WHERE `' . $dbCol . '` = ? LIMIT 1'
        );
        $stmt->execute([$value]);
        $row = $stmt->fetch();
        return $row ? $this->rowToArray($row) : null;
    }

    /** Convert a nullable ISO-8601 string to MySQL DATETIME(6) or null. */
    protected function toDbDatetime(?string $iso): ?string
    {
        if ($iso === null || $iso === '') {
            return null;
        }
        $ts = strtotime($iso);
        return $ts !== false ? gmdate('Y-m-d H:i:s', $ts) : null;
    }

    /** Convert a MySQL DATETIME(6) string back to ISO-8601, or null. */
    protected function toIso(?string $dt): ?string
    {
        if ($dt === null || $dt === '') {
            return null;
        }
        $ts = strtotime($dt);
        return $ts !== false ? gmdate('c', $ts) : null;
    }

    protected function bool(mixed $v): bool
    {
        return (bool) $v;
    }

    protected function intOrNull(mixed $v): ?int
    {
        return $v === null ? null : (int) $v;
    }

    protected function floatOrNull(mixed $v): ?float
    {
        return $v === null ? null : (float) $v;
    }
}
