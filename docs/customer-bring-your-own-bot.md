# Connect your own Discord bot

This guide explains how a signed-in account can connect up to five Discord bots that you personally control, and how the Chaotic Minds Command application verifies, stores, and removes those bot credentials.

> **Warning:** Bot tokens are secret credentials. Never paste a bot token into a public issue, screenshot, shared document, or chat message. Reset the token in the Discord Developer Portal if it may have been exposed.

## Before you begin

- You have a Discord account and can sign in to Chaotic Minds Command with it.
- You have or can create a Discord application with a bot user in the [Discord Developer Portal](https://discord.com/developers/applications).
- You understand what the bot will be allowed to do in your servers.
- You do not need to configure an OAuth client secret or redirect URL for your personal bot. Sign-in to Chaotic Minds Command still uses its own **Sign in with Discord** flow.

## Create a bot in the Discord Developer Portal

1. Open the [Discord Developer Portal](https://discord.com/developers/applications).
2. Select **New Application**, give it a name you recognize, and confirm.
3. Open the **Bot** tab.
4. Select **Reset Token** if you need a fresh secret, then copy it once and keep it safe.
5. Leave the application's public key, client secret, and redirect URIs unchanged. Chaotic Minds Command does not use your personal bot's OAuth configuration.

## Connect the bot token to Chaotic Minds Command

<!-- coderabbit-ai-generated:v1 -->

<!-- coderabbit-ai-generated-section:v1:f8120c5af4726bfffe9b83a6d5b06b43b51f78eec9f21760f11b216d2a77f1ee -->

1. Sign in to Chaotic Minds Command with your Discord account.
2. Open **Your Discord bots**.
3. Enter your bot's token.
4. Select **Verify and connect bot**.
5. Wait for verification. Chaotic Minds Command verifies the token with Discord and stores it encrypted at rest.

<!-- /coderabbit-ai-generated:v1 -->

If verification fails, check that the token was copied completely and that the bot still exists in the Developer Portal.

## Choose a default bot

<!-- coderabbit-ai-generated:v1 -->

<!-- coderabbit-ai-generated-section:v1:7de3e01b8ab8ce7ed6b7d781438325540c09fcb5998f1b54a4361db1c35974b7 -->

Connecting a bot automatically selects it as your default. The default is used for servers without their own bot assignment. To change it, clear the server selection by choosing **Choose a server**, choose a bot under **Your Discord bots**, and select **Use selected bot**. If a server is selected, **Use selected bot** changes that server’s assignment instead.

The default is a sign-in session setting. It persists while you stay signed in, but signing out, signing in again, or reaching the session expiry starts a session without a default. Servers without their own bot assignment then use the shared bot if one is configured, or have no selected bot. Select your default bot again after signing in.

<!-- /coderabbit-ai-generated:v1 -->

## Assign a bot to a server

You can assign a different connected bot to each server you manage.

1. Select the server you want to prepare.
2. In the bot selection area, choose the connected bot to use.
3. Select **Use selected bot**.

A server-specific bot assignment takes precedence over your default bot. Changing the default does not overwrite explicit assignments for individual servers.

## Verify before setup

Before running audit or setup for a server:

1. Confirm the selected bot is installed in that server.
2. Confirm the bot has Manage Channels and Manage Roles permissions.
3. Confirm the bot's role is above the roles the app may need to create or manage.
4. Do not grant Administrator as a workaround.

The app checks bot readiness before listing the server as ready.

## How your bot credential is handled

Chaotic Minds Command verifies the token with Discord, then stores it encrypted at rest with AES-256-GCM.

- The token is not returned in the bot list or any API response.
- The encrypted credential is scoped to the account that connected the bot.
- Removing a bot deletes its stored credential and your account's server assignments for that bot.
- Removing a bot does not reset the token at Discord, delete the application, or remove the bot from servers.

The key used to encrypt bot credentials is derived from the application's `SESSION_SECRET`. Keep that value stable across restarts; see the developer documentation for operational constraints.

## Replace or remove a connected bot

<!-- coderabbit-ai-generated:v1 -->

<!-- coderabbit-ai-generated-section:v1:ec97e91cde46fe0a42023f552623f5612af176c3724a10006bc2edb3f9e36230 -->

To disconnect a bot, open **Your Discord bots**, select the connected bot, and choose **Remove selected personal bot**. Confirm the browser prompt.

<!-- /coderabbit-ai-generated:v1 -->

Removing a bot:

- Deletes the stored encrypted credential from Chaotic Minds Command.
- Removes your account's server assignments for that bot.
- Leaves the Discord application and bot user intact; you can reconnect the same bot again later.
- Does not revoke the Discord token. Reset the token in the Developer Portal if you no longer want it usable.

Before removing a bot, note which servers use it. Removal deletes its per-server assignments, and Chaotic Minds Command does not show a bot's server assignments anywhere, so you would need to reassign each server afterward from your own notes.

<!-- coderabbit-ai-generated:v1 -->

<!-- coderabbit-ai-generated-section:v1:0924f9470b5b75e3c18446bd9f50c004f1dc4a25bdf44ca0699999aa16527145 -->

To replace a token:

1. Reset the token in the Discord Developer Portal and copy the new token.
2. Remove the old connection in Chaotic Minds Command using **Remove selected personal bot**. Removing it also deletes its server assignments.
3. Connect the bot again using the new token. Reconnecting makes it your default bot, even if it was not the default before removal. If you previously used a different default, restore it so servers without a bot assignment continue using the intended bot: choose **Choose a server** to clear the server selection, choose your previous default under **Your Discord bots**, and select **Use selected bot**.
4. Restore each server assignment by selecting the server, choosing the reconnected bot, and selecting **Use selected bot**.

To reuse a bot after removal without resetting its token, connect the existing token again, restore your previous default if needed as described above, and restore any server assignments.

<!-- /coderabbit-ai-generated:v1 -->

## Test in a disposable server

Before using a new personal bot in a live community:

1. Create a new, empty test Discord server where you are the owner.
2. Install your bot in that test server.
3. Connect the token and complete a full template setup in the test server.
4. Verify roles and channels appear as expected before using the bot in a real server.

Never use a production, customer, or active community server for first-time acceptance testing.

## Troubleshooting

### Token verification failed

- Confirm the token was copied completely, with no spaces or truncation.
- Confirm the bot still exists in the Discord Developer Portal.
- If the bot is already connected, follow the [token replacement steps](#replace-or-remove-a-connected-bot). Otherwise, reset the token in the Developer Portal and connect the new token.

### The bot is not ready for a server

- Confirm the bot is actually installed in the selected server.
- Confirm the bot has Manage Channels and Manage Roles.
- Confirm the bot's role is above the roles the app needs to manage.
- Confirm you have Manage Server or Administrator permission in that server.

Do not grant Administrator as a workaround.

### The wrong bot is being used

- Check whether the server has its own bot assignment. A server-specific assignment takes precedence over your default bot.
- Select the server, choose the intended connected bot, and select **Use selected bot**.
- Verify the bot is installed and ready in that server.

### I removed a bot, but it is still in my Discord server

Removing a connection in Chaotic Minds Command deletes the stored credential and your account's server assignments for that bot. It does not revoke the token at Discord or remove the bot itself from your server. If you no longer want the bot on a server, remove it in Discord as well (Server Settings > Members, or kick the bot from the server).

### The bot token may have been exposed

If a token was pasted somewhere public, reset it immediately in the Discord Developer Portal (**Bot** > **Reset Token**). Resetting a token invalidates the previous one permanently. Then follow the remaining [token replacement steps](#replace-or-remove-a-connected-bot) to remove the old connection, reconnect, and restore its server assignments.

## Storage boundaries

- Up to five personal bots per signed-in account.
- Each credential is encrypted at rest and readable only through the application.
- Credentials are scoped to the account that connected them and are not shared between accounts.
- The application does not return bot tokens in any API response.
