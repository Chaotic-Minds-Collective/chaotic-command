---
title: "Understand external integrations"
description: "Learn how Chaotic Minds Command connects to Discord, GitHub, and external AI tools, and what remains unimplemented today."
---
Chaotic Minds Command currently relies on Discord for authentication and server operations. GitHub is the source of truth for both application code and product documentation. Composio is being evaluated as an integration layer, but it is not part of the active application runtime.

## Discord

The application uses Discord OAuth for user sign-in and server listing. It uses Discord REST API requests for bot verification, server inventory, setup previews, and approved structure changes.

The current OAuth flow requests the identity and server-list access required by the app. A selected shared or customer-owned bot performs server operations. Customer-owned bot tokens are encrypted at rest and scoped to the account that connected them.

apps/command does not use a long-running Discord Gateway connection or privileged Gateway intents. The separate bot gateway runtime is documented in [discord-bot-gateway.md](../../discord-bot-gateway.md).

## Composio status

Composio is not currently wired into `apps/command`. The active server makes direct Discord REST requests. A connected Composio workspace or operator account does not automatically become available to every person using a deployed Chaotic Minds Command instance.

Before adding a Composio adapter, define:

- Which end-user account owns each external connection.
- How Discord server access is scoped to the signed-in Chaotic Minds Command account.
- Which Composio tools are allowed for each operation.
- How read-only audit and preview remain separate from writes.
- How the user reviews and confirms each server mutation.
- How tool failures, partial progress, and retries are recorded.
- How the adapter is tested offline without live Discord writes.

Do not route a user's Discord token through an operator-owned connection unless the ownership and consent model explicitly supports that design.

## GitHub

The application repository is [Chaotic-Minds-Collective/cc-command-site](https://github.com/Chaotic-Minds-Collective/cc-command-site). Treat its `main` branch as the implementation source of truth.

Product documentation is maintained in this repository under docs/product/, alongside the application code.

## Documentation location

Product documentation lives in this repository at docs/product/ and follows the same review process as application code: changes ship through a branch and pull request. Guides cover end users, server owners, administrators, and developers.

Keep product documentation aligned with the implementation on the application's `main` branch. Mark proposed or unmerged functionality as planned or in review, never as available.

## External AI assistants

The current AI-assisted design flow builds a constrained prompt for the user to copy into an external assistant. The user pastes the returned JSON into Chaotic Minds Command for validation and review.

The app does not call an AI provider, store an AI API key, or automatically send the user's brief to an external service.
