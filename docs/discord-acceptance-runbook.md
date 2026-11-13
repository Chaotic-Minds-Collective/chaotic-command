# Discord acceptance test and operator runbook

Use this runbook to configure a local Chaotic Minds Command instance and verify its live Discord integration before considering any deployment. Automated tests use fixtures. They do not prove that OAuth, bot installation, permissions, or live Discord writes work.

**Use a disposable Discord server only.** Never run live acceptance tests against a production, customer, or active community server.

## 1. What you are testing

The current MVP supports a shared operator bot and customer-owned bots:

- The operator configures one Discord application for Chaotic Minds Command OAuth sign-in.
- The shared `DISCORD_BOT_TOKEN` is optional. If configured, it remains available as a shared bot.
- Signed-in customers can connect up to five personal Discord bots. Chaotic Minds Command verifies each bot token with Discord and stores it encrypted at rest.
- Customers can set a default personal bot and assign a different connected bot to an individual server.
- Users sign in with their own Discord accounts and can manage only servers where their account owns the server or has Manage Server permission.
- The selected bot must be installed in the selected server and have Manage Channels and Manage Roles. It does not need Administrator or privileged Gateway intents.
- The app creates roles, categories, and text channels from a reviewed plan. It does not delete objects, change permissions on reused roles, assign roles, post messages, or configure private-channel access.

The operator's OAuth application is separate from each customer's personal bot. Customers do not need to create an OAuth client secret or redirect URL for their personal bot. Never ask customers to send bot tokens to the operator.

## 2. Safety rules

Before starting:

- Create a brand-new, empty Discord server specifically for testing.
- Create a temporary Discord application and bot for the local test.
- Never use a real community, production, customer, or otherwise important server.
- Keep the client secret, bot token, and session secret only in the local server-side `.env` file.
- Never paste secrets into ChatGPT, Claude, GitHub issues, Discord messages, screenshots, browser code, or logs.
- Do not commit `.env`, the `.data` directory, SQLite files, or test credentials.
- Do not grant Administrator to the bot. Stop if Discord's authorization screen requests it.
- Do not assign test roles to members.
- Stop if the app proposes deleting or modifying existing objects, or if the requested permission scope differs from this runbook.
- Remember that Discord writes are not transactional. A partial failure can leave some objects behind.

## 3. Prepare a disposable Discord server

1. In the Discord client, create a new server.
2. Give it a clear test-only name, such as `Chaotic Minds Command Acceptance Test`.
3. Keep it empty except for Discord's default channel and roles.
4. Do not invite community members or add real data.
5. Keep the server available until all test cases and cleanup checks are complete.

Record that this is the disposable test server. Do not record or publish its server ID in public issue reports.

## 4. Create a temporary Discord application

