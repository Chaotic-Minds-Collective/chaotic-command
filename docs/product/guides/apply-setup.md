---
title: "Apply a reviewed setup"
description: "Apply a Chaotic Minds Command preview only after checking its contents, entering the exact server confirmation phrase, and accepting the final prompt."
---
Applying a setup is the point where Chaotic Minds Command sends create requests to Discord. Nothing is written when you only select a server or preview a template.

## Before you apply

1. Confirm the selected server is correct.
2. Review every Create and Reuse item in the preview.
3. Inspect reused role permissions and resolve any elevated-permission warnings.
4. Check that the channel layout and expected visibility are appropriate.
5. Make sure the preview has not expired.

## Confirm the plan

1. **Enter the exact phrase**
   Type the confirmation phrase displayed by the app. It follows the format `APPLY <server-id>`. Use the server ID shown in your current session.

2. **Accept the final confirmation**
   Read the browser confirmation and accept only if you intend to create the listed objects in that server. Cancelling leaves the setup unapplied.

3. **Review the result**
   The app reports the completed items and any error. Check the result in both Chaotic Minds Command and Discord.

## Understand partial completion

Discord setup operations are not transactional. If a request fails after some items have been created, those completed items remain in Discord. Chaotic Minds Command does not automatically roll them back or delete them.

If the result reports partial completion:

1. Read which items were created or reused.
2. Inspect the server in Discord.
3. Generate a fresh preview.
4. Confirm completed items are now shown as reused before trying again.

Chaotic Minds Command reuses exact matches to help avoid duplicates. Do not repeatedly submit an old preview.

## What applying does not do

Applying does not assign roles to members, post messages, delete existing objects, configure private-channel permissions, or change permissions on reused roles. You remain responsible for those server-management tasks.
