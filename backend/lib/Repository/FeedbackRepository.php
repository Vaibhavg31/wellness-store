<?php

declare(strict_types=1);

namespace Wellness\Repository;

final class FeedbackRepository extends MysqlRepository
{
    protected function tableName(): string { return 'feedback'; }

    protected function rowToArray(array $row): array
    {
        return [
            'id'        => $row['id'],
            'name'      => $row['name'],
            'email'     => $row['email'],
            'message'   => $row['message'],
            'isRead'    => $this->bool($row['is_read']),
            'createdAt' => $this->toIso($row['created_at']),
        ];
    }

    protected function arrayToRow(array $data): array
    {
        $map = [
            'name'      => ['col' => 'name',       'type' => 'string'],
            'email'     => ['col' => 'email',      'type' => 'string'],
            'message'   => ['col' => 'message',    'type' => 'string'],
            'isRead'    => ['col' => 'is_read',    'type' => 'bool'],
            'createdAt' => ['col' => 'created_at', 'type' => 'datetime'],
        ];
        $row = [];
        foreach ($map as $php => $meta) {
            if (!array_key_exists($php, $data)) {
                continue;
            }
            $v = $data[$php];
            $row[$meta['col']] = match($meta['type']) {
                'bool'     => $v ? 1 : 0,
                'datetime' => $this->toDbDatetime($v),
                default    => $v,
            };
        }
        return $row;
    }

    public function markRead(string $id): ?array
    {
        return $this->update($id, ['isRead' => true]);
    }
}
