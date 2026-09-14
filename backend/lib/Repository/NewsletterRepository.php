<?php

declare(strict_types=1);

namespace Wellness\Repository;

final class NewsletterRepository extends MysqlRepository
{
    protected function tableName(): string { return 'newsletter_subscribers'; }

    protected function rowToArray(array $row): array
    {
        return [
            'id'        => $row['id'],
            'email'     => $row['email'],
            'source'    => $row['source'],
            'createdAt' => $this->toIso($row['created_at']),
        ];
    }

    protected function arrayToRow(array $data): array
    {
        $map = [
            'email'     => ['col' => 'email',      'type' => 'string'],
            'source'    => ['col' => 'source',     'type' => 'string'],
            'createdAt' => ['col' => 'created_at', 'type' => 'datetime'],
        ];
        $row = [];
        foreach ($map as $php => $meta) {
            if (!array_key_exists($php, $data)) {
                continue;
            }
            $v = $data[$php];
            $row[$meta['col']] = match($meta['type']) {
                'datetime' => $this->toDbDatetime($v),
                default    => $v,
            };
        }
        return $row;
    }

    public function findByEmail(string $email): ?array
    {
        $stmt = $this->pdo()->prepare('SELECT * FROM newsletter_subscribers WHERE email = ? LIMIT 1');
        $stmt->execute([strtolower(trim($email))]);
        $row = $stmt->fetch();
        return $row ? $this->rowToArray($row) : null;
    }
}
