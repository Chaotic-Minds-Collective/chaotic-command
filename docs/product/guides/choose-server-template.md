---
title: "Choose a server and setup template"
description: "Select a Discord server you manage and compare built-in templates or create a custom structure before creating roles and channels."
---
Choose the Discord server you want to prepare, then select a built-in template or define your own structure. Chaotic Minds Command only lists servers your signed-in Discord account can manage.

## Choose a server

Select a server from the server list. Your account must have Manage Server or Administrator permission in that server. If you cannot find it, check that you signed in with the correct Discord account and that your permission has not changed.

Chaotic Minds Command checks whether its bot is ready for the selected server. If the bot is not ready, use the installation link shown in the app, complete the Discord installation, and select the server again.

## Compare the built-in templates

| Template | Roles | Category and channels |
| --- | --- | --- |
| Community | Member, Moderator | Community: welcome, rules, general, introductions |
| Gaming | Member, Player | Gaming: announcements, general, looking-for-group, game-chat |
| Support | Member, Support | Support: welcome, help, knowledge-base |

Templates provide a starting structure. They are not complete permission policies, moderation systems, or privacy configurations.

## Build a custom structure

Choose **Custom structure** when you want to define the role names, categories, and text channels yourself. Enter one role per line and one category per line using the format shown in [build a custom server structure](custom-server-structure.md).

The custom editor only defines names and category membership. It does not configure role permissions, private-channel access, or member assignments.

## What happens to existing items

Chaotic Minds Command reuses an exact matching role name. It does not change the permissions of a reused role. It reuses an exact matching category and channels within that category. If duplicate matching objects make the choice ambiguous, the app stops and asks you to resolve the duplicates in Discord.

New roles are created with zero permissions and are not assigned to members. New channels inherit category or server visibility and may be visible to members by default. Review [role permissions](../admins/role-permissions.md) and [channel visibility](../admins/channel-visibility.md) before applying a structure.

## Next step

Choose a built-in template or define a custom structure, then [preview every proposed change](preview-and-review.md) before confirming anything.
