<?php

declare(strict_types=1);

namespace Krivea\Repository;

use Krivea\Database;

/**
 * Catalog of files uploaded through the admin panel (media_library table).
 * Files themselves stay on disk in backend/uploads/ — this only indexes them
 * for the admin Media Library screen (browse, search, delete, reuse a URL).
 */
final class MediaRepository
{
    private function pdo(): \PDO
    {
        return Database::pdo();
    }

    public function list(): array
    {
        $stmt = $this->pdo()->query('SELECT * FROM media_library ORDER BY created_at DESC');
        return array_map([$this, 'rowToArray'], $stmt->fetchAll());
    }

    public function record(string $url, string $filename, ?string $mimeType, ?int $sizeBytes, string $uploadedBy = 'admin'): array
    {
        $stmt = $this->pdo()->prepare(
            'INSERT INTO media_library (url, filename, mime_type, size_bytes, alt_text, uploaded_by, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE filename = VALUES(filename)'
        );
        $now = gmdate('Y-m-d H:i:s');
        $stmt->execute([$url, $filename, $mimeType, $sizeBytes, '', $uploadedBy, $now]);

        $row = $this->pdo()->prepare('SELECT * FROM media_library WHERE url = ? LIMIT 1');
        $row->execute([$url]);
        $found = $row->fetch();
        return $found ? $this->rowToArray($found) : [];
    }

    public function findById(int $id): ?array
    {
        $stmt = $this->pdo()->prepare('SELECT * FROM media_library WHERE id = ? LIMIT 1');
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        return $row ? $this->rowToArray($row) : null;
    }

    public function delete(int $id): bool
    {
        $stmt = $this->pdo()->prepare('DELETE FROM media_library WHERE id = ?');
        $stmt->execute([$id]);
        return $stmt->rowCount() > 0;
    }

    private function rowToArray(array $row): array
    {
        return [
            'id'         => (int) $row['id'],
            'url'        => $row['url'],
            'filename'   => $row['filename'],
            'mimeType'   => $row['mime_type'],
            'sizeBytes'  => $row['size_bytes'] !== null ? (int) $row['size_bytes'] : null,
            'width'      => $row['width'] !== null ? (int) $row['width'] : null,
            'height'     => $row['height'] !== null ? (int) $row['height'] : null,
            'altText'    => $row['alt_text'],
            'uploadedBy' => $row['uploaded_by'],
            'createdAt'  => $row['created_at'],
        ];
    }
}
