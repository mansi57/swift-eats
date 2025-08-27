const fs = require('fs');
const path = require('path');
require('dotenv').config();
const { Pool } = require('pg');

const sqlFilePath = path.resolve(__dirname, '..', 'database', 'schema.sql');

async function run() {
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 5432),
    database: process.env.DB_NAME || 'swift_eats',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  });

  const client = await pool.connect();
  try {
    const schemaSql = fs.readFileSync(sqlFilePath, 'utf8');

    // Ensure required extensions exist before running schema (gen_random_uuid from pgcrypto)
    await client.query('CREATE EXTENSION IF NOT EXISTS postgis');
    await client.query('CREATE EXTENSION IF NOT EXISTS pgcrypto');

    await client.query('BEGIN');
    await client.query(schemaSql);
    await client.query('COMMIT');
    console.log('Database schema loaded successfully.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Failed to load database schema:', err.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

run();



