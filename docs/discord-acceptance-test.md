# Discord acceptance test (disposable server only)

This is a manual end-to-end test plan for the local Chaotic Minds Command MVP. Automated CI uses fixtures and does not contact Discord. Do not run this procedure against a production, community, customer, or otherwise important server.

## Safety rules

- Create a brand-new, empty Discord server specifically for this test.
- Do not use a server that contains real members, channels, roles, messages, or community data.
- Keep Discord client secrets, bot tokens, and session secrets only in the local server-side `.env` file. Never paste them into ChatGPT, issues, browser code, screenshots, or logs.
- Do not grant the bot Administrator. Its invite requests only Manage Channels and Manage Roles.
- Do not assign test roles to members. The MVP does not need member assignment.
- Stop if the app requests permissions beyond the documented scope or proposes modifying/deleting existing objects.
- The app is additive but Discord writes are not transactional. A partial failure can leave objects behind.

## Prepare

1. Create a temporary Discord application and bot in the Discord Developer Portal.
2. Create a new empty Discord server for acceptance testing.
3. Register the exact local OAuth callback URL: `http://localhost:3000/auth/callback`.
4. Copy the application client ID, client secret, and bot token into the local `.env` file as `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, and `DISCORD_BOT_TOKEN`.
5. Generate a random `SESSION_SECRET` of at least 32 characters. Keep it stable for the duration of the test.
6. Start the app with Node.js 24 or newer using `npm start`, then open `http://localhost:3000`.
7. Confirm the app loads and the login control is enabled. Do not expose this local development server to the public internet.

## Test OAuth and server access

1. Sign in with the Discord account that owns the disposable server.
2. Confirm the server appears in the manageable-server list.
3. Confirm a different server where the account lacks Manage Server is not offered (if available to the test account).
4. Confirm sign-out returns the UI to the login state. Sign in again for the remaining tests.

## Test bot installation and permission preflight

1. Select the disposable server before installing the bot.
2. Confirm the UI reports the bot is not ready and provides a server-specific installation link.
3. Inspect the Discord authorization screen. Confirm the requested bot permissions are Manage Channels and Manage Roles, not Administrator.
4. Install the bot in the disposable server.
5. In Discord server settings, move the bot's role above the roles the setup will create.
6. Return to Chaotic Minds Command, reselect the server, and confirm bot preflight succeeds.

## Test the read-only existing-server audit

1. Select the disposable server and run **Audit selected server**.
2. Confirm the report lists the current role, category, and channel counts.
3. Confirm the existing bot role's elevated permissions are visible for review.
4. Add a category, a text channel with a permission overwrite, an uncategorized voice channel, and an empty category in the disposable server. Run the audit again.
5. Confirm the report identifies custom channel overwrites, channels outside categories, and empty categories.
6. Confirm the report explains that it does not calculate effective member visibility.
7. Confirm the audit did not create, edit, or delete any Discord objects.

## Test preview without writes

1. Choose the Community template and select Preview changes.
2. Confirm the page lists the proposed roles, category, and channels.
3. Confirm no new roles or channels have appeared in Discord yet.
4. Confirm every new role is described as zero-permission and unassigned.
5. Confirm the preview displays the server ID confirmation phrase and an expiry time.

## Test existing-role permission visibility

1. In the disposable server, create a role named `Member` with only View Channels enabled. Do not assign it to anyone.
2. Preview the Community template again.
3. Confirm the Member step says Reuse and displays View Channels.
4. Confirm the app does not propose changing the role's permissions.
5. Change the test Member role to include Manage Roles (or Administrator), then preview again.
6. Confirm the preview flags the role for elevated-permission review. If an unknown permission bit is present in the role data, confirm it is flagged for manual review.
7. Do not apply while an unexpectedly privileged role is present. Restore the test role to the intended low-privilege state before continuing.

## Test stale-preview rejection

1. Generate a fresh Community preview.
2. Before applying, change the permissions of the existing Member role in Discord.
3. Attempt to apply using the old preview and exact confirmation phrase.
4. Confirm the app rejects the stale plan and requires a new preview.
5. Preview again and confirm the updated permission summary is shown.

## Test apply and reuse

1. Restore the existing Member role to the intended test permissions.
2. Generate a fresh preview.
3. Type the exact `APPLY <server-id>` phrase displayed by the app and accept the browser confirmation.
4. Confirm the listed roles, category, and channels are created in the disposable server.
5. Confirm the pre-existing Member role is reused and its permissions remain unchanged.
6. Confirm newly created roles have zero permissions and no members assigned.
7. Confirm no messages are posted and no pre-existing channels, roles, or permissions are changed.
8. Preview the same template again. Confirm exact matches are shown as reused rather than duplicated.

## Test notes and session behavior

1. Save a short non-sensitive note for the disposable server.
2. Refresh the page and confirm the note persists.
3. Sign out and confirm the UI returns to the login state.
4. Confirm notes contain no secrets; notes are plaintext in the local SQLite database.

## Cleanup

1. Stop the local server.
2. Delete the disposable Discord server and temporary Discord application/bot when the test is complete.
3. Remove the local test `.env` file and test data directory if they are no longer needed.
4. Do not copy test credentials or test database contents into a production environment.

## Record results

Record the date, Node.js version, browser, pass/fail for each section, and any error text with all tokens, IDs, and personal information removed. A successful local CI run does not replace this live Discord acceptance test.
