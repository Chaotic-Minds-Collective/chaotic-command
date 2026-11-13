# Chaotic Minds Command documentation index

## Product guides (docs/product/)

End-user and operator documentation for Chaotic Minds Command itself - previously hosted separately. Start at [product/index.md](product/index.md); the guide set covers:

| Area | Guides |
| --- | --- |
| Getting started | [quickstart](product/quickstart.md), [FAQ](product/faq.md), [troubleshooting](product/troubleshooting.md) |
| Server owners | [install the bot](product/owners/install-the-bot.md), [safe setup](product/owners/safe-setup.md) |
| Administrators | [role permissions](product/admins/role-permissions.md), [channel visibility](product/admins/channel-visibility.md) |
| Members | [what to expect](product/members/what-to-expect.md) |
| In-depth guides | [preview and review](product/guides/preview-and-review.md), [custom server structure](product/guides/custom-server-structure.md), [apply setup](product/guides/apply-setup.md), [choose a server template](product/guides/choose-server-template.md), [AI-assisted structure design](product/guides/ai-assisted-structure-design.md), [saved server structures](product/guides/saved-server-structures.md), [server notes](product/guides/server-notes.md) |
| Reference | [feature status](product/reference/feature-status.md), [product changelog](product/reference/changelog.md) |
| Development | [architecture](product/developers/architecture.md), [local development](product/developers/local-development.md), [integrations](product/developers/integrations.md), [security and operations](product/developers/security-and-operations.md) |

## Technical documentation

| Document | Covers |
| --- | --- |
| [customer-bring-your-own-bot.md](customer-bring-your-own-bot.md) | Connecting and operating a customer-owned Discord bot (credentials, storage, removal behavior) |
| [discord-bot-gateway.md](discord-bot-gateway.md) | Discord bot gateway architecture and connection lifecycle |
| [development-audit-2026-10-30.md](development-audit-2026-10-30.md) | Historical audit snapshot (2026-10-30): verified behavior, limits, and next steps as of that date; see the [follow-up](development-audit-2026-10-30-followup.md) for later status |
| [development-audit-2026-10-30-followup.md](development-audit-2026-10-30-followup.md) | Follow-up audit covering changes landed after the October 30 snapshot |
| [role-permissions.md](product/admins/role-permissions.md) | Role permission model and safe operations guidance (product guide) |
| [local-development.md](product/developers/local-development.md) | Local setup, environment variables, and runtime configuration (product guide) |

## Conventions

- Documentation changes go through a branch and pull request, like code.
- Product guides describe the current `main` baseline; mark unmerged work as planned or in review, never as available.
- Keep the changelog entries factual about what merged; do not describe proposals as shipped features.
