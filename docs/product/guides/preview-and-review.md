---
title: "Preview and review setup changes"
description: "Review every proposed role, category, and channel, understand Create and Reuse actions, and resolve permission warnings before applying."
---
A Chaotic Minds Command preview shows what your selected built-in template or custom structure proposes to create and what it can reuse. Use this page to inspect the plan before you authorize any Discord changes.

## Read each preview item

- **Create** means the item does not have an exact match and will be created if you apply the plan.
- **Reuse** means Chaotic Minds Command found one exact match and will use the existing Discord object.
- **Role details** show the recognized permissions on a reused role. New roles are identified as having zero permissions and no members assigned.
- **Category and channel details** show where channels belong in the proposed structure.

## Review role permissions

Read the permission details for every reused role. Chaotic Minds Command flags elevated or unrecognized permissions for review. A warning is a reason to stop and inspect the role in Discord, not a recommendation to proceed.

Chaotic Minds Command does not change permissions on reused roles. It also does not grant permissions to newly created roles.

See [understand role permissions](../admins/role-permissions.md) for the review checklist.

## Check the channel plan

Confirm that each channel belongs under the expected category. The setup flow does not configure private-channel permission overwrites. New channels inherit category or server visibility and may be public.

Read [understand channel visibility](../admins/channel-visibility.md) before applying a structure to a server with existing members.

## Preview limits

Previews are bound to the selected server, expire, and can be used only once. If the plan changes or the preview expires, create a new preview. Chaotic Minds Command rejects a stale plan rather than applying it.

> **Warning:** Previewing does not write to Discord. Do not treat a preview as a completed setup.

When every item and warning is understood, continue to [apply the reviewed setup](apply-setup.md).
