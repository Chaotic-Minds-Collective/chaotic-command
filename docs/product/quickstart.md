---
title: "Get started with Chaotic Minds Command"
description: "Use Chaotic Minds Command for the first time: sign in with Discord, select a server, install the bot, preview a template, and confirm setup."
---
Use this quickstart to create your first reviewed server setup with Chaotic Minds Command. You need a Discord account that owns the server or has Manage Server permission, plus the ability to install the Chaotic Minds Command bot.

> **Warning:** Test the workflow in a new, disposable Discord server first. Do not use a production, customer, or active community server for acceptance testing.

## Before you begin

- Open the Chaotic Minds Command instance provided by the person who operates it.
- Sign in with the Discord account that manages the server.
- Have permission to add the bot to the server.
- Be prepared to review role permissions and channel visibility yourself.

## First setup

1. **Sign in with Discord**
   Select the sign-in option and authorize Chaotic Minds Command. The app lists servers where your Discord account has Manage Server or Administrator permission.

2. **Choose a server**
   Select the server you want to prepare. If it does not appear, confirm that you are signed in to the correct Discord account and have the required server permission.

3. **Install the bot**
   Chaotic Minds Command can only provide an installation link when a bot is available. When no shared bot is configured, connect or select a personal bot first (see [connecting your own bot](../customer-bring-your-own-bot.md)).
   If the server status says the bot is not ready, use the installation link shown by Chaotic Minds Command. The bot requests Manage Channels and Manage Roles, not Administrator. After installation, return to the app and select the server again.

4. **Choose a built-in template or custom structure**
   Select Community, Gaming, Support, or Custom structure. For the manual editor format, see [build a custom server structure](guides/custom-server-structure.md).

5. **Preview the changes**
   Select the preview action. Read every Create and Reuse item, inspect existing role permissions, and review any warning. Previewing does not change Discord.

6. **Confirm the setup**
   Type the exact `APPLY <server-id>` phrase shown by the app, then accept the final browser confirmation. Only then does Chaotic Minds Command send the listed create requests to Discord.

## After setup

Review the completed result in the app and in Discord. New roles have zero permissions and are not assigned to members. Review the new channels' visibility before inviting members to use them.

If a setup only partly completes, read the [troubleshooting guide](troubleshooting.md) and create a fresh preview before retrying.
