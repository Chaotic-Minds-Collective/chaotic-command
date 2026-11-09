// End-to-end-ish tests for the Chaotic Command bot: signed requests flow
// through createApp with mocked Discord + Supabase endpoints.

import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/index.js';
import { COMMANDS } from '../src/commands.js';
import { hexToBytes, FLAG_COMPONENTS_V2, FLAG_EPHEMERAL } from '../src/lib.js';

const keys = await crypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
const publicKeyHex = [...new Uint8Array(await crypto.subtle.exportKey('raw', keys.publicKey))]
  .map((b) => b.toString(16).padStart(2, '0'))
  .join('');

function makeEnv() {
  return {
    DISCORD_BOT_TOKEN: 'test-bot-token',
    DISCORD_PUBLIC_KEY: publicKeyHex,
    DISCORD_APPLICATION_ID: '999888777666555444',
    SUPABASE_URL: 'https://unittest.supabase.co',
    SUPABASE_SERVICE_KEY: 'service-key',
    REGISTER_SECRET: 'register-secret',
  };
}

function makeMocks() {
  const discord = { channels: new Map(), messages: [], bans: [], timeouts: [], permissions: [], commands: null, dms: [], failBotRoleFetch: false, botRole: 'bot-role', failTicketUpdate: false };
  const tables = { bot_guilds: new Map(), bot_tickets: new Map(), bot_pending: new Map() };
  const calls = [];

  const fetcher = async (input, init = {}) => {
    const url = new URL(String(input));
    const method = init.method ?? 'GET';
    const body = init.body ? JSON.parse(init.body) : null;
    calls.push({ host: url.host, path: url.pathname, method, body });

    if (url.host === 'unittest.supabase.co') {
      const table = url.pathname.split('/').pop();
      const idEq = url.searchParams.get('id')?.replace('eq.', '');
      const guildEq = url.searchParams.get('guild_id')?.replace('eq.', '');
      if (method === 'POST') {
        const pk = table === 'bot_guilds' ? body.guild_id : body.id;
        tables[table].set(pk, body);
        return new Response(JSON.stringify(body), { status: 201 });
      }
      if (method === 'GET') {
        const rows = [...tables[table].values()].filter((r) => (idEq ? r.id === idEq : true) && (guildEq ? r.guild_id === guildEq : true));
        return new Response(JSON.stringify(rows), { status: 200 });
      }
      if (method === 'PATCH') {
        if (table === 'bot_tickets' && discord.failTicketUpdate) return new Response('{}', { status: 500 });
        const row = tables[table].get(idEq);
        if (row) tables[table].set(idEq, { ...row, ...body });
        return new Response(JSON.stringify(row ?? null), { status: 200 });
      }
      if (method === 'DELETE') {
        tables[table].delete(idEq);
        return new Response('[]', { status: 200 });
      }
    }

    if (url.host === 'discord.com') {
      const p = url.pathname.replace('/api/v10', '');
      let match;
      if ((match = p.match(/^\/guilds\/(\d+)$/)) && method === 'GET') {
        return Response.json({ id: match[1], name: 'Test Server', owner_id: '888000111222333444' });
      }
      if ((match = p.match(/^\/guilds\/(\d+)\/roles$/)) && method === 'GET') {
        return Response.json([{ id: 'actor-role', position: 10 }, { id: 'target-role', position: 5 }, { id: 'elevated-role', position: 15 }, { id: 'bot-role', position: 20 }]);
      }
      if ((match = p.match(/^\/guilds\/(\d+)\/members\/(\d+)$/)) && method === 'GET') {
        if (match[2] === '999888777666555444' && discord.failBotRoleFetch) return new Response('failed', { status: 500 });
        const role = match[2] === '999888777666555444' ? discord.botRole : (match[2] === '999000111222333445' ? 'elevated-role' : 'target-role');
        return Response.json({ user: { id: match[2] }, roles: [role] });
      }
      if ((match = p.match(/^\/guilds\/(\d+)\/channels$/)) && method === 'POST') {
        const channel = { id: `ch-${discord.channels.size + 1}`, ...body };
        discord.channels.set(channel.id, channel);
        return Response.json(channel, { status: 201 });
      }
      if ((match = p.match(/^\/channels\/([^/]+)\/messages\/bulk-delete$/)) && method === 'POST') {
        discord.purged = body.messages;
        return new Response(null, { status: 204 });
      }
      if ((match = p.match(/^\/channels\/([^/]+)\/messages$/)) && method === 'GET') {
        const limit = Number(url.searchParams.get('limit') ?? 50);
        const msgs = Array.from({ length: limit }, (_, i) => ({ id: `m${i}`, timestamp: new Date().toISOString() }));
        return Response.json(msgs);
      }
      if ((match = p.match(/^\/channels\/([^/]+)\/messages$/)) && method === 'POST') {
        const message = { id: `msg-${discord.messages.length + 1}`, channel_id: match[1], ...body };
        discord.messages.push(message);
        return Response.json(message, { status: 200 });
      }
      if ((match = p.match(/^\/channels\/([^/]+)\/permissions\/(.+)$/)) && method === 'PUT') {
        discord.permissions.push({ channel: match[1], target: match[2], ...body });
        return new Response(null, { status: 204 });
      }
      if ((match = p.match(/^\/channels\/([^/]+)$/)) && method === 'DELETE') {
        discord.channels.delete(match[1]);
        return new Response(null, { status: 204 });
      }
      if ((match = p.match(/^\/channels\/([^/]+)$/)) && method === 'PATCH') {
        return Response.json({ id: match[1], ...body });
      }
      if ((match = p.match(/^\/guilds\/(\d+)\/bans\/(.+)$/)) && method === 'PUT') {
        discord.bans.push({ guild: match[1], user: match[2], ...body });
        return new Response(null, { status: 204 });
      }
      if ((match = p.match(/^\/guilds\/(\d+)\/members\/(.+)$/)) && method === 'DELETE') {
        discord.kicks = discord.kicks ?? [];
        discord.kicks.push({ guild: match[1], user: match[2] });
        return new Response(null, { status: 204 });
      }
      if ((match = p.match(/^\/guilds\/(\d+)\/members\/(.+)$/)) && method === 'PATCH') {
        discord.timeouts.push({ guild: match[1], user: match[2], ...body });
        return Response.json({ id: match[2], ...body });
      }
      if (p === '/users/@me/channels' && method === 'POST') {
        const dm = { id: `dm-${discord.dms.length + 1}`, ...body };
        discord.dms.push(dm);
        return Response.json(dm);
      }
      if (p.startsWith('/applications/') && method === 'PUT') {
        discord.commands = body;
        return Response.json(body);
      }
    }

    throw new Error(`Unexpected ${method} ${url.href}`);
  };

  return { fetcher, calls, discord, tables };
}

