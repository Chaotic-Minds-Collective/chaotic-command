---
title: "Understand the application architecture"
description: "See how the Node.js runtime, browser client, SQLite storage, Discord API, and preserved Bit workspace fit together before you extend the product."
---
Chaotic Minds Command has a dependency-free application runtime alongside a preserved Bit design workspace. Understand which code is active before changing the product so you extend the working application instead of rebuilding the original components.

## Active application

The active runtime is in `apps/command`.

| Path | Responsibility |
| --- | --- |
| `apps/command/server.mjs` | Node.js HTTP server, Discord OAuth, sessions, API routes, SQLite access, credential encryption, and static-file allowlist |
| `apps/command/core.mjs` | Template definitions, structure validation, server audit, setup planning, apply operations, and per-server operation locks |
| `apps/command/web/` | Browser interface, HTML, CSS, and vanilla JavaScript |
| `apps/command/test/` | Node.js test-runner tests using injected Discord responses and offline fixtures |

The browser client calls the application server. The server calls Discord through REST requests and stores application data in SQLite. The active runtime does not require a frontend build step or a package installation.

## Request and setup flow

1. A person signs in through the application's Discord OAuth flow.
2. The server stores the session on the server side and lists Discord servers the signed-in account can manage.
3. The account connects a personal bot or selects the optional shared bot.
4. The selected bot must be installed in the target server and have Manage Channels and Manage Roles.
5. The application reads roles and channels for a read-only audit or a setup preview.
6. The owner reviews the proposed Create and Reuse actions.
7. The owner enters the exact confirmation phrase and confirms in the browser before Discord writes begin.

The preview is bound to the selected bot identity and relevant server permission context. The apply path checks for stale context before writing. Discord operations are not transactional, so partial progress is reported rather than automatically rolled back.

## Persistent data

The default data directory is `.data`, with the SQLite database at `.data/command.sqlite`. The application uses SQLite WAL mode.

Persistent records include:

- Encrypted sign-in sessions.
- Personal saved structures scoped to the Discord account that created them.
- Shared notes scoped to a Discord server and available to current managers.
- Encrypted customer-owned bot credentials.
- Per-server bot assignments. The default bot is a sign-in session setting, not a persistent record.

The encryption key is derived from `SESSION_SECRET`. Keep it stable and protect it separately from the database. See [security and operations](security-and-operations.md).

## Preserved Bit workspace

The original design and component workspace remains in the repository:

- `design/` contains the React/TypeScript theme and reusable design components.
- `guildpilot/` contains the original GuildPilot prototype, entities, hooks, and mock-provider components.
- `.bitmap` and `workspace.jsonc` preserve Bit workspace metadata.
- `pnpm-lock.yaml` belongs to the preserved component workspace.

The original prototype uses mock data and is not wired into the active standalone Node.js runtime. Preserve these files. Do not remove Bit configuration or regenerate the workspace as a shortcut for changing the active application.

## Current architecture limits

- The active server is designed for a single process. Per-server operation locks are process-local.
- The current app uses direct Discord REST requests. A Composio runtime adapter is not implemented.
- The application adds structure to an existing Discord server. It does not create a new Discord guild.
- The existing-server audit is read-only. Full move, rename, reorder, delete, and permission-edit operations are not implemented.
- The AI workflow is a manual prompt and JSON handoff. The app does not call an AI provider.

See the [development audit](../../development-audit-2026-10-30.md) (historical snapshot as of 2026-10-30) and its [follow-up](../../development-audit-2026-10-30-followup.md) before planning a larger change.
