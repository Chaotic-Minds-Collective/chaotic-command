---
title: "Run and test the application locally"
description: "Set up the dependency-free Node.js application, configure local Discord credentials, run its test suite, and understand what the tests do not cover."
---
Use Node.js 24 or newer to run the active Chaotic Minds Command application locally. The runtime uses built-in Node.js HTTP, crypto, and SQLite modules, so it does not require installing application dependencies.

## Requirements

- Node.js 24 or newer.
- A local checkout of [Chaotic Minds Command on GitHub](https://github.com/Chaotic-Minds-Collective/cc-command-site).
- A Discord application for OAuth sign-in when you need to test authenticated workflows.
- A disposable Discord server for any manual live acceptance test.

The active application does not require a Bit account or a frontend compilation step.

## Configure the local environment

Copy the example environment file:

```bash
cp .env.example .env
```

Set the values needed for your local test:

| Variable | Purpose |
| --- | --- |
| `PORT` | Local HTTP port. Defaults to `3000`. |
| `APP_ORIGIN` | The exact local or deployed application origin used by OAuth and request checks |
| `DISCORD_CLIENT_ID` | Application ID for the Chaotic Minds Command OAuth application |
| `DISCORD_CLIENT_SECRET` | OAuth client secret for the Chaotic Minds Command application |
| `DISCORD_BOT_TOKEN` | Optional operator-configured shared bot token |
| `SESSION_SECRET` | Stable secret used to encrypt stored sessions and bot credentials |
| `DATA_DIR` | Private directory for the SQLite database. Defaults to `.data`. |
| `NODE_ENV` | Use `development` locally. Production requires HTTPS. |

Generate a strong session secret locally:

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Keep the resulting value private. Do not commit `.env`, paste credentials into issues, or put tokens in browser code.

## Run the application

Start the development server with automatic restart:

```bash
npm run dev
```

Or start it without watch mode:

```bash
npm start
```

If you configure Discord OAuth locally, first register the callback URL `http://localhost:3000/auth/callback` as a redirect URI in your Discord application's OAuth2 settings.

Open `http://localhost:3000` for the public product homepage. Open `http://localhost:3000/command` for the command workspace. Without OAuth configuration, the workspace explains the missing configuration and safely disables sign-in. OAuth completion returns signed-in users to `/command`; the callback URL remains `http://localhost:3000/auth/callback` for this local origin.

## Run checks

Run the syntax checks:

```bash
npm run check
```

Run the complete offline test suite:

```bash
npm test
```

The test script uses Node's built-in test runner and discovers `apps/command/test/*.test.mjs`. The PR #15 verification record reports 36 passing tests on Node.js v24.22.1.

## What the tests cover

The suite uses mocked Discord responses, in-memory or temporary SQLite databases, and loopback HTTP. It covers application routes, OAuth state and session behavior, account isolation, bot credential encryption, setup previews, apply safeguards, audit behavior, persistence across restart, clean-shutdown database-copy recovery, and failure handling for mismatched or corrupted encrypted data.

The tests do not use real Discord credentials or write to a live Discord server.

## What still requires manual verification

Use a new, disposable Discord server for live acceptance. Verify OAuth, personal bot token connection, installation, role hierarchy, audit, preview, stale-preview rejection, and apply behavior. Do not use an active community or customer server.

The preserved Bit workspace has its own toolchain. The root Node.js scripts do not build or type-check the React/TypeScript components in `design/` and `guildpilot/`.
