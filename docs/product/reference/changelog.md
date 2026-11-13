---
title: "Chaotic Minds Command changelog"
description: "Track verified Chaotic Minds Command functionality and product changes, with clear notes about safety improvements and features that remain unreleased."
---
This changelog records functionality and engineering changes merged into the Chaotic Minds Command `main` branch. Proposed work and unmerged branches are not described as released features.

## November 1, 2026

### Public product homepage and command workspace

Merged in [PR #17](https://github.com/Chaotic-Minds-Collective/Chaotic-Command/pull/17) as commit `50bcdcd04e91d5d6006585e706d7a94afa3fa194`.

- Add a public product homepage at `/` with copy that describes the current MVP rather than planned capabilities.
- Keep the command workspace at `/command` and return users there after Discord OAuth sign-in.
- Add responsive local homepage styling without external font or script dependencies.
- Label the dashboard artwork as illustrative rather than live account data.
- Add offline tests for the homepage, stylesheet, workspace route, app assets, and OAuth redirect.

This is a merged source change, not confirmation of production deployment or live Discord acceptance. It does not change Discord API permissions, authentication ownership, SQLite storage, credential encryption, preview binding, or apply safeguards. See the [development audit](../../development-audit-2026-10-30.md) (historical snapshot as of 2026-10-30) and its [follow-up](../../development-audit-2026-10-30-followup.md) for the latest verification and deployment limits.

## October 30, 2026

### Customer-owned Discord bots

Merged in [PR #12](https://github.com/Chaotic-Minds-Collective/Chaotic-Command/pull/12).

- Connect up to five personal Discord bots to one signed-in account.
- Verify bot tokens with Discord and encrypt credentials at rest.
- Set a default bot and assign different bots to individual servers.
- Keep the optional operator-configured shared bot available.
- Request Manage Channels and Manage Roles, not Administrator.

See [connect your own Discord bot](../../customer-bring-your-own-bot.md).

### Customer and operator acceptance guidance

Updated in [PR #13](https://github.com/Chaotic-Minds-Collective/Chaotic-Command/pull/13).

- Updated the disposable-server runbook for customer-owned bots.
- Clarified the separation between Chaotic Minds Command OAuth sign-in and personal bot credentials.
- Added acceptance steps for token handling, bot assignment, account isolation, and removal.

### Preview identity and permission-context binding

Merged in [PR #14](https://github.com/Chaotic-Minds-Collective/Chaotic-Command/pull/14).

- Bind setup previews to the selected bot identity.
- Capture one selected bot credential for an active snapshot or apply operation.
- Include the relevant role, channel, and permission-overwrite context in the preview fingerprint.
- Reject stale plans when that context changes before apply.

These safeguards supplement the existing expiry, single-use, server-bound preview and explicit confirmation workflow. They do not prevent Discord changes that occur after the final preflight check.

### Persistent account data

Merged in [PR #15](https://github.com/Chaotic-Minds-Collective/Chaotic-Command/pull/15).

- Keep personal saved structures, shared server notes, connected bot credentials, and per-server bot assignments in persistent application storage.
- Keep customer-owned bot credentials encrypted at rest.
- Preserve account ownership boundaries when data is loaded after an application restart.

The change also adds offline coverage for clean-shutdown recovery and fail-closed behavior when encrypted data cannot be decrypted. It does not establish live Discord acceptance, hot-backup recovery, or production readiness.

## Current baseline

The current application includes:

- Public product homepage at `/` and a separate command workspace at `/command`.
- Discord sign-in and sign-out, with OAuth returning users to the command workspace.
- Server listing limited to users with Manage Server or Administrator permission.
- Customer-owned bot connections, encrypted token storage, a default bot, and per-server bot assignments.
- Optional operator-configured shared bot support.
- Bot readiness checks for Manage Channels and Manage Roles.
- Community, Gaming, and Support setup templates.
- Manual custom structures for roles, categories, and text channels.
- Personal saved structures, with up to 20 validated layouts per Discord account.
- AI-assisted prompt generation and JSON import through a user-directed external AI handoff.
- Read-only server audit for supported role, category, and channel findings.
- Preview of built-in and custom plans, including Create and Reuse results.
- Existing-role permission visibility and elevated-permission warnings.
- Preview binding to bot identity and permission context.
- Explicit confirmation before Discord writes.
- Reuse of exact matches, with stale-preview rejection.
- Shared server notes for current server managers.
- SQLite persistence for application sessions, saved structures, notes, bot credentials, and bot assignments.
- Partial-progress reporting when Discord operations fail.

## Important behavior and safety boundaries

- New roles are created with zero permissions and are not assigned to members.
- Existing roles are reused without changing their permissions.
- New channels inherit category or server visibility and may be public.
- The setup flow does not delete existing objects, post messages, configure private-channel permissions, or roll back partial work.
- The existing-server audit is read-only and does not calculate effective member visibility.
- AI import only fills the editable structure fields. It does not create a preview or write to Discord.
- Loading a personal saved structure only fills the editor. It does not create a preview or write to Discord.
- Removing a connected personal bot does not revoke its token or remove it from Discord servers.

## Not a release entry

The application does not yet create new Discord guilds, perform full existing-server reorganization, run moderation or ticket workflows, configure private-channel policies, or run long-lived automations. See [current feature status](feature-status.md) for the complete scope.

The original Bit/React design workspace remains preserved separately from the active Node.js runtime. The public homepage work was ported from `website/rebuild-foundation` to a main-based branch and merged through PR #17. Use the inspected `main` baseline in the [development audit](../../development-audit-2026-10-30.md) (historical snapshot) and its [follow-up](../../development-audit-2026-10-30-followup.md), not the older branch, to determine current behavior.

## Keeping this history current

When a user-visible feature changes on the main application branch, add an entry describing what changed, who it affects, and any new limitation or migration step. Keep this page aligned with the [current feature status](feature-status.md). Link the corresponding application pull request or release when one exists and has been verified.
