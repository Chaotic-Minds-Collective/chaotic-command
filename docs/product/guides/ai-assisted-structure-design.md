---
title: "Use AI-assisted structure design"
description: "Create a constrained prompt, request a Discord server layout from an external AI assistant, and import the suggested roles and channels for review."
---
Chaotic Minds Command includes a user-directed AI-assisted workflow for designing a custom server structure. It does not connect to an AI provider. You choose an external assistant, copy the prompt, and bring its JSON response back into the editor.

## What you need

- A server brief describing the community, its purpose, and the kinds of spaces it needs.
- Access to an external AI assistant, such as ChatGPT.
- The Chaotic Minds Command custom structure editor.

Your brief is copied into a prompt that you choose to share. Do not include passwords, tokens, private member details, or other sensitive information.

## Create the prompt

1. Select **Custom structure** in Chaotic Minds Command.
2. Enter a short description of the server in the AI-assisted design brief.
3. Select **Build AI prompt**.
4. Select **Copy prompt**.
5. Open the external AI assistant you want to use and paste the prompt.
6. Ask the assistant to return the requested JSON only.

Chaotic Minds Command does not automatically transmit the brief or make an AI API request. Any information you paste into another AI service is subject to that service's own terms and privacy settings.

## Import the response

1. Copy the JSON response from the external assistant. Do not include Markdown code fences or explanatory text.
2. Paste it into the AI-generated JSON field.
3. Select **Import JSON into editor**.
4. Review the imported role names, category names, and channel names in the normal editor fields.
5. Correct anything that does not fit your server.

The importer accepts only the supported `roles` and `categories` structure. Each category contains a `name` and a `channels` array. Extra fields are rejected. The app's server-side validator applies the final limits and naming rules when you create a preview.

## Supported output shape

```json
{
  "roles": ["Member", "Moderator"],
  "categories": [
    {
      "name": "Community",
      "channels": ["welcome", "rules", "general"]
    },
    {
      "name": "Events",
      "channels": ["announcements", "signups"]
    }
  ]
}
```

The structure can contain role names, category names, and text channel names only. It cannot configure role permissions, member assignments, private-channel access, Discord IDs, API calls, code, or automations.

## Review and apply safely

Importing only fills the editor fields. It does not create a preview or make Discord changes.

1. Review and edit the imported structure.
2. Select preview and read every Create and Reuse result.
3. Inspect reused role permissions and channel visibility.
4. If you change the structure, create a fresh preview.
5. Apply only after reviewing the exact plan and completing the normal confirmation phrase and final browser confirmation.

New roles have zero permissions and are not assigned. Existing roles are reused without permission changes. New channels inherit category or server visibility and may be public.

> **Warning:** AI suggestions are untrusted input. Do not assume they are secure, correct, or appropriate for your community. The app validates the supported structure, but you remain responsible for reviewing the names, permissions, and visibility in Discord.

## Current limitations

- No direct AI provider integration or in-app AI API key.
- No automatic AI regeneration or saved AI designs.
- No AI-created permissions, role assignments, private channels, or Discord actions.
- No automatic deletion or rollback of Discord objects.

For the manual editor format and size limits, see [build a custom server structure](custom-server-structure.md).
