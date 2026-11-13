import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync, mkdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Dual-driver persistence: PostgreSQL (Supabase) when DATABASE_URL is set, local SQLite otherwise.
// Both adapters expose the same async API:
//   db.kind                          'sqlite' | 'postgres'
//   db.prepare(sql) -> { get, all, run }   (all methods async)
//   db.exec(sql)                     (async)
//   db.query(sql, params)            (async, raw rows for postgres / array for sqlite)
//   db.migrate()                     (async, applies migrations/*.sql in order)
//   db.close()                       (async)
// All SQL uses ? placeholders and is translated for Postgres automatically.

const migrationsDir = join(dirname(fileURLToPath(import.meta.url)), 'migrations');

// Only these frozen identifiers may be emitted by the SQLite upsert translator.
const SQLITE_TABLES = Object.freeze({
  sessions: Object.freeze({ columns: Object.freeze(['id', 'data', 'expires']), key: Object.freeze(['id']) }),
  notes: Object.freeze({ columns: Object.freeze(['guild', 'value']), key: Object.freeze(['guild']) }),
  guild_bot_selections: Object.freeze({ columns: Object.freeze(['owner_id', 'guild_id', 'bot_id']), key: Object.freeze(['owner_id', 'guild_id']) })
});

/**
 * Translate only the exact INSERT OR REPLACE shapes used by this application.
 * Identifiers and the conflict clause come exclusively from the frozen allowlist;
 * values must be placeholders and are always supplied separately to `pg`.
 */
function translatePostgres(sql) {
  const upsertMarker = /^\s*INSERT\s+OR\s+REPLACE\s+INTO\b/i;
  if (upsertMarker.test(sql)) {
    const match = /^\s*INSERT\s+OR\s+REPLACE\s+INTO\s+([A-Za-z_][A-Za-z0-9_]*)(?:\s*\(([^)]*)\))?\s*VALUES\s*\(([^)]*)\)\s*;?\s*$/i.exec(sql);
    if (!match) throw new Error('Unsupported INSERT OR REPLACE statement shape.');
    const [, table, columnList, values] = match;
    if (!Object.hasOwn(SQLITE_TABLES, table)) throw new Error('No Postgres conflict target is allowlisted for this table.');
    const spec = SQLITE_TABLES[table];
    const columns = columnList === undefined ? spec.columns : columnList.split(',').map(column => column.trim());
    if (columns.length !== spec.columns.length || columns.some((column, index) => column !== spec.columns[index])) {
      throw new Error('INSERT OR REPLACE columns do not match the allowlisted table definition.');
    }
    if (!/^\s*\?(?:\s*,\s*\?)*\s*$/.test(values) || (values.match(/\?/g) || []).length !== spec.columns.length) {
      throw new Error('INSERT OR REPLACE values must contain exactly one placeholder per allowlisted column.');
    }
    const setters = spec.columns.filter(column => !spec.key.includes(column))
      .map(column => `${column} = EXCLUDED.${column}`).join(', ');
    const placeholders = spec.columns.map(() => '?').join(', ');
    return `INSERT INTO ${table} (${spec.columns.join(', ')}) VALUES (${placeholders}) ON CONFLICT (${spec.key.join(', ')}) DO UPDATE SET ${setters}`;
  }
  const out = sql.replace(/PRAGMA[^;]*;?/g, '');
  return out.replace(/\s+COLLATE NOCASE\b/g, '');
}

