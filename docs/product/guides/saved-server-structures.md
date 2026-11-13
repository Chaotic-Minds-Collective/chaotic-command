---
title: "Save and reuse personal server structures"
description: "Save custom Discord layouts to your account, load them into the editor, rename or delete templates, and understand personal storage limits."
---
Chaotic Minds Command lets you keep up to 20 personal saved structures for reuse across server setup sessions. Each saved structure belongs to the Discord account that created it, and loading one only fills the custom editor. It does not make changes to a Discord server.

## Save a custom structure

1. Sign in to Chaotic Minds Command with Discord.
2. Open the custom structure editor.
3. Enter and review your role names, categories, and text channels.
4. In **Your personal saved structures**, enter a template name.
5. Select **Save current structure as new**.

The structure must pass the same validation used by the custom editor. Template names must contain 1 to 60 characters after trimming. Names are unique within your account, without regard to letter case.

## Load a saved structure

1. Open **Your personal saved structures**.
2. Select a template from **Saved structures**.
3. Select **Load into editor**.
4. Review the roles, categories, and channels in the custom editor.

Loading replaces the current custom editor fields with the selected saved structure. It does not create a preview, select a Discord server, or call Discord to create objects. When you are ready to set up a server, create a new preview and review it using the normal [preview and review workflow](preview-and-review.md).

## Rename a saved structure

1. Select the saved structure you want to rename.
2. Edit the **Template name** field.
3. Select **Rename selected**.

The new name must contain 1 to 60 characters and must not match another saved structure in your account, ignoring letter case. Renaming changes the saved template name, not its roles, categories, or channels.

## Delete a saved structure

1. Select the saved structure you want to remove.
2. Select **Delete selected**.
3. Confirm the deletion in the browser prompt.

Deleting a saved structure removes that personal template only. It does not delete roles, categories, channels, or any other objects from a Discord server.

## Personal storage limits and privacy

- You can save up to 20 personal structures per Discord account.
- A template name can contain 1 to 60 characters.
- Template names must be unique within your account, ignoring letter case.
- Saved structures are visible only to the Discord account that saved them.
- A saved structure contains the validated role, category, and channel layout. It does not save permissions, member assignments, private-channel rules, or a target server.
- If you reach the 20-template limit, delete a saved structure before saving another.

> **Warning:** A saved structure is a reusable layout, not a backup of a Discord server. It does not preserve role permissions, member assignments, channel access rules, or existing server objects.

## Continue setup safely

After loading a saved structure, review it in the editor and create a fresh preview for the server you intend to configure. Review every Create and Reuse result, check role permissions and channel visibility, and apply only after completing the normal confirmation steps.

For editor input rules and structure limits, see [build a custom server structure](custom-server-structure.md). For the complete list of available capabilities, see [current feature status](../reference/feature-status.md).