const MEMBER = { user: { id: '111222333444555666', username: 'psy' }, permissions: '1099511636006', roles: ['actor-role'] };
const ADMIN = { user: { id: '111222333444555666' }, permissions: `${1n << 5n}` }; // MANAGE_GUILD only
const MEMBER_NO_PERMS = { user: { id: '111222333444555666' }, permissions: '0' };

async function send(app, payload, { sign = true, secret, path = '/' } = {}) {
  const raw = JSON.stringify(payload);
  const headers = { 'Content-Type': 'application/json', 'X-Signature-Timestamp': '1700000000' };
  if (sign) {
    const signature = await crypto.subtle.sign('Ed25519', keys.privateKey, new TextEncoder().encode(`1700000000${raw}`));
    headers['X-Signature-Ed25519'] = [...new Uint8Array(signature)].map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  if (secret) headers['X-Register-Secret'] = secret;
  const response = await app.fetch(new Request(`http://localhost${path}`, { method: 'POST', headers, body: raw }));
  const text = await response.text();
  return { status: response.status, text, json: text?.trim().startsWith('{') ? JSON.parse(text) : null };
}

const commandPayload = (name, options = [], extra = {}) => ({
  type: 2,
  token: 'interaction-token',
  guild_id: '100000000000000001',
  channel_id: '200000000000000001',
  member: MEMBER,
  data: { id: '1', name, options },
  ...extra,
});

const value = (custom_id, val) => ({ type: 18, component: { type: 4, custom_id, value: val } });
const selectValue = (custom_id, val) => ({ type: 3, custom_id, values: [val] });

test('status endpoint and signature enforcement', async () => {
  const mocks = makeMocks();
  const app = createApp(makeEnv(), mocks.fetcher);
  const status = await app.fetch(new Request('http://localhost/'));
  assert.equal((await status.json()).ok, true);

  const bad = await send(app, { type: 1 }, { sign: false });
  assert.equal(bad.status, 401);
});

test('PING answers pong; webhook PING answers 204', async () => {
  const mocks = makeMocks();
  const app = createApp(makeEnv(), mocks.fetcher);
  assert.equal((await send(app, { type: 1 })).json.type, 1);
  const ping = await send(app, { version: 1, application_id: 'x', type: 0 });
  assert.equal(ping.status, 204);
  assert.equal(mocks.calls.length, 0, 'no outbound calls for pings');
});

test('/setup renders the configuration panel', async () => {
  const mocks = makeMocks();
  const app = createApp(makeEnv(), mocks.fetcher);
  const { json } = await send(app, commandPayload('setup'));
  const components = JSON.stringify(json.data.components);
  for (const id of ['cc_setup:welcome_channel', 'cc_setup:ticket_category', 'cc_setup:support_role', 'cc_setup:mod_log', 'cc_setup:announce_channel']) {
    assert.ok(components.includes(id), `missing ${id}`);
  }
  assert.equal(json.data.flags & FLAG_EPHEMERAL, FLAG_EPHEMERAL);
});

test('setup selects persist config and re-render the panel', async () => {
  const mocks = makeMocks();
  const app = createApp(makeEnv(), mocks.fetcher);
  const { json } = await send(app, { ...commandPayload('setup'), type: 3, data: { id: '2', custom_id: 'cc_setup:welcome_channel', values: ['300000000000000001'] } });
  assert.equal(json.type, 7);
  const saved = mocks.tables.bot_guilds.get('100000000000000001');
  assert.equal(saved.config.welcome.channel_id, '300000000000000001');
});

test('welcome message modal + save + test + enable', async () => {
  const mocks = makeMocks();
  const app = createApp(makeEnv(), mocks.fetcher);

  const modalReply = await send(app, commandPayload('welcome', [{ name: 'message' }]));
  assert.equal(modalReply.json.type, 9, 'the message subcommand opens a modal');
  await send(app, { ...commandPayload('welcome'), type: 5, data: { id: '3', custom_id: 'cc_modal:welcome', components: [value('welcome_text', 'Hey {user}, welcome to {server}!')] } });
  let config = mocks.tables.bot_guilds.get('100000000000000001').config;
  assert.equal(config.welcome.message, 'Hey {user}, welcome to {server}!');

  await send(app, { ...commandPayload('setup'), type: 3, data: { id: '4', custom_id: 'cc_setup:welcome_channel', values: ['300000000000000001'] } });
  await send(app, commandPayload('welcome', [{ name: 'test' }]));
  const posted = mocks.discord.messages.at(-1);
  assert.equal(posted.channel_id, '300000000000000001');
  assert.ok(JSON.stringify(posted.components).includes('Welcome to Test Server'));
  assert.ok(JSON.stringify(posted.components).includes('Hey <@111222333444555666>'));

  await send(app, commandPayload('welcome', [{ name: 'on' }]));
  config = mocks.tables.bot_guilds.get('100000000000000001').config;
  assert.equal(config.welcome.enabled, true);
});

test('legacy Action Row modal submission saves welcome configuration', async () => {
  const mocks = makeMocks();
  const app = createApp(makeEnv(), mocks.fetcher);
  const response = await send(app, {
    ...commandPayload('welcome'), type: 5,
    data: { custom_id: 'cc_modal:welcome', components: [
      { type: 1, components: [{ type: 4, custom_id: 'welcome_text', value: 'Legacy welcome' }] },
    ] },
  });
  assert.ok(JSON.stringify(response.json).includes('Welcome message saved.'));
  assert.equal(mocks.tables.bot_guilds.get('100000000000000001').config.welcome.message, 'Legacy welcome');
});

test('ticket panel, open modal, creation with overwrites, claim, close', async () => {
  const mocks = makeMocks();
  const app = createApp(makeEnv(), mocks.fetcher);
  const env = makeEnv();

  await send(app, { ...commandPayload('setup'), type: 3, data: { id: '5', custom_id: 'cc_setup:ticket_category', values: ['400000000000000001'] } });
  await send(app, { ...commandPayload('setup'), type: 3, data: { id: '6', custom_id: 'cc_setup:support_role', values: ['500000000000000001'] } });

  await send(app, commandPayload('ticket', [{ name: 'panel' }]));
  assert.ok(mocks.discord.messages.some((m) => JSON.stringify(m.components).includes('cc_ticket:open')));

  // Open the modal
  await send(app, { ...commandPayload('ticket'), type: 3, data: { id: '7', custom_id: 'cc_ticket:open' } });

  // Submit the ticket modal
  const ticketResponse = await send(app, {
    ...commandPayload('ticket'),
    type: 5,
    data: { id: '8', custom_id: 'cc_modal:ticket', components: [value('ticket_subject', 'Cant connect'), value('ticket_details', 'Server keeps kicking me')] },
  });
  const created = mocks.discord.channels.get([...mocks.discord.channels.keys()].at(-1));
  assert.equal(created.name, 'ticket-0001');
  assert.equal(created.parent_id, '400000000000000001');
  const overwrites = JSON.stringify(created.permission_overwrites);
  assert.ok(overwrites.includes('100000000000000001'), 'everyone denied');
  assert.ok(overwrites.includes('500000000000000001'), 'support allowed');
  assert.ok(created.permission_overwrites.some((o) => o.id === '500000000000000001' && o.type === 0), 'support overwrite is a role overwrite');
  assert.ok(created.permission_overwrites.some((o) => o.id === env.DISCORD_APPLICATION_ID && o.type === 1), 'bot member overwrite present');
  const ticketRow = [...mocks.tables.bot_tickets.values()][0];
  assert.equal(ticketRow.status, 'open');
  assert.ok(JSON.stringify(ticketResponse.json.data.components).includes(created.id));

  // Claim without support role -> denied
  const denied = await send(app, { ...commandPayload('ticket'), member: MEMBER_NO_PERMS, type: 3, data: { id: '9', custom_id: `cc_ticket:claim:${ticketRow.id}` } });
  assert.ok(JSON.stringify(denied.json.data.components).includes('support team'));

  // Claim as support -> claimed
  const claimed = await send(app, { ...commandPayload('ticket'), type: 3, data: { id: '10', custom_id: `cc_ticket:claim:${ticketRow.id}` } });
  assert.ok(JSON.stringify(claimed.json.data.components).includes('claimed'));

  // Close flow revalidates the actor at confirmation time.
  await send(app, { ...commandPayload('ticket'), type: 3, data: { id: '11', custom_id: `cc_ticket:close:${ticketRow.id}` } });
  const unauthorized = await send(app, {
    ...commandPayload('ticket'), member: { user: { id: '777888999000111222' }, permissions: '0', roles: [] },
    type: 3, data: { id: '12', custom_id: `cc_ticket:confirm:${ticketRow.id}` },
  });
  assert.ok(JSON.stringify(unauthorized.json.data.components).includes('Only the ticket owner or support can close this'));
  assert.equal(mocks.tables.bot_tickets.get(ticketRow.id).status, 'claimed', 'unauthorized confirmation must not change ticket state');
  mocks.discord.failTicketUpdate = true;
  const failedClose = await send(app, { ...commandPayload('ticket'), type: 3, data: { id: '13', custom_id: `cc_ticket:confirm:${ticketRow.id}` } });
  assert.ok(JSON.stringify(failedClose.json.data.components).includes('Please retry the Close ticket confirmation'));
  assert.equal(mocks.tables.bot_tickets.get(ticketRow.id).status, 'claimed', 'failed persistence must not report ticket closed');
  assert.ok(mocks.discord.permissions.some((p) => p.target === ticketRow.user_id && p.deny === '2048'), 'Discord restriction may already have applied');
  const permissionPutsBeforeRetry = mocks.discord.permissions.length;
  mocks.discord.failTicketUpdate = false;
  const confirm = await send(app, { ...commandPayload('ticket'), type: 3, data: { id: '14', custom_id: `cc_ticket:confirm:${ticketRow.id}` } });
  assert.ok(JSON.stringify(confirm.json.data.components).includes('closed'));
  assert.equal(mocks.discord.permissions.length, permissionPutsBeforeRetry + 1, 'retry repeats the idempotent permission PUT');
  assert.equal(mocks.tables.bot_tickets.get(ticketRow.id).status, 'closed');
  void env;
});

test('ticket creation compensates failed Discord and database steps', async (t) => {
  for (const failure of ['channel', 'insert-http', 'insert-network', 'message', 'channel-cleanup', 'row-cleanup']) {
    await t.test(failure, async (t) => {
      const errorLog = t.mock.method(console, 'error', () => {});
      const mocks = makeMocks();
      const guildId = commandPayload('ticket').guild_id;
      mocks.tables.bot_guilds.set(guildId, { guild_id: guildId, config: { ticket_category_id: '400000000000000001' } });
      const attempted = [];
      const fetcher = async (input, init = {}) => {
        const url = new URL(String(input));
        attempted.push(`${init.method} ${url.pathname}`);
        if (failure === 'channel' && init.method === 'POST' && url.pathname.endsWith('/channels')) {
          return new Response('{}', { status: 500 });
        }
        if (init.method === 'POST' && url.pathname.endsWith('/bot_tickets')) {
          if (failure === 'insert-http') return new Response('{}', { status: 500 });
          if (failure === 'insert-network') {
            await mocks.fetcher(input, init); // The write committed before the connection failed.
            throw new Error('connection lost');
          }
        }
        if (init.method === 'POST' && url.pathname.endsWith('/messages') && ['message', 'channel-cleanup', 'row-cleanup'].includes(failure)) {
          return new Response('{}', { status: 500 });
        }
        if (init.method === 'DELETE' && ((failure === 'channel-cleanup' && url.host === 'discord.com') || (failure === 'row-cleanup' && url.host === 'unittest.supabase.co'))) {
          return new Response('{}', { status: 500 });
        }
        return mocks.fetcher(input, init);
      };
      const response = await send(createApp(makeEnv(), fetcher), {
        ...commandPayload('ticket'), type: 5,
        data: { custom_id: 'cc_modal:ticket', components: [value('ticket_subject', 'Help'), value('ticket_details', 'Details')] },
      });
      assert.ok(JSON.stringify(response.json).includes('Something went wrong'));
      if (failure.endsWith('-cleanup')) {
        const context = errorLog.mock.calls.find((call) => call.arguments[0] === 'Ticket cleanup failed')?.arguments[1];
        assert.ok(context?.ticketId);
        assert.equal(context.channelId, 'ch-1');
        if (failure === 'row-cleanup') assert.ok(mocks.tables.bot_tickets.has(context.ticketId));
        const errors = errorLog.mock.calls.find((call) => call.arguments[0] === 'interaction failed: Ticket creation and cleanup failed')?.arguments[1];
        assert.equal(errors?.length, 2);
        assert.match(errors[0].message, /POST .*messages/);
        assert.match(errors[1].message, failure === 'channel-cleanup' ? /DELETE .*channels/ : /Ticket cleanup failed: HTTP 500/);
      }
      assert.equal(mocks.discord.channels.size, failure === 'channel-cleanup' ? 1 : 0);
      assert.equal(mocks.tables.bot_tickets.size, failure === 'row-cleanup' ? 1 : 0);
      if (failure !== 'channel') {
        assert.ok(attempted.includes('DELETE /api/v10/channels/ch-1'));
        assert.ok(attempted.includes('DELETE /rest/v1/bot_tickets'));
      } else {
        assert.ok(!attempted.some((call) => call.startsWith('DELETE')));
      }
    });
  }
});

test('ticket category and support subcommands save nested option values', async () => {
  const mocks = makeMocks();
  const app = createApp(makeEnv(), mocks.fetcher);

  const category = await send(app, commandPayload('ticket', [{ name: 'category', options: [{ name: 'channel', value: '400000000000000001' }] }]));
  assert.ok(JSON.stringify(category.json.data.components).includes('Ticket category set'));
  const support = await send(app, commandPayload('ticket', [{ name: 'support', options: [{ name: 'role', value: '500000000000000001' }] }]));
  assert.ok(JSON.stringify(support.json.data.components).includes('Support role set'));

  const config = mocks.tables.bot_guilds.get('100000000000000001').config;
  assert.equal(config.ticket_category_id, '400000000000000001');
  assert.equal(config.support_role_id, '500000000000000001');
});

test('moderation: permissions enforced, actions logged', async () => {
  const mocks = makeMocks();
  const app = createApp(makeEnv(), mocks.fetcher);

  const denied = await send(app, { ...commandPayload('mod', [{ name: 'ban', options: [{ name: 'ban', options: [{ name: 'user', value: '999' }] }] }], { member: MEMBER_NO_PERMS }) });
  assert.equal(denied.status, 200);
  assert.ok(JSON.stringify(denied.json.data.components).includes('BAN_MEMBERS'));
  assert.equal(mocks.discord.bans.length, 0);

  const hierarchyDenied = await send(app, commandPayload('mod', [{ name: 'ban', options: [{ name: 'user', value: '999000111222333445' }] }]));
  assert.ok(JSON.stringify(hierarchyDenied.json.data.components).includes('lower than your highest role'));
  assert.equal(mocks.discord.bans.length, 0, 'higher-ranked target must not be banned');
  const kickDenied = await send(app, commandPayload('mod', [{ name: 'kick', options: [{ name: 'user', value: '999000111222333445' }] }]));
  assert.ok(JSON.stringify(kickDenied.json.data.components).includes('lower than your highest role'));
  assert.equal(mocks.discord.kicks?.length ?? 0, 0, 'higher-ranked target must not be kicked');

  const timeoutDenied = await send(app, commandPayload('mod', [{ name: 'timeout', options: [{ name: 'user', value: '999000111222333445' }, { name: 'minutes', value: 30 }] }]));
  assert.ok(JSON.stringify(timeoutDenied.json.data.components).includes('lower than your highest role'));
  assert.equal(mocks.discord.timeouts.length, 0, 'higher-ranked target must not be timed out');

  for (const action of ['ban', 'kick', 'timeout']) {
    const options = action === 'timeout' ? [{ name: 'user', value: '888000111222333444' }, { name: 'minutes', value: 30 }] : [{ name: 'user', value: '888000111222333444' }];
    const ownerTarget = await send(app, commandPayload('mod', [{ name: action, options }]));
    assert.ok(JSON.stringify(ownerTarget.json.data.components).includes('server owner cannot be moderated'));
  }
  assert.equal(mocks.discord.bans.length, 0, 'owner target must not be banned');
  assert.equal(mocks.discord.kicks?.length ?? 0, 0, 'owner target must not be kicked');
  assert.equal(mocks.discord.timeouts.length, 0, 'owner target must not be timed out');

  for (const action of ['ban', 'kick', 'timeout']) {
    const options = action === 'timeout' ? [{ name: 'user', value: MEMBER.user.id }, { name: 'minutes', value: 30 }] : [{ name: 'user', value: MEMBER.user.id }];
    const self = await send(app, commandPayload('mod', [{ name: action, options }]));
    assert.ok(JSON.stringify(self.json.data.components).includes('cannot moderate yourself'));
  }

  // A server owner actor bypasses actor hierarchy, but the bot itself must outrank the target.
  mocks.discord.botRole = 'actor-role';
  const ownerActor = { ...MEMBER, user: { id: '888000111222333444' }, roles: [] };
  const botBelowTarget = await send(app, commandPayload('mod', [{ name: 'kick', options: [{ name: 'user', value: '999000111222333445' }] }], { member: ownerActor }));
  assert.ok(JSON.stringify(botBelowTarget.json.data.components).includes('bot must have a higher role'));
  assert.equal(mocks.discord.kicks?.length ?? 0, 0, 'bot hierarchy failure must not kick');
  mocks.discord.botRole = 'bot-role';

  mocks.discord.failBotRoleFetch = true;
  const fetchDenied = await send(app, commandPayload('mod', [{ name: 'ban', options: [{ name: 'user', value: '999000111222333444' }] }]));
  assert.ok(JSON.stringify(fetchDenied.json.data.components).includes('Unable to verify the member hierarchy'));
  assert.equal(mocks.discord.bans.length, 0, 'failed bot role fetch must deny ban');
  mocks.discord.failBotRoleFetch = false;

  await send(app, commandPayload('mod', [{ name: 'ban', options: [{ name: 'user', value: '999000111222333444' }, { name: 'reason', value: 'spamming' }, { name: 'delete_days', value: 3 }] }]));
  assert.equal(mocks.discord.bans.length, 1);
  assert.equal(mocks.discord.bans[0].delete_message_seconds, 259200);

  await send(app, commandPayload('mod', [{ name: 'timeout', options: [{ name: 'user', value: '999' }, { name: 'minutes', value: 30 }] }]));
  assert.ok(mocks.discord.timeouts[0].communication_disabled_until);

  await send(app, commandPayload('mod', [{ name: 'purge', options: [{ name: 'count', value: 10 }] }]));
  assert.equal(mocks.discord.purged.length, 10);
});

test('announce: modal creates pending draft, post publishes, cancel discards', async () => {
  const mocks = makeMocks();
  const app = createApp(makeEnv(), mocks.fetcher);

  await send(app, { ...commandPayload('announce'), type: 5, data: { id: '20', custom_id: 'cc_modal:announce', components: [value('announce_title', 'Server Event'), value('announce_body', 'Double XP weekend!')] } });
  const pending = [...mocks.tables.bot_pending.values()][0];
  assert.equal(pending.payload.title, 'Server Event');

  await send(app, { ...commandPayload('announce'), type: 3, data: { id: '21', custom_id: `cc_announce:post:${pending.id}` } });
  const posted = mocks.discord.messages.at(-1);
  assert.ok(JSON.stringify(posted.components).includes('Double XP weekend!'));
  assert.equal(mocks.tables.bot_pending.size, 0);
});

test('config and help render; unknown command handled', async () => {
  const mocks = makeMocks();
  const app = createApp(makeEnv(), mocks.fetcher);
  const config = await send(app, commandPayload('config'));
  assert.ok(JSON.stringify(config.json.data.components).includes('Current Configuration'));
  const help = await send(app, commandPayload('help'));
  assert.ok(JSON.stringify(help.json.data.components).includes('Chaotic Command'));
  const unknown = await send(app, commandPayload('nope'));
  assert.ok(JSON.stringify(unknown.json.data.components).includes('Unknown command'));
});

test('/register requires the secret and registers commands', async () => {
  const mocks = makeMocks();
  const app = createApp(makeEnv(), mocks.fetcher);
  const bad = await send(app, {}, { sign: false, secret: 'wrong', path: '/register' });
  assert.equal(bad.status, 401);
  const missing = await send(app, {}, { sign: false, path: '/register' });
  assert.equal(missing.status, 401);
  assert.equal(mocks.discord.commands, null);
  const unconfigured = createApp({ ...makeEnv(), REGISTER_SECRET: undefined }, mocks.fetcher);
  assert.equal((await send(unconfigured, {}, { sign: false, secret: 'register-secret', path: '/register' })).status, 401);
  const good = await send(app, {}, { sign: false, secret: 'register-secret', path: '/register' });
  assert.deepEqual(good.json.registered, COMMANDS.map((c) => c.name));
  assert.equal(mocks.discord.commands.length, COMMANDS.length);
});

test('APPLICATION_AUTHORIZED sends the onboarding DM', async () => {
  const mocks = makeMocks();
  const app = createApp(makeEnv(), mocks.fetcher);
  const response = await send(app, {
    version: 1,
    application_id: 'x',
    type: 1,
    event: { type: 'APPLICATION_AUTHORIZED', timestamp: new Date().toISOString(), data: { user: { id: '777000111222333444' }, integration_type: 0 } },
  });
  assert.equal(response.status, 204);
  assert.equal(mocks.discord.dms.length, 1);
  assert.ok(mocks.discord.messages.some((m) => JSON.stringify(m.components).includes('Chaotic Command')));
});

test('guild-only commands refuse DMs gracefully', async () => {
  const mocks = makeMocks();
  const app = createApp(makeEnv(), mocks.fetcher);
  const dmAttempt = await send(app, { ...commandPayload('setup'), member: undefined, guild_id: undefined });
  assert.ok(JSON.stringify(dmAttempt.json.data.components).includes('only works inside a server'));
});