/** Number placeholders without rewriting question marks in SQL strings or comments. */
function toPgPlaceholders(sql) {
  let out = '', index = 0, i = 0;
  while (i < sql.length) {
    const char = sql[i], next = sql[i + 1];
    if (char === "'") {
      const escapeString = i > 0 && /[eE]/.test(sql[i - 1]) &&
        (i < 2 || !/[A-Za-z0-9_$\u0080-\uFFFF]/.test(sql[i - 2]));
      out += char; i++;
      while (i < sql.length) {
        if (escapeString && sql[i] === '\\' && i + 1 < sql.length) { out += sql[i] + sql[i + 1]; i += 2; continue; }
        out += sql[i];
        if (sql[i] === "'" && sql[i + 1] === "'") { out += sql[i + 1]; i += 2; continue; }
        if (sql[i] === "'") { i++; break; }
        i++;
      }
      continue;
    }
    if (char === '"') {
      out += char; i++;
      while (i < sql.length) {
        out += sql[i];
        if (sql[i] === '"' && sql[i + 1] === '"') { out += sql[i + 1]; i += 2; continue; }
        if (sql[i] === '"') { i++; break; }
        i++;
      }
      continue;
    }
    if (char === '-' && next === '-') {
      const end = sql.indexOf('\n', i + 2);
      const stop = end === -1 ? sql.length : end;
      out += sql.slice(i, stop); i = stop; continue;
    }
    if (char === '/' && next === '*') {
      let depth = 1, end = i + 2;
      while (end < sql.length && depth) {
        if (sql[end] === '/' && sql[end + 1] === '*') { depth++; end += 2; }
        else if (sql[end] === '*' && sql[end + 1] === '/') { depth--; end += 2; }
        else end++;
      }
      out += sql.slice(i, end); i = end; continue;
    }
    if (char === '$') {
      const delimiter = /^\$[A-Za-z_][A-Za-z0-9_]*\$|^\$\$/.exec(sql.slice(i))?.[0];
      if (delimiter) {
        const end = sql.indexOf(delimiter, i + delimiter.length);
        const stop = end === -1 ? sql.length : end + delimiter.length;
        out += sql.slice(i, stop); i = stop; continue;
      }
    }
    if (char === '?') out += `$${++index}`;
    else out += char;
    i++;
  }
  return out;
}

const SCHEMA = {
  sqlite: `CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY, data TEXT NOT NULL, expires INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS notes (guild TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS saved_structures (id TEXT PRIMARY KEY, owner_id TEXT NOT NULL, name TEXT NOT NULL, structure_json TEXT NOT NULL, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL);
CREATE UNIQUE INDEX IF NOT EXISTS saved_structures_owner_name ON saved_structures(owner_id, name COLLATE NOCASE);
CREATE TABLE IF NOT EXISTS user_bots (id TEXT PRIMARY KEY, owner_id TEXT NOT NULL, discord_bot_id TEXT NOT NULL, username TEXT NOT NULL, token_encrypted TEXT NOT NULL, created_at INTEGER NOT NULL, UNIQUE(owner_id, discord_bot_id));
CREATE INDEX IF NOT EXISTS user_bots_owner ON user_bots(owner_id, created_at);
CREATE TABLE IF NOT EXISTS guild_bot_selections (owner_id TEXT NOT NULL, guild_id TEXT NOT NULL, bot_id TEXT NOT NULL, PRIMARY KEY(owner_id, guild_id));`,
  postgres: `CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY, data TEXT NOT NULL, expires BIGINT NOT NULL);
CREATE TABLE IF NOT EXISTS notes (guild TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS saved_structures (id TEXT PRIMARY KEY, owner_id TEXT NOT NULL, name TEXT NOT NULL, structure_json TEXT NOT NULL, created_at BIGINT NOT NULL, updated_at BIGINT NOT NULL);
CREATE UNIQUE INDEX IF NOT EXISTS saved_structures_owner_name ON saved_structures(owner_id, lower(name));
CREATE TABLE IF NOT EXISTS user_bots (id TEXT PRIMARY KEY, owner_id TEXT NOT NULL, discord_bot_id TEXT NOT NULL, username TEXT NOT NULL, token_encrypted TEXT NOT NULL, created_at BIGINT NOT NULL, UNIQUE(owner_id, discord_bot_id));
CREATE INDEX IF NOT EXISTS user_bots_owner ON user_bots(owner_id, created_at);
CREATE TABLE IF NOT EXISTS guild_bot_selections (owner_id TEXT NOT NULL, guild_id TEXT NOT NULL, bot_id TEXT NOT NULL, PRIMARY KEY(owner_id, guild_id));`
};

/**
 * Build the SQLite adapter around an open node:sqlite handle. Migrations run
 * inside a BEGIN IMMEDIATE transaction (WAL enabled first) that retries busy
 * acquisition for up to five seconds, so concurrent startups serialize without
 * blocking another caller's commit.
 * @param {import('node:sqlite').DatabaseSync} db open database handle
 * @param {string} filename database file path, or ':memory:' for in-memory
 * @returns {object} adapter with kind, filename, prepare, exec, query, migrate, close
 */
