#!/usr/bin/env node
/**
 * Create or update admin user in Postgres.
 * Usage: DEPLOYER_SEED_EMAIL=... DEPLOYER_SEED_PASSWORD=... node scripts/seed-default-user.js
 */
const fs = require('fs');
const path = require('path');
const bcrypt = require(path.join(__dirname, '../server/node_modules/bcrypt'));
const { Client } = require(path.join(__dirname, '../server/node_modules/pg'));

const ROOT = path.join(__dirname, '..');
const ENV_PATH = path.join(ROOT, 'server', '.env');

function loadDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  if (fs.existsSync(ENV_PATH)) {
    const line = fs
      .readFileSync(ENV_PATH, 'utf8')
      .split('\n')
      .find((l) => l.startsWith('DATABASE_URL='));
    if (line) {
      const val = line.slice('DATABASE_URL='.length).trim();
      if (val) return val;
    }
  }
  return 'postgresql://postgres:deployer@localhost:5432/deployer';
}

async function main() {
  const email = (process.env.DEPLOYER_SEED_EMAIL || '').trim();
  const password = process.env.DEPLOYER_SEED_PASSWORD || '';

  if (!email || !password) {
    console.error('[seed-user] DEPLOYER_SEED_EMAIL and DEPLOYER_SEED_PASSWORD are required.');
    process.exit(1);
  }
  if (password.length < 8) {
    console.error('[seed-user] Password must be at least 8 characters.');
    process.exit(1);
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    console.error('[seed-user] Invalid email.');
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const client = new Client({ connectionString: loadDatabaseUrl() });
  await client.connect();

  try {
    const existing = await client.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rowCount > 0) {
      await client.query('UPDATE users SET password_hash = $1 WHERE email = $2', [
        passwordHash,
        email,
      ]);
      console.log(`[seed-user] Password updated for ${email}`);
    } else {
      await client.query(
        'INSERT INTO users (id, email, password_hash, created_at) VALUES (gen_random_uuid(), $1, $2, NOW())',
        [email, passwordHash],
      );
      console.log(`[seed-user] User created: ${email}`);
    }
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error('[seed-user] Error:', e.message || e);
  process.exit(1);
});
