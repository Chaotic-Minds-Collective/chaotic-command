---
title: "Frequently asked questions"
description: "Answers about Chaotic Minds Command access, bot permissions, personal bots, templates, custom structures, AI-assisted design, and previews."
---
## Who can use Chaotic Minds Command?

A signed-in Discord user must own the selected server or have Manage Server or Administrator permission. Ordinary server members do not have access to the setup workflow.

## Can I use my own Discord bot?

Yes. Create a bot in the Discord Developer Portal, then connect its bot token under **Your Discord bots** in Chaotic Minds Command. You can connect up to five personal bots and assign a different bot to each server. See [connect your own Discord bot](../customer-bring-your-own-bot.md).

## Do I need to create an OAuth app for my personal bot?

No. You still sign in to Chaotic Minds Command using its normal **Sign in with Discord** button. Your personal bot only needs its bot token. You do not need to provide its client secret or configure an OAuth redirect URL for it.

## Is my bot token visible after I connect it?

No. Chaotic Minds Command verifies the token with Discord and stores it encrypted at rest. The token is not returned in the bot list. Treat it like a password and reset it in the Discord Developer Portal if it may have been exposed.

## Can I connect more than one bot?

Yes. You can connect up to five personal bots to your account. Set a default bot and optionally assign a different connected bot to each server.

## If I change my default bot, will it change every server?

No. A server-specific bot assignment takes precedence. Changing the default does not overwrite explicit assignments for individual servers.

## Does removing a bot revoke its Discord token?

No. Removing a personal bot deletes its stored credential and your server assignments from Chaotic Minds Command. It does not reset the token, delete the Discord application, or remove the bot from servers. Reset an exposed token in the Developer Portal.

## Does the bot need Administrator?

No. The bot requests Manage Channels and Manage Roles. Do not grant Administrator as a workaround.

## Can I define my own roles and channels?

Yes. Choose **Custom structure** and enter role names, category names, and text channel names manually. You can also import a structure suggested by an external AI assistant. The editor has validation limits and uses the same preview and confirmation safeguards as built-in templates. See [build a custom server structure](guides/custom-server-structure.md).

## Can I save a custom structure and reuse it later?

Yes. You can save up to 20 personal structures to your signed-in Discord account. You can load a saved structure into the custom editor, rename it, or delete it. Templates are private to the account that saved them. Loading only fills the editor and does not change a Discord server. See [save and reuse personal server structures](guides/saved-server-structures.md).

## Are saved structures shared with other server managers?

No. Personal saved structures are visible only to the Discord account that saved them. They are not shared with other managers of a Discord server.

## Does loading a saved structure create Discord channels or roles?

No. Loading replaces the custom editor fields only. You must select a server, create a fresh preview, review the proposed changes, and complete the normal confirmation steps before the app makes Discord changes.

## Does Chaotic Minds Command connect directly to ChatGPT or another AI provider?

No. The current AI-assisted workflow builds a prompt that you copy into an external AI assistant. You then paste the assistant's JSON response into Chaotic Minds Command. The app does not make AI API calls, require an AI API key, or automatically transmit your server brief.

## Is AI-generated content applied automatically?

No. The imported JSON only fills the editable role, category, and channel fields. Review and edit the result, then create a fresh preview. Discord changes still require the normal exact confirmation phrase and final browser confirmation.

## What can the AI response configure?

Only role names, category names, and text channel names are accepted. Permission values, role assignments, private-channel rules, IDs, code, and extra fields are rejected. The server-side validator remains authoritative.

## Does custom structure setup configure permissions?

No. Custom structures define names and category membership only. New roles start with zero permissions and are not assigned to members. New channels inherit category or server visibility and may be public.

## Does Chaotic Minds Command assign roles to members?

No. New roles start with zero permissions and are not assigned to members. An administrator configures and assigns roles in Discord.

## Does it change existing role permissions?

No. Exact matching roles are reused without changing their permissions. The preview displays recognized permissions and flags elevated or unrecognized permissions for review.

## Are new channels private?

Not automatically. New channels inherit category or server visibility and may be public. Chaotic Minds Command does not configure private-channel permission overwrites. Review access in Discord before members use the channels.

## Does previewing change my server?

No. Previewing only displays the proposed plan. Discord writes happen only after you enter the exact confirmation phrase and accept the final browser confirmation.

## Can Chaotic Minds Command delete or roll back changes?

No. The setup flow is additive and does not delete existing objects. Discord writes are not transactional, so a partial failure may leave completed objects in the server. Inspect the result and preview again before retrying.

## Does it send welcome messages or moderate members?

No. Automated welcome messages, moderation, ticket systems, member onboarding, and long-running automations are not part of the current feature set.

## What are server notes for?

Server notes let current server managers save and revisit non-sensitive reminders associated with a server. Notes do not activate automations. Never store secrets or sensitive member information in them.

## Where can I see what is currently available?

See [current feature status](reference/feature-status.md) and the [changelog](reference/changelog.md).
