---
title: "Review channel visibility and access"
description: "Understand how template channels inherit visibility and what Discord administrators must configure before members use the new channels."
---
Chaotic Minds Command creates a basic category and channel layout. It does not configure private-channel permission overwrites or decide which members should be allowed into each channel.

## How visibility works

New channels inherit category or server visibility. Depending on your server's existing settings, a new channel may be visible to members by default.

A template is not a privacy policy. The presence of a channel named `help`, `rules`, or `knowledge-base` does not make it private, read-only, or restricted to a particular role.

## Review access in Discord

After applying a template, inspect the category and each channel in Discord:

1. Open the channel or category settings.
2. Review its permission settings and inherited access.
3. Decide which roles should view the channel.
4. Decide which roles should send messages or manage the channel.
5. Verify the result with an appropriate test account before directing members there.

Use Discord's own permission controls to configure access. Chaotic Minds Command does not make these decisions for you.

> **Warning:** Do not put private support conversations, staff discussions, or sensitive information in a newly created channel until you have verified its access settings in Discord.

For role behavior, see [understand role permissions](role-permissions.md).