1. Open the [Discord Developer Portal](https://discord.com/developers/applications).
2. Select **New Application** and give it a test-only name.
3. Open the application's **OAuth2** settings.
4. Add this exact redirect URL for local testing:

   `http://localhost:3000/auth/callback`

5. Save the redirect URL.
6. Copy the **Application ID**. This becomes `DISCORD_CLIENT_ID`.
7. Under OAuth2, reveal or reset the **Client Secret** and copy it into the local `.env` file as `DISCORD_CLIENT_SECRET`.
8. Do not create a bot token for this OAuth application unless you also want to test the optional shared-bot path.
9. Do not enable privileged Gateway intents. The app uses Discord REST requests and does not require them.

The operator's OAuth application is used for user sign-in and server listing. Customer-owned bots are created separately and connected through the Chaotic Minds Command UI.

The app's sign-in flow uses the `identify` and `guilds` OAuth scopes. Its bot installation link uses the `bot` scope with Manage Channels and Manage Roles permissions.

## 5. Configure the local app

### Requirements

- Node.js 24 or newer.
- A local checkout of the `Chaotic-Minds-Collective/Chaotic-Command` repository.
- The temporary Discord application values from the previous section.

### Create the environment file

From the repository root, copy `.env.example` to `.env`.

PowerShell:

```powershell
Copy-Item .env.example .env
```

macOS or Linux:

```bash
cp .env.example .env
```

Edit `.env` locally and set these values:

```dotenv
PORT=3000
APP_ORIGIN=http://localhost:3000
DISCORD_CLIENT_ID=your_application_id
DISCORD_CLIENT_SECRET=your_client_secret
DISCORD_BOT_TOKEN=your_bot_token
SESSION_SECRET=your_random_secret
DATA_DIR=.data
NODE_ENV=development
```

Replace each example value locally. Do not include quotation marks unless your local environment requires them. Do not share the completed file.

`DISCORD_BOT_TOKEN` is optional. Set it only if you are testing the operator-provided shared bot. Customer-owned bots are connected after signing in through the app; their tokens are not placed in the operator's `.env` file.

Generate a random session secret using Node.js:

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Copy the generated value directly into `SESSION_SECRET`. It must be at least 32 characters. Keep it stable during the test. Changing it invalidates encrypted sessions.

### Check and start the app

From the repository root:

```bash
node --version
npm run check
npm test
npm start
```

Confirm Node reports version 24 or newer and that the checks and tests pass. Open [http://localhost:3000](http://localhost:3000).

The local server binds to loopback by default. Do not expose this development instance to the public internet.

## 6. Test Discord sign-in and server authorization

1. Open the local app.
2. Select the Discord sign-in action.
3. Confirm Discord displays the application name and the expected sign-in scopes.
4. Authorize the temporary application.
5. Confirm the app returns to its main screen and identifies the signed-in account.
6. Confirm the disposable test server appears in the manageable-server list.
7. If available, use an account that does not manage another test server and confirm that server is not offered.
8. Sign out. Confirm the app returns to its signed-out state.
9. Sign in again before continuing.

**Pass condition:** OAuth completes, the correct account is shown, and only servers the account can manage are offered.

## 7. Install and verify a selected bot

1. Select the disposable test server.
2. Choose the shared test bot if you configured one, or select a connected personal test bot after completing section 8.
3. If the selected bot is not installed, use **Install bot in selected server**.
4. On Discord's authorization screen, inspect the requested permissions.
5. Confirm the bot requests Manage Channels and Manage Roles, not Administrator.
6. Authorize it for the disposable server.
7. In Discord server settings, open the role list and move the bot's role above the roles the app will create.
8. Return to Chaotic Minds Command and reselect the test server.
9. Confirm bot readiness succeeds.

If readiness fails, check that the selected bot is installed in the correct server, that both permissions are enabled, and that the bot role is high enough in the role hierarchy. Do not grant Administrator as a workaround.

## 8. Test customer-owned bot connection and assignment

Use a separate temporary Discord application and bot for this section. Keep the bot token private and enter it only in the Chaotic Minds Command connection form over HTTPS. Do not place a customer bot token in the operator's `.env` file.

1. In the Discord Developer Portal, create a test application and open its **Bot** page.
2. Create or add the bot user, generate a bot token, and keep the token private.
3. Sign in to the local Chaotic Minds Command instance with the test Discord account.
4. Find **Your Discord bots**, paste the test bot token into **Discord bot token**, and select **Verify and connect bot**.
5. Confirm the bot appears in the list with identity metadata only. Confirm the token is not displayed in the page or API response.
6. Confirm the connected bot becomes the default bot.
7. Connect a second temporary bot if available and confirm both are listed. Verify the five-bot account limit with validation or tests rather than creating unnecessary credentials.
8. Select the disposable server, choose the first bot, and select **Use selected bot**.
9. Install the selected bot using its installation link. Confirm the link identifies that bot's application and requests Manage Channels and Manage Roles only.
10. Confirm bot readiness succeeds after installation.
11. If a second disposable server is available, assign the second bot to it. Confirm changing the default does not overwrite either server-specific assignment.
12. If a second test Discord account is available, confirm it cannot list, select, assign, or delete the first account's connected bots.
13. Remove one test bot from **Your Discord bots**. Confirm its stored credential and that account's assignments are removed.
14. Confirm removal does not call Discord to revoke the token or remove the bot from the server. Reset the token in the Developer Portal and remove the bot from the disposable server during cleanup.

**Pass condition:** Bot credentials are verified, stored encrypted, never returned to the browser, and all bot records and server assignments remain scoped to the authenticated account.

Do not use real customer tokens or production servers for acceptance testing. Automated tests cover account isolation and encryption, but live token verification and installation still require this disposable test.

## 9. Test the read-only server audit

1. Select the disposable server.
2. Run **Audit selected server**.
3. Confirm the report includes role, category, and channel counts.
4. Confirm role permission flags and managed-role information are visible.
5. In Discord, add test-only examples:
   - An empty category.
   - A category with a text channel.
   - A channel with a custom permission overwrite.
   - An uncategorized voice channel.
6. Run the audit again.
7. Confirm it flags custom permission overwrites, uncategorized channels, and empty categories.
8. Confirm duplicate role or category names are reported if you create duplicates for this test.
9. Confirm the report says it does not calculate effective member visibility.
10. Inspect Discord and confirm the audit did not create, edit, move, or delete any objects.

**Pass condition:** The audit reports the supported structural findings and performs reads only.

## 10. Test built-in template preview and role review

1. Select the Community template.
2. Select the preview action.
3. Confirm the preview lists each proposed role, category, and channel with a Create or Reuse result.
4. Confirm no new Discord objects have appeared yet.
5. Confirm new roles are identified as zero-permission and unassigned.
6. Confirm the preview displays the exact server-bound confirmation phrase and an expiry time.
7. In Discord, create a role named `Member` with only View Channels enabled. Do not assign it to anyone.
8. Preview the Community template again.
9. Confirm the Member role is marked Reuse and its existing permission flags are displayed.
10. Confirm the app does not propose changing the role's permissions.
11. Temporarily add Manage Roles to the test role and preview again.
12. Confirm the role is flagged for elevated-permission review.
13. Restore the role to its intended test permissions before applying anything.

Do not apply a plan while an unexpectedly privileged role is present.

## 11. Test stale-preview rejection

1. Generate a fresh preview.
2. Before applying, change the permissions on the existing test Member role directly in Discord.
3. Attempt to apply using the old preview and the exact confirmation phrase.
4. Confirm the app rejects the stale plan and asks for a fresh preview.
5. Generate a new preview.
6. Confirm the updated role permission summary appears.

**Pass condition:** A preview cannot be applied after the server state used to create it has changed.

## 12. Test apply, reuse, and partial progress handling

1. Restore the test Member role to the intended permissions.
2. Generate a fresh Community preview.
3. Read every Create and Reuse item.
4. Enter the exact `APPLY <server-id>` phrase shown by the app.
5. Accept the final browser confirmation.
6. Confirm the app reports the completed operations.
7. In Discord, verify the expected roles, category, and text channels exist.
8. Confirm the existing Member role was reused and its permissions did not change.
9. Confirm newly created roles have zero permissions and no members assigned.
10. Confirm no messages were posted.
11. Confirm no existing roles or channels were deleted or modified.
12. Preview the same template again.
13. Confirm exact matches are reported as reused instead of duplicated.

If an apply operation fails partway through, do not assume nothing changed. Inspect the partial-progress report and the Discord server, then create a fresh preview before retrying.

## 13. Test custom structures

1. Open the custom structure editor.
2. Enter at least one role and one category with text channels.
3. Preview the structure and confirm the same Create/Reuse planner is used.
4. Test a valid structure with an empty category.
5. Test duplicate role, category, and channel names and confirm validation rejects them.
6. Test an invalid channel name containing uppercase letters or spaces and confirm validation rejects it.
7. Confirm the editor rejects unsupported permission fields and cannot configure member assignments or private-channel access.
8. Confirm the documented limits are enforced:
   - Up to 20 roles.
   - 1 to 20 categories.
   - Up to 30 channels in each category.
   - Up to 100 total roles, categories, and channels.
9. Confirm editing the structure requires a fresh preview before applying.

Do not apply every test structure. Use preview and validation to test invalid cases without writing to Discord.

## 14. Test AI-assisted structure handoff

1. Open the AI-assisted design section of the custom structure workflow.
2. Enter a non-sensitive test brief.
3. Build and copy the generated prompt.
4. Paste it into an external AI assistant of your choice.
5. Request the supported JSON structure.
6. Copy the JSON response without Markdown code fences.
7. Paste it into Chaotic Minds Command and import it into the editor.
8. Confirm the imported roles, categories, and channels are editable.
9. Try importing JSON with an unsupported field and confirm it is rejected.
10. Confirm import alone does not create a preview or write to Discord.
11. If testing iterative refinement, first create a draft in the editor, build the follow-up prompt, and verify the current draft is included as the starting point.
12. Import the revised response and confirm it replaces the editor fields for review only.

The app does not call an AI provider, store an AI provider key, or automatically send your brief to an external service. Do not include secrets or private member information in the prompt.

## 15. Test personal saved structures

1. Sign in with the first test Discord account.
2. Create a valid custom structure.
3. Save it with a unique template name.
4. Confirm it appears in the personal saved-structures list.
5. Load it into the editor and confirm the fields are populated.
6. Confirm loading does not select a server, create a preview, or call Discord.
7. Rename the saved structure and confirm the new name appears.
8. Save additional test templates only as needed to verify the 20-template limit.
9. If a second test Discord account is available, sign in as that account and confirm it cannot list, load, rename, or delete the first account's saved structures.
10. Return to the first account and delete the test saved structure.

**Pass condition:** Saved structures remain private to the Discord account that created them, and load operations only populate the editor.

## 16. Test shared server notes

1. Save a short, non-sensitive note for the disposable server.
2. Refresh the page and confirm the note persists.
3. If another account with Manage Server access is available, confirm that manager can read the server's shared note.
4. Confirm an account without server management access cannot use the server notes feature.
5. Confirm notes do not trigger automations or Discord messages.
6. Remove test notes after recording the result.

Notes are stored as plaintext in the local SQLite database. Never put passwords, bot tokens, client secrets, or other credentials in notes.

## 17. Record results

Record:

- Test date and time.
- Node.js version.
- Browser and operating system.
- Commit SHA tested.
- Pass, fail, or blocked status for each section.
- Short error descriptions with tokens, server IDs, user IDs, and personal information removed.
- Any partial Discord objects created by a failed apply operation.

Do not attach the `.env` file, SQLite database, raw OAuth responses, or unredacted screenshots to the report.

## 18. Cleanup

1. Stop the local Node.js process.
2. Delete the disposable Discord test server when the test is complete.
3. Delete the temporary Discord application and bot, or reset/revoke its credentials if it must be retained.
4. Remove the local `.env` file when it is no longer needed.
5. Remove the local `.data` directory if the test data is no longer needed.
6. Confirm no test credentials were committed to Git or copied into logs.
7. Confirm the local test server is stopped and is not publicly reachable.

## 19. Deployment gate

A successful acceptance test is not permission to deploy. Before any public deployment, separately review:

- HTTPS and a stable production `APP_ORIGIN`.
- A strong, stable `SESSION_SECRET`.
- Private persistent storage for the SQLite data directory.
- A single app process or replica because the setup lock is process-local.
- Reverse-proxy request and rate limiting.
- Secure handling and rotation of the operator's Discord application credentials.
- A backup and recovery plan for the SQLite database.
- A documented support and incident process.

Do not deploy until the operator has explicitly approved the deployment and its target environment.
