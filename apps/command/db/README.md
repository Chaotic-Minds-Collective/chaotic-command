<!-- coderabbit-ai-generated:v1 -->

<!-- coderabbit-ai-generated-section:v1:dcbea34f0aa8477f5dba30f9afdd36b6e676851b37341f7d7532aac5510f1263 -->

# Chaotic Command persistence

## Drivers

`apps/command/db/index.mjs` picks the driver automatically:

- `DATABASE_URL` is set: PostgreSQL (Supabase) via the `pg` library, with a small connection pool (max 5).
- Otherwise: local SQLite via Node's built-in `node:sqlite` (development default, `$0`).

Remote PostgreSQL connections use certificate verification by default. Only exact loopback hosts (`localhost`, `127.0.0.1`, `::1`) and Unix sockets use driver defaults. Explicit connection URL SSL options (including `sslmode=disable`) are honored; prefer `sslmode=verify-full` for remote databases. Set `DATABASE_SSL_CA` to PEM CA text when a private CA is required. This CA is retained even when the URL contains SSL parameters.

Both adapters expose the same async API (`prepare().get/all/run`, `exec`, `query`, `migrate`, `close`), so application code never branches on the driver.

SQL compatibility notes:
- All statements use `?` placeholders; the Postgres adapter rewrites them to `$n` automatically.
- SQLite-only syntax (`INSERT OR REPLACE`, `COLLATE NOCASE`, `PRAGMA`) is translated for Postgres. Upserts are accepted only for the frozen `sessions`, `notes`, and `guild_bot_selections` table/column definitions; values must be `?` placeholders and are passed separately to the PostgreSQL driver. Unknown tables, columns, or value expressions are rejected.
- Schema creation happens automatically on startup (`openDb` calls `migrate()`).

## Migrations

Numbered `.sql` files live in `apps/command/db/migrations/` and run in filename order. Applied migrations are recorded in `schema_migrations`, so files must never be edited after release - add a new numbered file instead.

Base schema creation, pending-file checks, SQL execution, and migration recording share one transaction. Migration filenames and timestamps are inserted with bound parameters rather than interpolated into SQL text. PostgreSQL uses one checked-out client and a transaction advisory lock; SQLite enables WAL before `BEGIN IMMEDIATE` and retries busy acquisition asynchronously for up to five seconds. A failed batch rolls back all changes from that batch, and failed startup closes the adapter. Migration files must contain transaction-compatible SQL and must not manage their own transactions.

Run manually:

    node --env-file-if-exists=.env apps/command/db/migrate.mjs

They also run automatically whenever the web server or the bot opens the database.

## Community schema (001_community_schema.sql)

Tables: `users`, `discord_servers`, `moderation_cases`, `warnings`, `tickets`, `ticket_messages`, `ticket_transcripts`, `appeals`, `ban_approval_requests`, `staff_actions`, `audit_events`.

Indexes cover guild_id, user_id, ticket_id and case_id lookups. IDs are application-generated hex strings; timestamps are Unix epoch milliseconds.

## Shared database safety

The web dashboard and the Discord bot can point at the same `DATABASE_URL`. Rules:

- Every query is parameterized - never concatenate user input into SQL.
- Both processes use their own pool; the Postgres default `max: 5` keeps total connections inside the Supabase free tier (use the Supabase session pooler connection string when connecting from Render, since free web services need IPv4).
- Connection failures throw; callers should surface them as 502/503 responses or restart cycles, never retry blindly in a loop.

## Supabase free tier setup

1. Create a project at supabase.com (free tier).
2. Project Settings > Database > Connection string: choose "Session pooler" (port 5432).
3. Copy the connection string; replace `[YOUR-PASSWORD]` with the database password.
4. Store it as `DATABASE_URL` in the Render environment for chaotic-command, and in the Oracle VM `.env` for the bot. Never commit it.

## Backup and restore

- Supabase: use `pg_dump` from any machine with the connection string (e.g. from the Oracle VM):
  `pg_dump "$DATABASE_URL" > backup-$(date +%F).sql`
- Restore: `psql "$DATABASE_URL" < backup-file.sql` (run migrations first on a fresh project).
- Local SQLite: stop the server, copy the `.data/command.sqlite` file (plus `-wal`/`-shm` if present).

## Secrets

- `DATABASE_URL`, `DISCORD_BOT_TOKEN`, `SESSION_SECRET`, `DISCORD_CLIENT_SECRET` are secrets: environment variables only, never in git, logs, or PRs.
- Use placeholders like `<DATABASE_URL>` in docs and issues.

<!-- /coderabbit-ai-generated:v1 -->