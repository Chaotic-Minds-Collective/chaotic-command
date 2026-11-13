---
title: "Troubleshoot common setup problems"
description: "Resolve common Chaotic Minds Command issues with Discord sign-in, missing servers, bot readiness, permission warnings, expired previews, and partial setup."
---
Use this guide when Chaotic Minds Command cannot list your server, the bot is not ready, or a setup preview cannot be applied.

## I cannot sign in

Confirm that you are using the Discord sign-in option provided by your Chaotic Minds Command instance. If sign-in is unavailable or disabled, contact the person who operates that instance. The Discord connection may not be configured.

## My server is missing

- Confirm you signed in with the correct Discord account.
- Confirm that the account owns the server or has Manage Server or Administrator permission.
- Refresh the server list after correcting your Discord access.

## The bot is not ready

Use the installation link shown by Chaotic Minds Command for the selected server. Confirm the bot was added to that server with Manage Channels and Manage Roles. Move the bot's role above the roles it needs to create, then return to Chaotic Minds Command and reselect the server.

Do not grant Administrator as a workaround.

## The preview shows an elevated permission warning

Open the matching role in Discord and inspect its permissions. Do not apply until you understand why the permission is present and confirm it is intentional. Chaotic Minds Command does not change permissions on reused roles.

## The app reports duplicate or ambiguous objects

The app found more than one exact match and cannot safely choose which object to reuse. Rename or resolve the duplicate roles, categories, or channels in Discord, then create a new preview.

## My preview expired or was rejected as stale

Previews expire and are single-use. A change to the selected server's relevant objects can also make a preview stale. Generate a new preview and review it again.

## Setup only partly completed

Discord writes are not transactional. Some objects may have been created before an error occurred. Read the completion report, inspect the server in Discord, and create a fresh preview. Exact matches should be shown as reused. Do not assume that the app rolled back completed work.

## My session ended

Sign in again with Discord. Sessions expire after eight hours or when the Discord access token expires, whichever comes first.

## I cannot save server notes

Confirm that you selected the intended server and still have Manage Server or Administrator permission. Notes are shared with current server managers only.
