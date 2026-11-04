import { getPool } from './db.js';

/**
 * Schema changes made after the first launch. Every step is safe to run again: tables use IF NOT EXISTS and a column is
 * only added when it is missing (MySQL 8 has no "ADD COLUMN IF NOT EXISTS"), so this runs at every start-up on a fresh
 * database, on the local MariaDB and on the production MySQL alike. database/chikit.sql carries the same shapes for new installs.
 */

async function hasColumn(pool, table, column) {
    const [rows] = await pool.query(
        'SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ? LIMIT 1',
        [table, column],
    );
    return rows.length > 0;
}

async function hasIndex(pool, table, index) {
    const [rows] = await pool.query(
        'SELECT 1 FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ? LIMIT 1',
        [table, index],
    );
    return rows.length > 0;
}

async function addColumn(pool, table, column, definition) {
    if (!(await hasColumn(pool, table, column))) await pool.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`);
}

const TABLES = [
    // Offer pages: "Pick any 3 for ₹1499", "Buy 1 Get 1 Free" and any collection the admin adds later.
    `CREATE TABLE IF NOT EXISTS offers (
        id VARCHAR(64) NOT NULL,
        slug VARCHAR(80) NOT NULL,
        title VARCHAR(160) NOT NULL,
        kind ENUM('mix_match','bogo','collection') NOT NULL DEFAULT 'collection',
        summary VARCHAR(255) NOT NULL DEFAULT '',
        description TEXT NULL,
        image VARCHAR(500) NULL,
        mobile_image VARCHAR(500) NULL,
        price DECIMAL(10,2) NOT NULL DEFAULT 0,
        pick_count INT NOT NULL DEFAULT 3,
        all_products TINYINT(1) NOT NULL DEFAULT 0,
        is_enabled TINYINT(1) NOT NULL DEFAULT 1,
        sort_order INT NOT NULL DEFAULT 0,
        starts_at DATETIME NULL,
        ends_at DATETIME NULL,
        created_at DATETIME(6) NOT NULL,
        updated_at DATETIME(6) NULL,
        PRIMARY KEY (id),
        UNIQUE KEY uq_offers_slug (slug)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    `CREATE TABLE IF NOT EXISTS offer_products (
        offer_id VARCHAR(64) NOT NULL,
        product_id VARCHAR(64) NOT NULL,
        sort_order INT NOT NULL DEFAULT 0,
        PRIMARY KEY (offer_id, product_id),
        KEY idx_offer_products_product (product_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    // One-time codes e-mailed to confirm an address when joining the Chikit Club.
    `CREATE TABLE IF NOT EXISTS club_email_otps (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        user_id VARCHAR(64) NOT NULL,
        email VARCHAR(255) NOT NULL,
        code_hash CHAR(64) NOT NULL,
        attempts INT NOT NULL DEFAULT 0,
        expires_at DATETIME NOT NULL,
        created_at DATETIME NOT NULL,
        PRIMARY KEY (id),
        KEY idx_club_email_otps_user (user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    // Admin panel logins the shop manages itself (see lib/adminAccounts.js); super admins stay in the server config.
    `CREATE TABLE IF NOT EXISTS admin_accounts (
        id VARCHAR(64) NOT NULL,
        email VARCHAR(255) NOT NULL,
        name VARCHAR(120) NOT NULL DEFAULT '',
        password_hash VARCHAR(100) NOT NULL,
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        token_version INT NOT NULL DEFAULT 1,
        created_at DATETIME(3) NOT NULL,
        updated_at DATETIME(3) NULL,
        last_login_at DATETIME(3) NULL,
        PRIMARY KEY (id),
        UNIQUE KEY uq_admin_accounts_email (email)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    // Every admin sign-in attempt, shown to super admins (kept 180 days).
    `CREATE TABLE IF NOT EXISTS admin_login_log (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        email VARCHAR(255) NOT NULL,
        ok TINYINT(1) NOT NULL,
        ip VARCHAR(64) NOT NULL DEFAULT '',
        via VARCHAR(20) NOT NULL DEFAULT '',
        created_at DATETIME(3) NOT NULL,
        PRIMARY KEY (id),
        KEY idx_admin_login_log_created (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
];

const COLUMNS = [
    // Product extras kept as one JSON value: { concerns: [slug], videos: [{ url, poster, title }], infoBanners: [{ image, alt }], clubEligible, clubPrice }
    ['products', 'extras_json', 'LONGTEXT NULL'],
    // Pack options: how many bottles/packs a variant holds (drawn as that many bottles) and its own member price.
    ['product_variants', 'units', 'INT NOT NULL DEFAULT 1'],
    ['product_variants', 'club_price', 'DECIMAL(10,2) NULL'],
    ['product_variants', 'tag', 'VARCHAR(40) NULL'], // the little ribbon on a pack option, e.g. "Super Saver"
    // Chikit Club members.
    ['users', 'dob', 'DATE NULL'],
    ['users', 'gender', 'VARCHAR(20) NULL'],
    ['users', 'club_member', 'TINYINT(1) NOT NULL DEFAULT 0'],
    ['users', 'club_joined_at', 'DATETIME(6) NULL'],
    ['users', 'club_card_no', 'VARCHAR(24) NULL'],
    // What an order line was bought under (an offer page), kept as a snapshot like bundle_title.
    ['order_items', 'offer_id', 'VARCHAR(64) NULL'],
    ['order_items', 'offer_title', 'VARCHAR(160) NULL'],
    // When the after-delivery review request email went out (lib/reviewRequests.js), so it is sent once.
    ['orders', 'review_request_sent_at', 'DATETIME NULL'],
    // Why an order was cancelled, and a return the customer asked for (see lib/orderReasons.js and the order routes).
    ['orders', 'cancel_reason', 'VARCHAR(100) NULL'],
    ['orders', 'cancel_note', 'VARCHAR(500) NULL'],
    ['orders', 'cancelled_by', 'VARCHAR(20) NULL'],
    ['orders', 'return_status', 'VARCHAR(20) NULL'],
    ['orders', 'return_reason', 'VARCHAR(100) NULL'],
    ['orders', 'return_note', 'VARCHAR(500) NULL'],
    ['orders', 'return_requested_at', 'DATETIME(6) NULL'],
    ['orders', 'return_resolved_at', 'DATETIME(6) NULL'],
];

async function hasTable(pool, table) {
    const [rows] = await pool.query('SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? LIMIT 1', [table]);
    return rows.length > 0;
}

/** The two offers from the client's brief, created once when the offers table first appears. The admin edits or removes them freely. */
async function seedStarterOffers(pool) {
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    await pool.query(
        `INSERT IGNORE INTO offers (id, slug, title, kind, summary, description, price, pick_count, all_products, is_enabled, sort_order, created_at, updated_at)
         VALUES (?, ?, ?, 'mix_match', ?, ?, 1499, 3, 1, 1, 0, ?, ?)`,
        ['offer-pick-and-mix', 'pick-any-3', 'Pick & Mix: any 3 for ₹1499', 'Choose any 3 products. Each product can be picked once.', 'Build your own box: pick any three different products and pay one price. A product can only be chosen once per box.', now, now],
    );
    const [best] = await pool.query('SELECT id FROM products WHERE is_published = 1 ORDER BY is_best_seller DESC, price DESC LIMIT 4');
    if (best.length === 0) return;
    await pool.query(
        `INSERT IGNORE INTO offers (id, slug, title, kind, summary, description, price, pick_count, all_products, is_enabled, sort_order, created_at, updated_at)
         VALUES (?, ?, ?, 'bogo', ?, ?, 0, 3, 0, 1, 1, ?, ?)`,
        ['offer-buy-1-get-1', 'buy-1-get-1-free', 'Buy 1 Get 1 Free', 'Buy one, get one free on these products.', 'Choose a product and add it once. We add a second one free, so you pay for one.', now, now],
    );
    for (const [i, row] of best.entries()) {
        await pool.query('INSERT IGNORE INTO offer_products (offer_id, product_id, sort_order) VALUES (?, ?, ?)', ['offer-buy-1-get-1', row.id, i]);
    }
}

export async function ensureSchema() {
    const pool = getPool();
    const offersExisted = await hasTable(pool, 'offers');
    for (const ddl of TABLES) await pool.query(ddl);
    if (!offersExisted) await seedStarterOffers(pool);
    for (const [table, column, definition] of COLUMNS) await addColumn(pool, table, column, definition);
    if (!(await hasIndex(pool, 'users', 'uq_users_club_card_no'))) {
        await pool.query('ALTER TABLE users ADD UNIQUE KEY uq_users_club_card_no (club_card_no)');
    }
}