function sqliteAdapter(db, filename) {
  const self = {
    kind: 'sqlite',
    filename,
    prepare(sql) {
      const statement = db.prepare(sql);
      return {
        get: async (...params) => statement.get(...params) ?? undefined,
        all: async (...params) => statement.all(...params),
        run: async (...params) => {
          const info = statement.run(...params);
          return { changes: info.changes, lastInsertRowid: info.lastInsertRowid };
        }
      };
    },
    exec: async sql => { db.exec(sql); },
    query: async (sql, params = []) => db.prepare(sql).all(...params),
    migrate: async () => {
      // Yield between busy attempts so another connection can finish its transaction.
      await sqliteRetry(() => db.exec('PRAGMA journal_mode=WAL'));
      await sqliteRetry(() => db.exec('BEGIN IMMEDIATE'));
      try {
        db.exec(SCHEMA.sqlite);
        await runMigrations(self, async (sql, params = []) => {
          if (params.length) db.prepare(sql).run(...params);
          else db.exec(sql);
        });
        db.exec('COMMIT');
      } catch (error) {
        try { db.exec('ROLLBACK'); } catch { /* Preserve the migration error. */ }
        throw error;
      }
    },
    close: async () => { db.close(); }
  };
  return self;
}

/**
 * Build the PostgreSQL adapter around a connection pool.
 *
 * TLS is verified for remote hosts by default; loopback and Unix-socket hosts
 * use driver defaults, and explicit URL SSL options are passed through
 * untouched. A PEM CA from DATABASE_SSL_CA is merged into the effective TLS
 * settings so it survives connection-string parameter application.
 * @param {string} connectionString value of DATABASE_URL
 * @param {string|undefined} ca optional PEM CA text from DATABASE_SSL_CA
 * @returns {Promise<object>} adapter with kind, prepare, exec, query, migrate, close
 */
async function postgresAdapter(connectionString, ca) {
  const pgModule = await import('pg');
  const Pool = pgModule.default.Pool ?? pgModule.default;
  // Parse once using the driver's own rules, then omit connectionString so it
  // cannot overwrite our TLS defaults (or an explicitly supplied CA).
  const parameters = new pgModule.default.Client({ connectionString }).connectionParameters;
  const local = ['localhost', '127.0.0.1', '::1', '[::1]'].includes(parameters.host) || parameters.host.startsWith('/');
  let url = null;
  try { url = new URL(connectionString); } catch {
    // Keyword-format or unencoded connection strings: pg already parsed them
    // above, so treat them as having no explicit URL SSL parameters.
  }
  const explicitSsl = url ? ['ssl', 'sslmode', 'sslcert', 'sslkey', 'sslrootcert'].some(key => url.searchParams.has(key)) : false;
  let ssl = parameters.ssl;
  if (!explicitSsl && !ssl && !local) ssl = { rejectUnauthorized: true };
  if (ssl && ca) ssl = { ...(typeof ssl === 'object' ? ssl : {}), ca };
  const pool = new Pool({ ...parameters, max: 5, ssl });
  const cache = new Map();
  const self = {
    kind: 'postgres',
    prepare(sql) {
      let text = cache.get(sql);
      if (!text) {
        text = toPgPlaceholders(translatePostgres(sql));
        cache.set(sql, text);
      }
      return {
        get: async (...params) => (await pool.query(text, params)).rows[0],
        all: async (...params) => (await pool.query(text, params)).rows,
        run: async (...params) => {
          const result = await pool.query(text, params);
          return { changes: result.rowCount ?? 0, lastInsertRowid: null };
        }
      };
    },
    exec: async sql => { await pool.query(translatePostgres(sql)); },
    query: async (sql, params = []) => (await pool.query(toPgPlaceholders(translatePostgres(sql)), params)).rows,
    migrate: async () => {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query('SELECT pg_advisory_xact_lock(1735289201)');
        await client.query(SCHEMA.postgres);
        await runMigrations({ query: async sql => (await client.query(sql)).rows }, async (sql, params = []) => {
          if (params.length) await client.query(toPgPlaceholders(translatePostgres(sql)), params);
          else await client.query(sql);
        });
        await client.query('COMMIT');
      } catch (error) {
        try { await client.query('ROLLBACK'); } catch { /* Preserve the migration error. */ }
        throw error;
      } finally {
        client.release();
      }
    },
    close: async () => { await pool.end(); }
  };
  return self;
}

