# Operator notes: customer-owned Discord bots

This document is for operators maintaining Chaotic Minds Command. It describes the security and operational requirements for the Bring Your Own Bot feature.

## Configuration

Discord OAuth sign-in still uses the operator-configured application:

- `DISCORD_CLIENT_ID`
- `DISCORD_CLIENT_SECRET`
- `SESSION_SECRET`

The shared `DISCORD_BOT_TOKEN` is now optional. If configured, it remains available as the shared bot choice. Customers can connect personal bots without the operator supplying a shared bot token.

`SESSION_SECRET` must be at least 32 characters. The existing AES-256-GCM encryption key is derived from this secret. Keep it stable and protect it like a master encryption key. Changing or losing it makes existing encrypted customer bot tokens and encrypted sessions unreadable. Back up the secret securely with the persistent application data and document the recovery procedure. Never put it in the repository.

## Production requirements

- Serve the app over HTTPS. Production startup rejects a non-HTTPS `APP_ORIGIN`.
- Use persistent, private storage for the SQLite database.
- Keep the SQLite database and its backups private. They contain encrypted customer bot tokens.
- Protect the `SESSION_SECRET` separately from the database. A database backup without its matching secret cannot restore connected bot credentials.
- Do not log request bodies, authorization headers, bot tokens, or decrypted credentials at the application or reverse-proxy layer.
- Configure reverse-proxy request and rate limiting. Bot token verification calls Discord and must not be exposed to unbounded automated attempts.
- Keep the app to one running instance. Its setup lock is process-local.
- Restrict filesystem access to the application account and keep data directories private.

## Credential lifecycle

When a customer connects a bot:

1. The authenticated Discord user submits a bot token through a same-origin, CSRF-protected POST request.
2. The application verifies the token against Discord's current-user endpoint.
3. The application confirms Discord identifies the account as a bot.
4. The token is encrypted with AES-256-GCM before being written to the account-scoped `user_bots` table.
5. API responses return bot identity metadata only. They do not return the token or ciphertext.

Every bot lookup is scoped by the authenticated Discord user ID. Per-server assignments are scoped by both the user ID and server ID. A customer cannot select or delete another customer's stored bot by supplying its record ID.

The application supports up to five personal bots per account. Deleting a connected bot removes its credential record and that account's server assignments. It does not revoke the token at Discord or remove the bot from Discord servers.

If a customer reports a compromised token, tell them to reset it in the Discord Developer Portal. Removing the stored credential from Chaotic Minds Command does not invalidate a token that has already been copied.

## Permission model

Chaotic Minds Command requests only:

- Manage Channels
- Manage Roles

It does not request Administrator. Existing server authorization still requires the signed-in user to have Manage Server permission. Bot readiness is checked against the selected bot's actual guild role permissions.

The selected bot is resolved per server. An account may set a default bot and override it for individual servers. Personal bot records and server assignments must remain owner-scoped.

## Acceptance testing

Use a new disposable Discord server and a test bot. Never perform first-run acceptance testing against a production, customer, or active community server.

Verify:

- A user can connect a valid bot token.
- Invalid tokens and non-bot Discord accounts are rejected.
- The token is encrypted at rest and never appears in API responses.
- One account cannot list, select, assign, or delete another account's bot.
- Two different servers can use different connected bots.
- Installation links use the selected bot's application ID.
- The selected bot must be installed and have Manage Channels and Manage Roles before audit, preview, or apply.
- Preview remains read-only.
- Apply retains the existing exact confirmation, single-use preview, stale-plan check, and additive-only behavior.
- Removing a bot deletes the account's server assignments but does not call Discord to remove or modify server objects.

Automated tests use mocked Discord API responses. They do not replace live acceptance testing.

## Known operational constraints

- OAuth sign-in tokens expire. Users may need to sign in again when their Discord authorization expires.
- Discord setup operations are not transactional. A failed apply can leave partial objects in the server.
- New channels may be visible to members according to existing server/category visibility.
- The read-only audit does not calculate effective member visibility and is not a complete security assessment.
- The application is single-instance because its setup lock is process-local.

## Preview binding and in-flight bot changes

A setup preview is bound to the selected stored credential ID and Discord bot ID. Switching the default or per-server bot after preview requires a new preview; apply rejects the stale confirmation before any Discord writes. This is enforced server-side, including per-server assignment changes from another session.

Each snapshot and apply operation captures one bot credential. Changing an assignment while an apply is already running does not switch the credentials used by the remaining writes. The assignment affects the next operation; it does not cancel an active operation. Removal from local storage is not Discord token revocation. Revoke a compromised token in the Discord Developer Portal.

The preview fingerprint covers the canonical role/channel inventory, including role permissions, positions, parent relationships, and channel/category permission overwrites. Inventory order alone does not invalidate it. A changed inventory requires a fresh review. These checks do not calculate effective member visibility, make Discord writes transactional, or prevent external changes after the final preflight. Run one process/replica only.

Offline regression coverage includes default-bot changes, cross-session per-server bot changes, in-flight credential consistency, permission-context changes, order-independent fingerprints, and apply rejection after overwrite drift. Live acceptance remains a separate approval-gated activity.
