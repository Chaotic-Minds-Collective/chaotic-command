---
title: "Run a safe server setup"
description: "Use a disposable Discord server first, review every proposed change, and understand the limits of Chaotic Minds Command before applying a template."
---
As the server owner, you are responsible for deciding whether a proposed setup is appropriate for your community. Chaotic Minds Command provides a preview and explicit confirmation, but Discord changes still require your review.

## Test in a disposable server

For first-time testing or acceptance checks, create a new, empty Discord server. Do not use a production, customer, or active community server to test live OAuth, bot installation, or apply behavior.

## Before applying to a real server

- Confirm the selected server.
- Confirm the bot only has the documented Manage Channels and Manage Roles permissions.
- Confirm the bot role is positioned correctly.
- Review every proposed role, category, and channel.
- Inspect permissions on every reused role.
- Resolve elevated or unrecognized permission warnings.
- Decide how new channels should be restricted before members use them.

## Understand the safety boundaries

Chaotic Minds Command is additive. It creates missing objects and reuses exact matches. It does not delete existing roles or channels, modify permissions on reused roles, assign roles to members, post messages, or configure private-channel access.

Discord operations are not transactional. If an error occurs partway through setup, some objects may already have been created. The app reports completed work. Inspect the server and create a fresh preview before retrying.

## Keep access under your control

Only people who currently manage the server can use its setup workflow and shared notes. Do not share your Discord credentials or bot secrets with other people. Do not store secrets in server notes.

For the detailed first-use sequence, see [get started](../quickstart.md).
