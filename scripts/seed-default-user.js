#!/usr/bin/env node
/**
 * Cria ou atualiza o usuário admin no Postgres.
 * Uso: DEPLOYER_SEED_EMAIL=... DEPLOYER_SEED_PASSWORD=... node scripts/seed-default-user.js
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
    console.error('[seed-user] DEPLOYER_SEED_EMAIL e DEPLOYER_SEED_PASSWORD são obrigatórios.');
    process.exit(1);
  }
  if (password.length < 8) {
    console.error('[seed-user] A senha deve ter pelo menos 8 caracteres.');
    process.exit(1);
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    console.error('[seed-user] E-mail inválido.');
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
      console.log(`[seed-user] Senha atualizada para ${email}`);
    } else {
      await client.query(
        'INSERT INTO users (id, email, password_hash, created_at) VALUES (gen_random_uuid(), $1, $2, NOW())',
        [email, passwordHash],
      );
      console.log(`[seed-user] Usuário criado: ${email}`);
    }
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error('[seed-user] Erro:', e.message || e);
  process.exit(1);
});
