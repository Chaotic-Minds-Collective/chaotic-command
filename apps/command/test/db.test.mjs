import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import pg from 'pg';
import { DatabaseSync } from 'node:sqlite';
import { mkdtemp, cp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { openDb } from '../db/index.mjs';

/** Creates an isolated temp directory for a test and cleans it up afterwards. */
async function fixture(t) {
  const dir = await mkdtemp(join(tmpdir(), 'command-db-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  return dir;
}

test('SQLite serializes concurrent startup and repeated migrations', async t => {
  const dir = await fixture(t);
  const databases = await Promise.all(Array.from({ length: 8 }, () => openDb({ env: {}, dbPath: join(dir, 'db.sqlite') })));
  t.after(() => Promise.all(databases.map(db => db.close())));
  await Promise.all(databases.map(db => db.migrate()));
  assert.equal((await databases[0].query('SELECT name FROM schema_migrations')).length, 1);
  await databases[0].prepare('INSERT INTO notes VALUES (?, ?)').run('guild', 'persisted');
  assert.equal((await databases[1].prepare('SELECT value FROM notes WHERE guild = ?').get('guild')).value, 'persisted');
});

test('SQLite binds migration filenames instead of interpolating them into SQL', async t => {
  const dir = await fixture(t);
  await cp(new URL('../db/', import.meta.url), join(dir, 'db'), { recursive: true });
  const migrationName = "002_quote'--.sql";
  await writeFile(join(dir, 'db/migrations', migrationName), 'CREATE TABLE quoted_migration (id TEXT);');
  const isolated = await import(pathToFileURL(join(dir, 'db/index.mjs')));
  const db = await isolated.openDb({ env: {}, dbPath: join(dir, 'quoted.sqlite') });
  t.after(() => db.close());
  assert.ok((await db.query('SELECT name FROM schema_migrations')).some(row => row.name === migrationName));
});

test('SQLite rolls back base schema, earlier files, and a partial failing file', async t => {
  const dir = await fixture(t);
  await cp(new URL('../db/', import.meta.url), join(dir, 'db'), { recursive: true });
  await writeFile(join(dir, 'db/migrations/999_failure.sql'), 'CREATE TABLE partial (id TEXT); INVALID SQL;');
  const isolated = await import(pathToFileURL(join(dir, 'db/index.mjs')));
  const filename = join(dir, 'failure.sqlite');
  await assert.rejects(isolated.openDb({ env: {}, dbPath: filename }), /syntax error/);
  const raw = new DatabaseSync(filename);
  assert.deepEqual(raw.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all(), []);
  raw.close();
});

test('Postgres TLS configuration, transaction client, rollback and failure cleanup', async () => {
  let config, calls, poolCalls, ended, released, failure, failClose;
  const original = new Error('migration failed');
  globalThis.__dbTestPg = {
    Client: pg.Client,
    Pool: class {
      constructor(options) { config = options; calls = []; poolCalls = []; ended = released = false; }
      async connect() {
        return {
          async query(sql, params = []) {
            calls.push({ sql, params });
            if (failure && sql.startsWith('CREATE TABLE')) throw original;
            return { rows: [] };
          },
          release() { released = true; }
        };
      }
      async query(sql, params = []) { poolCalls.push({ sql, params }); return { rows: [], rowCount: 1 }; }
      async end() { ended = true; if (failClose) throw new Error('close failed'); }
    }
  };
  const hooks = registerHooks({
    resolve(specifier, context, next) {
      if (specifier === 'pg') return { url: 'data:text/javascript,export default globalThis.__dbTestPg', shortCircuit: true };
      return next(specifier, context);
    }
  });
  try {
    for (const [url, ca, expected] of [
      ['postgres://user:localhost@remote.invalid/db', undefined, { rejectUnauthorized: true }],
      ['postgres://remote.invalid/localhost', undefined, { rejectUnauthorized: true }],
      ['postgres://localhost/db', undefined, false],
      ['postgres://127.0.0.1/db', undefined, false],
      ['postgres://[::1]/db', undefined, false],
      ['postgres://remote.invalid/db?sslmode=disable', 'fixture-ca', false],
      ['postgres://remote.invalid/db?sslmode=verify-full', 'fixture-ca', { ca: 'fixture-ca' }],
      ['postgres://remote.invalid/db', 'fixture-ca', { rejectUnauthorized: true, ca: 'fixture-ca' }]
    ]) {
      const db = await openDb({ env: { DATABASE_URL: url, DATABASE_SSL_CA: ca } });
      assert.deepEqual(config.ssl, expected);
      assert.equal(config.connectionString, undefined);
      assert.equal(calls[0].sql, 'BEGIN');
      assert.match(calls[1].sql, /pg_advisory_xact_lock/);
      assert.ok(calls.findIndex(call => call.sql.startsWith('SELECT name')) > 1);
      const migrationInsert = calls.find(call => call.sql.startsWith('INSERT INTO schema_migrations'));
      assert.equal(migrationInsert.sql, 'INSERT INTO schema_migrations (name, applied_at) VALUES ($1, $2)');
      assert.equal(migrationInsert.params.length, 2);
      assert.equal(typeof migrationInsert.params[0], 'string');
      assert.equal(typeof migrationInsert.params[1], 'number');
      assert.equal(calls.at(-1).sql, 'COMMIT');
      assert.equal(released, true);
      if (url === 'postgres://localhost/db') {
        const inputs = [
          ['INSERT OR REPLACE INTO sessions VALUES (?, ?, ?)', ['session-id', 'session-data', 123]],
          ['INSERT OR REPLACE INTO notes VALUES (?, ?)', ['guild-id', 'note-value']],
          ['INSERT OR REPLACE INTO guild_bot_selections (owner_id, guild_id, bot_id) VALUES (?, ?, ?)', ['owner-id', 'guild-id', 'bot-id']]
        ];
        const expected = [
          'INSERT INTO sessions (id, data, expires) VALUES ($1, $2, $3) ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, expires = EXCLUDED.expires',
          'INSERT INTO notes (guild, value) VALUES ($1, $2) ON CONFLICT (guild) DO UPDATE SET value = EXCLUDED.value',
          'INSERT INTO guild_bot_selections (owner_id, guild_id, bot_id) VALUES ($1, $2, $3) ON CONFLICT (owner_id, guild_id) DO UPDATE SET bot_id = EXCLUDED.bot_id'
        ];
        for (let index = 0; index < inputs.length; index++) {
          await db.prepare(inputs[index][0]).run(...inputs[index][1]);
          assert.deepEqual(poolCalls.at(-1), { sql: expected[index], params: inputs[index][1] });
        }
        const beforeInvalid = poolCalls.length;
        for (const sql of [
          'INSERT OR REPLACE INTO toString VALUES (?, ?)',
          'INSERT OR REPLACE INTO sessions (id, data, expires) VALUES (?, ?, ?); DROP TABLE sessions',
          'INSERT OR REPLACE INTO sessions (id, data, expires) VALUES (?, ?, (SELECT 1))',
          'INSERT OR REPLACE INTO sessions (id, injected_column, expires) VALUES (?, ?, ?)'
        ]) assert.throws(() => db.prepare(sql), /allowlist|allowlisted|Unsupported|values must/);
        assert.equal(poolCalls.length, beforeInvalid, 'rejected SQL must never reach the PostgreSQL pool');
        await db.prepare("SELECT '?' AS literal, ? AS bound -- ? ignored\n").get('bound-value');
        assert.deepEqual(poolCalls.at(-1), { sql: "SELECT '?' AS literal, $1 AS bound -- ? ignored\n", params: ['bound-value'] });
      }
      await db.close();
      assert.equal(ended, true);
    }
    failure = failClose = true;
    await assert.rejects(openDb({ env: { DATABASE_URL: 'postgres://localhost/db' } }), error => error === original);
    assert.equal(calls.at(-1).sql, 'ROLLBACK');
    assert.equal(released, true);
    assert.equal(ended, true);
  } finally {
    hooks.deregister();
    delete globalThis.__dbTestPg;
  }
});
