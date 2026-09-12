<?php

declare(strict_types=1);

namespace Krivea\Repository;

/**
 * Generic CRUD contract for all data repositories.
 *
 * Concrete implementations today use JSON files via JsonRepository.
 * Swapping to MySQL later means replacing only the class that extends
 * JsonRepository — route classes and the React frontend stay untouched.
 *
 * @template T of array<string, mixed>
 */
interface RepositoryInterface
{
    /** Return all records. */
    public function getAll(): array;

    /** Return one record by primary-key string, or null when not found. */
    public function getById(string $id): ?array;

    /** Persist a new record (id must already be set on $data). */
    public function create(array $data): array;

    /** Merge $changes into an existing record; return the updated record. */
    public function update(string $id, array $changes): ?array;

    /** Remove a record by id; return true on success, false when not found. */
    public function delete(string $id): bool;
}
