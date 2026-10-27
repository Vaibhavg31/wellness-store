#!/usr/bin/env node
/**
 * One-command database setup: npm run db:setup
 *
 * Imports ../database/chikit.sql into the MySQL server named in config.json (DB_HOST / DB_PORT / DB_USER / DB_PASS /
 * DB_NAME; a real environment variable overrides the file, same rule the backend uses). The database is created if it
 * does not exist. The file is idempotent (tables are created only if missing, rows inserted only if absent), so
 * running this again never overwrites or deletes existing data.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mysql from 'mysql2/promise';
import { loadConfig } from '../src/lib/config.js';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
loadConfig(path.join(projectRoot, 'config.json'));

const host = process.env.DB_HOST || '127.0.0.1';
const port = Number(process.env.DB_PORT || 3306);
const user = process.env.DB_USER || 'root';
const password = process.env.DB_PASS || '';
const database = process.env.DB_NAME || 'wellness_store';

const fail = (message) => {
    console.error(`\n✖ ${message}\n`);
    process.exit(1);
};

if (!/^[A-Za-z0-9_]+$/.test(database)) fail(`DB_NAME "${database}" may only contain letters, numbers and underscores.`);

const sqlFile = path.join(projectRoot, 'database', 'chikit.sql');
if (!fs.existsSync(sqlFile)) fail(`Cannot find ${sqlFile}`);
// The file targets "wellness_store"; point it at whatever database the config asks for.
const sql = fs.readFileSync(sqlFile, 'utf8').replace(/`wellness_store`/g, `\`${database}\``);

let connection;
try {
    connection = await mysql.createConnection({ host, port, user, password, multipleStatements: true, charset: 'utf8mb4' });
} catch (error) {
    const hint = error.code === 'ECONNREFUSED'
        ? `MySQL is not running at ${host}:${port}. Start it first (XAMPP Control Panel → MySQL → Start), then run this again.`
        : error.code === 'ER_ACCESS_DENIED_ERROR'
            ? `MySQL refused the login for "${user}". Check DB_USER / DB_PASS in config.json.`
            : error.message;
    fail(`Could not connect to MySQL. ${hint}`);
}

try {
    console.log(`Importing database/chikit.sql into "${database}" on ${host}:${port} …`);
    await connection.query(sql);

    const count = async (table) => (await connection.query(`SELECT COUNT(*) AS n FROM \`${database}\`.\`${table}\``))[0][0].n;
    const [[{ tables }]] = await connection.query('SELECT COUNT(*) AS tables FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = \'BASE TABLE\'', [database]);
    console.log(`\n✔ Done. ${tables} tables · ${await count('categories')} categories · ${await count('products')} products · ${await count('coupons')} coupons`);
    console.log('\nNext: npm run dev   →   shop at http://localhost:5173, API on http://localhost:8000\n');
} catch (error) {
    fail(`Import failed: ${error.message}`);
} finally {
    await connection?.end();
}
