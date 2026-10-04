import { BaseRepository } from './base.js';

export class CategoryRepository extends BaseRepository {
    tableName() { return 'categories'; }

    rowToArray(row) {
        return {
            id: row.id,
            slug: row.slug,
            label: row.label,
            description: row.description,
            image: row.image,
            isPublished: this.bool(row.is_published),
            order: Number(row.sort_order),
        };
    }

    arrayToRow(data) {
        const row = {};
        const map = {
            slug: { col: 'slug', type: 'string' },
            label: { col: 'label', type: 'string' },
            description: { col: 'description', type: 'string' },
            image: { col: 'image', type: 'string' },
            isPublished: { col: 'is_published', type: 'bool' },
            order: { col: 'sort_order', type: 'int' },
        };
        for (const [key, meta] of Object.entries(map)) {
            if (!(key in data)) continue;
            const v = data[key];
            row[meta.col] = meta.type === 'bool' ? (v ? 1 : 0) : meta.type === 'int' ? Number.parseInt(v, 10) : v;
        }
        return row;
    }

    /** Published categories with at least one published product — mirrors CategoryRepository::getPublished(). */
    async getPublished() {
        const [rows] = await this.pool().query(
            `SELECT c.* FROM categories c
             WHERE c.is_published = 1
               AND EXISTS (SELECT 1 FROM products p WHERE p.category_id = c.id AND p.is_published = 1)
             ORDER BY c.sort_order ASC`,
        );
        return rows.map((r) => this.rowToArray(r));
    }

    async findBySlug(slug) {
        return this.findOneBy('slug', slug);
    }

    async getAllWithProductCount() {
        const [rows] = await this.pool().query(
            `SELECT c.*, COUNT(p.id) AS product_count
             FROM categories c
             LEFT JOIN products p ON p.category_id = c.id
             GROUP BY c.id
             ORDER BY c.sort_order ASC`,
        );
        return rows.map((r) => ({ ...this.rowToArray(r), productCount: Number(r.product_count) }));
    }

    async countProducts(categoryId) {
        const [rows] = await this.pool().query('SELECT COUNT(*) AS count FROM products WHERE category_id = ?', [categoryId]);
        return Number(rows[0].count);
    }
}
