---
title: "Protect credentials and operate safely"
description: "Understand credential encryption, SQLite persistence, backup limits, Discord permissions, and the operational safeguards required before deployment."
---
Use this guide when you configure, test, or operate a Chaotic Minds Command instance. The application handles Discord OAuth sessions and bot credentials, so the server environment and persistent data directory must remain private.

## Credential handling

Chaotic Minds Command stores customer-owned bot credentials encrypted at rest using AES-256-GCM. The token is verified with Discord before storage and is not returned in API responses.

The encryption key is derived from `SESSION_SECRET`. Keep that value stable across restarts and protect it separately from the database.

> **Warning:** Changing or losing `SESSION_SECRET` makes existing encrypted sessions and bot credentials unreadable. It is not a routine credential rotation procedure.

Removing a bot from Chaotic Minds Command deletes its stored credential and account-owned server assignments. It does not revoke the token at Discord. If a token may have been exposed, reset it in the Discord Developer Portal.

## SQLite storage and recovery

The default data directory is `.data`. The database file is `command.sqlite`, and SQLite may maintain write-ahead log files alongside it.

Persistent data includes sessions, personal saved structures, shared server notes, encrypted bot credentials, and bot assignments.

The recorded persistence tests cover:

- Application close and reopen.
- A database copy taken after clean application shutdown.
- Recovery with the matching session secret.
- Fail-closed behavior with a mismatched secret.
- Fail-closed behavior when encrypted session or bot data is corrupted.
- Reopening the database in a separate Node.js process.

The clean-shutdown copy test is not a hot-backup test. Do not copy only the main SQLite file while the application is running. Use a consistent backup strategy that accounts for SQLite WAL files.

## Discord permissions

The selected bot requests:

- Manage Channels.
- Manage Roles.

It does not require Administrator or privileged Gateway intents for the current REST-based workflow. Keep the bot's role above the roles it needs to create. Do not grant Administrator as a workaround for a readiness failure.

New roles are created with zero permissions and are not assigned to members. Existing roles are reused without changing their permissions. New channels inherit category or server visibility and may be public.

## Runtime and deployment constraints

The active runtime uses a process-local lock for per-server apply operations. Operate one application process or replica. Multi-process coordination is not implemented.

Before any public deployment, verify all of the following:

- Use HTTPS and set `APP_ORIGIN` to the exact HTTPS origin.
- Set `NODE_ENV=production`.
- Use a strong, stable `SESSION_SECRET`.
- Mount a private persistent data directory.
- Restrict access to the database and its backup copies.
- Add request and rate limits at a trusted reverse proxy.
- Define a consistent backup and recovery procedure.
- Keep Discord application credentials out of source control and browser assets.
- Complete live acceptance in a disposable Discord server.

The current tests do not establish production backup automation, hot-backup consistency, abrupt-crash recovery, multi-process safety, or live Discord acceptance.

## Approval boundaries

Do not deploy publicly, change a live Discord server, expand bot permissions, or incur paid service costs without explicit owner approval.
