# Chaotic Minds Command Discord Bot (shared bot)

HTTP-only Discord bot for the Chaotic Minds Collective ecosystem, hosted on
Cloudflare Workers (free tier, no gateway process, no spin-down).

- Interactions: slash commands + buttons/selects/modals via the Interactions Endpoint
- Webhook events: onboarding DM on APPLICATION_AUTHORIZED
- Components v2 (Containers / Text Display) for the Chaotic branded look
- State: Supabase REST (bot_guilds, bot_tickets, bot_pending) - shared with the command center
- Zero npm dependencies; tests via node:test

## Files

- src/index.js - Worker entry: signature verification, routing, /register
- src/commands.js - slash command definitions (7 commands)
- src/handlers.js - setup / welcome / tickets / moderation / announcements / config / help
- src/lib.js - Ed25519 verification + component builders + Discord REST wrapper
- src/store.js - Supabase REST client
- migrations/001_bot_tables.sql - Supabase tables + RLS
- test/bot.test.mjs - 12 end-to-end tests with mocked Discord + Supabase

## One-time setup checklist (Developer Portal)

1. Reuse the existing idle bot application, rename it "Chaotic Minds Command".
   - General Information: copy Application ID and Public Key.
   - Bot tab: Reset Token, store it in 1Password (never in chat or git).
2. Installation page: enable Guild Install AND User Install.
   - Guild default: scopes bot + applications.commands; permissions: Manage Channels,
     Manage Roles, Manage Messages, Send Messages, Embed Links, Read Message History,
     Use Slash Commands, Kick Members, Ban Members, Moderate Members.
   - User default: scope applications.commands.
3. No privileged gateway intents are needed (HTTP-only bot).
4. After first deploy: set the Interactions Endpoint URL to the workers.dev URL.
5. App settings -> Webhooks: same URL; enable events; subscribe
   APPLICATION_AUTHORIZED and APPLICATION_DEAUTHORIZED.
<!-- coderabbit-ai-generated:v1 -->

<!-- coderabbit-ai-generated-section:v1:92b720dbbb8d90fe67f051ea299bc0e925f54a46d37487b162208ac700277240 -->

6. Before deployment, configure the Worker bindings listed below. Repository
   secrets alone do not create Worker bindings; no bot deployment workflow is
   currently checked in.

## Database setup

Before deploying, apply `migrations/001_bot_tables.sql` to the target Supabase
project using its SQL editor. This creates `bot_guilds`, `bot_tickets`, and
`bot_pending` and enables RLS. Use that same project's URL and service role key
for the Worker bindings.

## Worker configuration

In Cloudflare's Worker settings, configure these bindings before storage requests
or `/setup` run:

- `SUPABASE_URL`: the Supabase project URL (for example,
  `https://<project-ref>.supabase.co`), as a text variable.
- `SUPABASE_SERVICE_KEY`: the Supabase service role key, as a secret.
- `DISCORD_BOT_TOKEN`, `DISCORD_PUBLIC_KEY`, `DISCORD_APPLICATION_ID`: the values
  copied from the Developer Portal, as secrets.
- `REGISTER_SECRET`: a private shared secret used only for command registration.

If configuring a future deployment workflow, map repository secrets
`BOT_SUPABASE_SERVICE_KEY`, `BOT_DISCORD_TOKEN`, `BOT_DISCORD_PUBLIC_KEY`,
`BOT_DISCORD_APPLICATION_ID`, and `BOT_REGISTER_SECRET` to the Worker names above.
`BOT_WORKER_URL` identifies the deployed Worker URL for registration; it is not a
storage binding.

## Deploy

There is currently no automated bot deployment workflow. The former
`apply-discord-bot.yml` bootstrap ran only on `feature/discord-bot` and was removed
after applying the files; pushing to `main` does not deploy this Worker.

To deploy manually, use an authenticated Wrangler installation from this directory
with `wrangler.toml` (entry point `src/index.js`). Apply the database migration and
configure the Worker bindings above, then run `wrangler deploy`. Set the Developer
Portal endpoint URLs to the deployed Worker URL.

Register slash commands by sending `POST /register` to the deployed Worker with
an `X-Register-Secret` header containing the configured `REGISTER_SECRET`.
Registration uses this shared secret and does not require a Discord signature;
interaction and webhook requests still require Discord signatures.



<!-- /coderabbit-ai-generated:v1 -->## Known limit

Discord does not deliver member-join events over webhooks, so welcome-on-join
needs a Gateway connection (Durable Object or a small gateway microservice).
Welcome configuration, preview and test work fully over HTTP today.
