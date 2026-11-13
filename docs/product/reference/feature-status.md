---
title: "Current feature status"
description: "See which Chaotic Minds Command capabilities are available today, the limits of the setup workflow, and features that are not currently implemented."
---
This page describes the functionality present in the current application baseline on the `main` branch. It separates implemented behavior from planned work and verification that still needs to happen.

## Available now

| Area | Current capability |
| --- | --- |
| Sign-in | Discord OAuth sign-in and sign-out |
| Server access | Lists servers the signed-in user can manage |
| Bot connections | Connect up to five customer-owned Discord bots per account; encrypted token storage; default and per-server assignments |
| Shared bot | Optional operator-configured shared bot remains supported |
| Bot readiness | Checks the selected bot's access and required permissions for a selected server |
| Templates | Community, Gaming, and Support built-in templates |
| Custom structure | Manually define roles, categories, and text channels with validated limits |
| Personal saved structures | Save up to 20 private layouts per Discord account; load them into the editor, rename them, or delete them |
| AI-assisted design | Build a constrained prompt, use an external AI assistant, and import its JSON response for review |
| Server audit | Read-only inventory and structural findings for roles, categories, and channels |
| Preview | Shows proposed role, category, and channel creation or reuse for built-in and custom structures |
| Preview binding | Binds a preview to the selected bot identity and the server permission context used to create it |
| Role review | Shows recognized permissions on reused roles and flags elevated or unrecognized permissions |
| Stale-preview protection | Rejects an apply when the relevant role, channel, or permission-overwrite context changes after preview |
| Apply | Requires an expiring, single-use, server-bound preview, exact confirmation phrase, and final browser confirmation |
| Safe creation | New roles have zero permissions and are not assigned to members |
| Reuse | Exact matching roles, categories, and channels are reused rather than duplicated |
| Notes | Shared server notes for current server managers |
| Persistence | Sessions, personal structures, notes, bot credentials, and bot assignments use persistent SQLite storage |
| Recovery tests | Offline tests cover application restart, clean-shutdown database copy recovery, mismatched keys, and corrupted encrypted records |
| Partial progress | Reports completed work when Discord operations fail and allows a fresh preview to reuse completed objects |

## Bring-your-own-bot boundaries

You can connect up to five personal bots to your signed-in Discord account. Chaotic Minds Command verifies each bot token with Discord and stores it encrypted at rest. The token is not returned in API responses. You can set a default bot and assign a different connected bot to an individual server.

Your normal Chaotic Minds Command Discord OAuth sign-in remains separate from your personal bot. You do not need to create a personal OAuth client secret or redirect URL. The selected bot must be installed in the server and have Manage Channels and Manage Roles before audit, preview, or apply.

Removing a personal bot deletes the stored credential and your account's server assignments. It does not revoke the token at Discord or remove the bot from Discord servers. See [connect your own Discord bot](../../customer-bring-your-own-bot.md).

## AI-assisted design boundaries

The AI-assisted workflow is a manual copy-and-paste handoff. Chaotic Minds Command does not call an AI provider, require an AI API key, or automatically send your server brief to an external service. You choose which external assistant to use.

The imported response is untrusted input. Only the supported role and category/channel structure is accepted. The existing server-side validator remains authoritative. Review and edit the imported names, then create a fresh preview. Importing does not contact Discord or create server objects.

Direct AI provider integration, automatic regeneration, saved AI designs, and AI-driven Discord actions are not available. Personal saved structures are separate from AI design and store only validated role, category, and channel layouts.

See [use AI-assisted structure design](../guides/ai-assisted-structure-design.md) for the complete workflow.

## Not currently implemented

The current product does not provide:

- Creating a new Discord guild or server through the app.
- Full revamping operations such as moving, renaming, reordering, or deleting existing server objects.
- Editing existing role permissions or configuring private-channel permission policies.
- Ticket systems.
- Moderation tools or automated moderation.
- Member onboarding or welcome messages.
- Automatic role assignment.
- Long-running Discord Gateway automations.
- Automatic deletion or rollback of created Discord objects.
- Direct in-app AI provider integration.

The existing-server audit is read-only. The setup workflow can add missing roles, categories, and channels to a server you already manage. It does not reorganize existing objects or provide a complete security assessment.

Do not treat a template or custom structure as a full server security configuration. Administrators still need to configure role permissions, channel visibility, and member assignments in Discord.

## Testing status

Automated tests use mocked Discord responses and offline fixtures. They do not contact real Discord servers.

Live OAuth, personal bot token connection, bot installation, permission hierarchy, and apply behavior still require a manual acceptance test in a new, disposable Discord server. Browser visual and accessibility testing, multi-process safety, and production backup recovery are also outstanding.

The application repository contains the current manual checklist. Follow it only in a temporary test server, never in a production or community server.
