---
title: "Install a Discord bot"
description: "Choose the shared Chaotic Minds Command bot or connect your own bot, authorize the required permissions, and confirm readiness."
---
Chaotic Minds Command needs a Discord bot installed in the selected server to audit its structure or create roles, categories, and channels. Depending on the deployment, you may use an operator-provided shared bot or connect a personal bot that you control.

## Choose which bot to use

- **Your own bot:** Follow [connect your own Discord bot](../../customer-bring-your-own-bot.md) to create a bot in the Discord Developer Portal, connect its token to your account, and assign it to a server.
- **Shared bot:** If the operator has configured a shared Chaotic Minds Command bot, use the installation link shown for the selected server.

You still sign in to Chaotic Minds Command with **Sign in with Discord**. A personal bot does not require a separate OAuth client secret or redirect URL.

## Requirements

- Sign in with a Discord account that owns the server or has Manage Server or Administrator permission.
- Be able to add the selected bot to the server.
- Be prepared to place the bot's role above the roles it may need to manage.
- For a personal bot, connect it to your account before installing it.

## Install the selected bot

1. **Select your server**
   Sign in to Chaotic Minds Command and choose the server you want to prepare.

2. **Select the bot**
   Choose your personal bot or the shared bot option, when available. For a personal bot, select **Use selected bot** to assign it to this server.

3. **Open the installation link**
   Select **Install bot in selected server** or use the installation link displayed when the app reports that the bot is not ready.

4. **Review Discord permissions**
   The bot requests Manage Channels and Manage Roles. It does not request Administrator. Stop if the authorization screen requests permissions beyond this documented scope.

5. **Complete installation**
   Authorize the selected bot for the intended server.

6. **Check role position**
   In Discord server settings, move the bot's role above the roles Chaotic Minds Command may need to create or manage. Discord role hierarchy can prevent a bot from managing roles above its own role.

7. **Return to Chaotic Minds Command**
   Reselect the server. The app checks the selected bot's readiness.

If the bot is still not ready, see [troubleshooting](../troubleshooting.md). Do not grant Administrator as a workaround.

## Use a different bot for another server

You can connect up to five personal bots. Your default bot is used unless a server has its own bot assignment. To change a server's bot, select the server, choose a connected bot, and select **Use selected bot**. Changing the default does not overwrite a server-specific assignment.

For token creation, connection, replacement, and removal steps, see [connect your own Discord bot](../../customer-bring-your-own-bot.md).