/**
 * Run an operation, retrying SQLite busy errors (errcode 5, raised e.g. by
 * BEGIN IMMEDIATE while another connection holds the write lock) for up to
 * five seconds. Yields between attempts so the other connection can commit.
 * @param {() => void} operation database operation to run
 * @returns {Promise<void>} resolves when the operation succeeds within the deadline
 */
async function sqliteRetry(operation) {
  const deadline = Date.now() + 5000;
  for (;;) {
    try { return operation(); } catch (error) {
      if (error.errcode !== 5 || Date.now() >= deadline) throw error;
      await new Promise(resolve => setTimeout(resolve, 10));
    }
  }
}

/** Apply and record pending files inside the caller's serialized transaction. */
async function runMigrations(adapter, executeSql) {
  await executeSql(`CREATE TABLE IF NOT EXISTS schema_migrations (name TEXT PRIMARY KEY, applied_at BIGINT NOT NULL)`);
  const applied = new Set((await adapter.query('SELECT name FROM schema_migrations')).map(row => row.name));
  const files = readdirSync(migrationsDir).filter(name => name.endsWith('.sql')).sort();
  for (const name of files) {
    if (applied.has(name)) continue;
    await executeSql(readFileSync(join(migrationsDir, name), 'utf8'));
    await executeSql('INSERT INTO schema_migrations (name, applied_at) VALUES (?, ?)', [name, Date.now()]);
  }
}

/**
 * Open a database and apply the base schema and pending migrations before returning.
 * env defaults to process.env. A truthy env.DATABASE_URL selects PostgreSQL;
 * otherwise SQLite uses dbPath, or command.sqlite under env.DATA_DIR (default
 * .data). Use ':memory:' for in-memory SQLite. dbPath is ignored for PostgreSQL.
 * Remote PostgreSQL uses verified TLS by default; loopback/socket hosts use driver
 * defaults. Explicit URL SSL settings are honored. env.DATABASE_SSL_CA supplies
 * optional PEM CA text without being overwritten by URL SSL parameters.
 *
 * The returned adapter exposes kind, prepare(sql), exec(sql), query(sql, params),
 * migrate(), and close(). SQLite adapters also expose filename. Prepared get/all/run
 * accept bound arguments and resolve to the first row or undefined, all rows, and
 * { changes, lastInsertRowid }, respectively; PostgreSQL always returns null for
 * lastInsertRowid. query resolves to rows and defaults params to an empty array.
 * exec accepts SQL without parameters. PostgreSQL prepare and query number `?`
 * placeholders outside quoted strings, identifiers, and comments, and translate
 * only supported SQLite syntax.
 *
 * Opening or migrating can reject with driver, filesystem, or SQL errors; migration
 * failures roll back schema changes and close the adapter. prepare can throw synchronously, and execution
 * and close errors propagate through their returned promises.
 */
export async function openDb({ env = process.env, dbPath } = {}) {
  const databaseUrl = env.DATABASE_URL;
  const db = databaseUrl ? await postgresAdapter(databaseUrl, env.DATABASE_SSL_CA) : await sqliteAdapterFor(dbPath, env);
  try {
    await db.migrate();
    return db;
  } catch (error) {
    try { await db.close(); } catch { /* Preserve the migration error. */ }
    throw error;
  }
}

/**
 * Create the SQLite adapter for dbPath, defaulting to command.sqlite under
 * env.DATA_DIR (default .data); ':memory:' opens an in-memory database and any
 * other parent directory is created with mode 0700. dbPath is ignored when
 * DATABASE_URL selects PostgreSQL.
 * @param {string|undefined} dbPath explicit database file path
 * @param {NodeJS.ProcessEnv} env process environment
 * @returns {Promise<object>} SQLite adapter
 */
async function sqliteAdapterFor(dbPath, env) {
  const path = dbPath ?? resolve(env.DATA_DIR || '.data', 'command.sqlite');
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  return sqliteAdapter(new DatabaseSync(path, { timeout: 0 }), path);
}
