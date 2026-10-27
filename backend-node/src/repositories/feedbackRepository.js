import { BaseRepository } from './base.js';

export class FeedbackRepository extends BaseRepository {
    tableName() { return 'feedback'; }

    rowToArray(row) {
        return {
            id: row.id,
            name: row.name,
            email: row.email,
            message: row.message,
            isRead: this.bool(row.is_read),
            createdAt: this.toIso(row.created_at),
        };
    }

    arrayToRow(data) {
        const map = {
            name: { col: 'name', type: 'string' },
            email: { col: 'email', type: 'string' },
            message: { col: 'message', type: 'string' },
            isRead: { col: 'is_read', type: 'bool' },
            createdAt: { col: 'created_at', type: 'datetime' },
        };
        const row = {};
        for (const [key, meta] of Object.entries(map)) {
            if (!(key in data)) continue;
            const v = data[key];
            row[meta.col] = meta.type === 'bool' ? (v ? 1 : 0) : meta.type === 'datetime' ? this.toDbDatetime(v) : v;
        }
        return row;
    }

    async markRead(id) { return this.update(id, { isRead: true }); }
}
