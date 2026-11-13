---
title: "Understand role permissions"
description: "Review existing role permissions and warnings before setup, and understand why Chaotic Minds Command creates new roles without granting permissions."
---
Chaotic Minds Command creates a starting role structure, but it does not decide which powers each role should have. Review role permissions in Discord before and after applying a template.

## New roles

Every new role created by Chaotic Minds Command starts with zero permissions. The app does not assign the role to members. This is intentional: an administrator must decide which permissions are appropriate before assigning it.

## Existing roles

When an exact matching role already exists, Chaotic Minds Command reuses it. It does not edit that role's permissions. The preview displays recognized permissions so you can make an informed decision before applying.

The app flags elevated or unrecognized permission bits for review. Treat these warnings seriously. In Discord, inspect the role and confirm that its permissions are intentional before proceeding.

## Review checklist

- Confirm the role name is the one you intend to reuse.
- Review its current permissions in Discord.
- Pay particular attention to Administrator, Manage Server, Manage Roles, Manage Channels, moderation, and other elevated capabilities.
- Stop if you cannot explain why an elevated permission is present.
- Do not apply until any unexpected privilege has been investigated.

## After setup

Chaotic Minds Command does not assign new roles to members or change reused role permissions. Configure role permissions and membership yourself in Discord, following your server's least-privilege policy.

For the complete setup sequence, see [preview and review](../guides/preview-and-review.md) and [apply a reviewed setup](../guides/apply-setup.md).
