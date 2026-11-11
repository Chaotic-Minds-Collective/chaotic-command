// Interaction handlers: commands, components, modals, and webhook events.

import {
  COLORS, EPHEMERAL_V2, hasPermission, actionRow, button, channelSelect, roleSelect,
  container, textDisplay, separator, showModal, label, textInput, updateMessage, reply,
} from './lib.js';

/** Default per-guild configuration used when nothing is stored yet. */
export const DEFAULT_CONFIG = () => ({
  welcome: { enabled: false, channel_id: null, message: 'Welcome {user} to **{server}**! Grab your roles and say hi.' },
  ticket_category_id: null,
  support_role_id: null,
  mod_log_channel_id: null,
  announce_channel_id: null,
});

// Maps setup select custom_ids to config paths.
const SETUP_FIELDS = {
  'cc_setup:welcome_channel': ['welcome', 'channel_id'],
  'cc_setup:ticket_category': ['ticket_category_id'],
  'cc_setup:mod_log': ['mod_log_channel_id'],
  'cc_setup:support_role': ['support_role_id'],
  'cc_setup:announce_channel': ['announce_channel_id'],
};

/** Build the bot's interaction and webhook-event handlers over Discord REST and Supabase. */
export function createHandlers(env, api, store) {
  /** Load defaults and normalize unsupported automatic welcomes, preserving card settings. */
  async function getConfig(guildId) {
    const stored = await store.getConfig(guildId);
    const base = DEFAULT_CONFIG();
    return {
      ...base,
      ...(stored ?? {}),
      welcome: { ...base.welcome, ...(stored?.welcome ?? {}), enabled: false },
    };
  }

  /** Load, mutate, and persist a guild's config in one step. */
  const withConfig = async (guildId, mutator) => {
    const config = await getConfig(guildId);
    mutator(config);
    await store.saveConfig(guildId, config);
    return config;
  };

  /** Persist a single config field addressed by its path array. */
  const setConfigField = (guildId, path, value) =>
    withConfig(guildId, (config) => {
      if (path.length === 2) config[path[0]][path[1]] = value;
      else config[path[0]] = value;
    });

  /** Resolve a guild's name for message templates, with a fallback. */
  const guildName = async (guildId) => (await api('GET', `/guilds/${guildId}`))?.name ?? 'your server';

  /** Fail closed unless the actor outranks the target in the guild role hierarchy. */
  const moderationHierarchyBlock = async (interaction, targetId) => {
    const guildId = interaction.guild_id;
    const actorId = interaction.member?.user?.id;
    if (!actorId || !targetId) return 'Unable to verify the member hierarchy. Moderation was canceled.';
    if (actorId === targetId) return 'You cannot moderate yourself.';

    try {
      const [guild, roles, target, botMember] = await Promise.all([
        api('GET', '/guilds/' + guildId),
        api('GET', '/guilds/' + guildId + '/roles'),
        api('GET', '/guilds/' + guildId + '/members/' + targetId),
        api('GET', '/guilds/' + guildId + '/members/' + env.DISCORD_APPLICATION_ID),
      ]);
      if (targetId === guild.owner_id) return 'The server owner cannot be moderated.';
      const actorIsOwner = actorId === guild.owner_id;
      if (!Array.isArray(roles) || !Array.isArray(target?.roles) || !Array.isArray(interaction.member.roles) || !Array.isArray(botMember?.roles)) {
        return 'Unable to verify the member hierarchy. Moderation was canceled.';
      }

      const positions = new Map(roles.map((role) => [role.id, Number(role.position) || 0]));
      positions.set(guildId, 0); // @everyone
      const highestPosition = (roleIds) => Math.max(0, ...roleIds.map((id) => positions.get(id) ?? 0));
      const actorPosition = highestPosition(interaction.member.roles);
      const targetPosition = highestPosition(target.roles);
      const botPosition = highestPosition(botMember.roles);
      if (targetPosition >= botPosition) return 'The bot must have a higher role than the target to perform this action.';
      if (!actorIsOwner && targetPosition >= actorPosition) return 'You can only moderate members with roles lower than your highest role.';
      return null;
    } catch {
      return 'Unable to verify the member hierarchy. Moderation was canceled.';
    }
  };

  /** Shared ticket-close rule for the initial and confirmation interactions. */
  const canCloseTicket = (interaction, ticket, config) =>
    interaction.member.user.id === ticket.user_id
    || interaction.member.roles?.includes(config.support_role_id)
    || hasPermission(interaction.member?.permissions, 'MANAGE_MESSAGES');

  /** Post a moderation action summary to the configured mod-log channel. */
  const logMod = async (guildId, config, actorMention, line) => {
    if (!config.mod_log_channel_id) return;
    await api('POST', `/channels/${config.mod_log_channel_id}/messages`, {
      flags: 32768,
      components: [container(COLORS.ACCENT, textDisplay(`**Mod log** - ${line}\n-# Actor: ${actorMention}`))],
    });
  };

  /** Build the branded welcome card with {user}/{server} placeholders applied. */
  const welcomeCard = (config, serverName, userMention) => {
    const text = config.welcome.message
      .replaceAll('{user}', userMention)
      .replaceAll('{server}', serverName);
    return container(COLORS.ACCENT, textDisplay(`# Welcome to ${serverName}\n${text}`));
  };

  // --- /setup panel ---------------------------------------------------------

  /** Render the /setup panel with one select per configurable field. */
  const renderSetup = (config) => [
    container(
      COLORS.ACCENT,
      textDisplay('# Server Setup\nPick channels and roles below - each save is instant. Come back any time with `/setup`.'),
      separator(),
      actionRow(channelSelect('cc_setup:welcome_channel', config.welcome.channel_id ? `Welcome channel: <#${config.welcome.channel_id}>` : 'Welcome channel: not set', [0])),
      actionRow(channelSelect('cc_setup:ticket_category', config.ticket_category_id ? `Ticket category: <#${config.ticket_category_id}>` : 'Ticket category: not set', [4])),
      actionRow(roleSelect('cc_setup:support_role', config.support_role_id ? `Support role: set` : 'Support role: not set')),
      actionRow(channelSelect('cc_setup:mod_log', config.mod_log_channel_id ? `Mod log: <#${config.mod_log_channel_id}>` : 'Mod log: not set', [0])),
      actionRow(channelSelect('cc_setup:announce_channel', config.announce_channel_id ? `Announcement channel: <#${config.announce_channel_id}>` : 'Announcement channel: not set', [0])),
      separator(),
      textDisplay(`-# Welcome: ${config.welcome.enabled ? 'ON' : 'OFF'} - set the text with \`/welcome message\``),
    ),
  ];

  /** Reply with a warning when an interaction arrives outside a guild. */
  const requireGuild = (interaction) => {
    if (!interaction.member || !interaction.guild_id) {
      return reply([container(COLORS.WARN, textDisplay('This command only works inside a server.'))], EPHEMERAL_V2);
    }
    return null;
  };

  /** Reply with a warning unless the member has every named permission. */
  const requirePermissions = (interaction, ...names) => {
    if (!hasPermission(interaction.member?.permissions, ...names)) {
      return reply(
        [container(COLORS.DANGER, textDisplay(`You need the **${names.join(' + ')}** permission to do that.`))],
        EPHEMERAL_V2,
      );
    }
    return null;
  };

  // --- Commands -------------------------------------------------------------

  /** Handle a slash-command interaction (type 2). */
  async function command(interaction) {
    const name = interaction.data.name;

    if (name === 'setup') {
      const blocked = requireGuild(interaction) ?? requirePermissions(interaction, 'MANAGE_GUILD');
      if (blocked) return blocked;
      const config = await getConfig(interaction.guild_id);
      return reply(renderSetup(config), EPHEMERAL_V2);
    }

    if (name === 'welcome') {
      const blocked = requireGuild(interaction) ?? requirePermissions(interaction, 'MANAGE_GUILD');
      if (blocked) return blocked;
      const guildId = interaction.guild_id;
      const sub = interaction.data.options?.[0]?.name;
      const config = await getConfig(guildId);

      if (sub === 'message') {
        return showModal('cc_modal:welcome', 'Welcome message', [
          label('Welcome text', textInput({ custom_id: 'welcome_text', style: 2, max_length: 1500, min_length: 1, placeholder: 'Use {user} and {server}' }), '{user} and {server} are replaced automatically'),
        ]);
      }
      if (sub === 'test') {
        if (!config.welcome.channel_id) {
          return reply([container(COLORS.WARN, textDisplay('Pick a welcome channel first - run `/setup`.'))], EPHEMERAL_V2);
        }
        const serverName = await guildName(guildId);
        const card = welcomeCard(config, serverName, `<@${interaction.member.user.id}>`);
        await api('POST', `/channels/${config.welcome.channel_id}/messages`, { flags: 32768, components: [card] });
        return reply([container(COLORS.SUCCESS, textDisplay(`Preview posted in <#${config.welcome.channel_id}>.`))], EPHEMERAL_V2);
      }
      if (sub === 'on') {
        return reply([container(COLORS.WARN, textDisplay('Automatic welcome messages are not available yet. You can configure the welcome card and use `/welcome test` to preview it.'))], EPHEMERAL_V2);
      }
      if (sub === 'off') {
        await withConfig(guildId, (c) => { c.welcome.enabled = false; });
        return reply([container(COLORS.SUCCESS, textDisplay('Welcome messages disabled.'))], EPHEMERAL_V2);
      }
      return reply([container(COLORS.WARN, textDisplay('Unknown subcommand.'))], EPHEMERAL_V2);
    }

    if (name === 'ticket') {
      const blocked = requireGuild(interaction) ?? requirePermissions(interaction, 'MANAGE_GUILD');
      if (blocked) return blocked;
      const guildId = interaction.guild_id;
      const sub = interaction.data.options?.[0]?.name;
      const subOptions = new Map((interaction.data.options?.[0]?.options ?? []).map((o) => [o.name, o]));

      if (sub === 'panel') {
        await api('POST', `/channels/${interaction.channel_id}/messages`, {
          flags: 32768,
          components: [
            container(
              COLORS.ACCENT,
              textDisplay('# Support Tickets\nNeed a hand? Open a private ticket and the support team will pick it up.'),
              separator(),
              actionRow(button({ custom_id: 'cc_ticket:open', label: 'Open a ticket', style: 1 })),
            ),
          ],
        });
        return reply([container(COLORS.SUCCESS, textDisplay('Ticket panel posted in this channel.'))], EPHEMERAL_V2);
      }
      if (sub === 'category') {
        const categoryId = subOptions.get('channel').value;
        await setConfigField(guildId, ['ticket_category_id'], categoryId);
        return reply([container(COLORS.SUCCESS, textDisplay(`Ticket category set to <#${categoryId}>.`))], EPHEMERAL_V2);
      }
      if (sub === 'support') {
        const roleId = subOptions.get('role').value;
        await setConfigField(guildId, ['support_role_id'], roleId);
        return reply([container(COLORS.SUCCESS, textDisplay(`Support role set to <@&${roleId}>.`))], EPHEMERAL_V2);
      }
      return reply([container(COLORS.WARN, textDisplay('Unknown subcommand.'))], EPHEMERAL_V2);
    }

    if (name === 'announce') {
      const blocked = requireGuild(interaction) ?? requirePermissions(interaction, 'MANAGE_MESSAGES');
      if (blocked) return blocked;
      return showModal('cc_modal:announce', 'New announcement', [
        label('Title', textInput({ custom_id: 'announce_title', max_length: 100 })),
        label('Message', textInput({ custom_id: 'announce_body', style: 2, max_length: 2000 })),
      ]);
    }

    if (name === 'mod') {
      const guildId = interaction.guild_id;
      const sub = interaction.data.options?.[0]?.name;
      const subOptions = new Map((interaction.data.options?.[0]?.options ?? []).map((o) => [o.name, o.value]));
      const targetId = subOptions.get('user');
      const reason = subOptions.get('reason') ?? 'No reason given';
      const actor = `<@${interaction.member.user.id}>`;
      const config = await getConfig(guildId);

      if (sub === 'ban') {
        const blocked = requireGuild(interaction) ?? requirePermissions(interaction, 'BAN_MEMBERS');
        if (blocked) return blocked;
        const hierarchyBlock = await moderationHierarchyBlock(interaction, targetId);
        if (hierarchyBlock) return reply([container(COLORS.DANGER, textDisplay(hierarchyBlock))], EPHEMERAL_V2);
        const days = Number(subOptions.get('delete_days') ?? 0);
        await api('PUT', `/guilds/${guildId}/bans/${targetId}`, { delete_message_seconds: Math.min(days * 86400, 604800) });
        await logMod(guildId, config, actor, `**Banned** <@${targetId}> - ${reason}${days ? ` (purged ${days}d of messages)` : ''}`);
        return reply([container(COLORS.SUCCESS, textDisplay(`**Banned** <@${targetId}> - ${reason}`))], EPHEMERAL_V2);
      }
      if (sub === 'kick') {
        const blocked = requireGuild(interaction) ?? requirePermissions(interaction, 'KICK_MEMBERS');
        if (blocked) return blocked;
        const hierarchyBlock = await moderationHierarchyBlock(interaction, targetId);
        if (hierarchyBlock) return reply([container(COLORS.DANGER, textDisplay(hierarchyBlock))], EPHEMERAL_V2);
        await api('DELETE', `/guilds/${guildId}/members/${targetId}`);
        await logMod(guildId, config, actor, `**Kicked** <@${targetId}> - ${reason}`);
        return reply([container(COLORS.SUCCESS, textDisplay(`**Kicked** <@${targetId}> - ${reason}`))], EPHEMERAL_V2);
      }
      if (sub === 'timeout') {
        const blocked = requireGuild(interaction) ?? requirePermissions(interaction, 'MODERATE_MEMBERS');
        if (blocked) return blocked;
        const hierarchyBlock = await moderationHierarchyBlock(interaction, targetId);
        if (hierarchyBlock) return reply([container(COLORS.DANGER, textDisplay(hierarchyBlock))], EPHEMERAL_V2);
        const minutes = Number(subOptions.get('minutes'));
        const until = new Date(Date.now() + minutes * 60000).toISOString();
        await api('PATCH', `/guilds/${guildId}/members/${targetId}`, { communication_disabled_until: until });
        await logMod(guildId, config, actor, `**Timed out** <@${targetId}> for ${minutes}m - ${reason}`);
        return reply([container(COLORS.SUCCESS, textDisplay(`**Timed out** <@${targetId}> for ${minutes} minute(s).`))], EPHEMERAL_V2);
      }
      if (sub === 'purge') {
        const blocked = requireGuild(interaction) ?? requirePermissions(interaction, 'MANAGE_MESSAGES');
        if (blocked) return blocked;
        const count = Number(subOptions.get('count'));
        const recent = await api('GET', `/channels/${interaction.channel_id}/messages?limit=${Math.min(count, 100)}`);
        const ids = recent
          .filter((m) => !m.pinned && Date.now() - Date.parse(m.timestamp) < 14 * 86400000)
          .slice(0, count)
          .map((m) => m.id);
        if (ids.length < 2) {
          return reply([container(COLORS.WARN, textDisplay('Not enough purgeable recent messages (2+, under 14 days old, unpinned).'))], EPHEMERAL_V2);
        }
        await api('POST', `/channels/${interaction.channel_id}/messages/bulk-delete`, { messages: ids });
        await logMod(guildId, config, actor, `**Purged** ${ids.length} messages in <#${interaction.channel_id}>`);
        return reply([container(COLORS.SUCCESS, textDisplay(`Purged **${ids.length}** messages.`))], EPHEMERAL_V2);
      }
      if (sub === 'slowmode') {
        const blocked = requireGuild(interaction) ?? requirePermissions(interaction, 'MANAGE_CHANNELS');
        if (blocked) return blocked;
        const seconds = Number(subOptions.get('seconds'));
        await api('PATCH', `/channels/${interaction.channel_id}`, { rate_limit_per_user: seconds });
        return reply([container(COLORS.SUCCESS, textDisplay(`Slowmode set to **${seconds}** second(s).`))], EPHEMERAL_V2);
      }
      return reply([container(COLORS.WARN, textDisplay('Unknown subcommand.'))], EPHEMERAL_V2);
    }

    if (name === 'config') {
      const blocked = requireGuild(interaction) ?? requirePermissions(interaction, 'MANAGE_GUILD');
      if (blocked) return blocked;
      const config = await getConfig(interaction.guild_id);
      return reply([
        container(
          COLORS.ACCENT,
          textDisplay('# Current Configuration'),
          separator(),
          textDisplay(
            [
              `Welcome: ${config.welcome.enabled ? 'ON' : 'OFF'} in ${config.welcome.channel_id ? `<#${config.welcome.channel_id}>` : '*not set*'}`,
              `Ticket category: ${config.ticket_category_id ? `<#${config.ticket_category_id}>` : '*not set*'}`,
              `Support role: ${config.support_role_id ? `<@&${config.support_role_id}>` : '*not set*'}`,
              `Mod log: ${config.mod_log_channel_id ? `<#${config.mod_log_channel_id}>` : '*not set*'}`,
              `Announcements: ${config.announce_channel_id ? `<#${config.announce_channel_id}>` : '*not set*'}`,
            ].join('\n'),
          ),
        ),
      ], EPHEMERAL_V2);
    }

    if (name === 'help') {
      return reply([
        container(
          COLORS.ACCENT,
          textDisplay('# Chaotic Command\nThe method to your madness - server tooling by [Chaotic Command](https://command.chaoticmindsgaming.com).'),
          separator(),
          textDisplay(
            [
              '**/setup** - configure channels and roles',
              '**/welcome** - welcome message settings',
              '**/ticket** - support ticket panel and settings',
              '**/announce** - branded announcements',
              '**/mod** - ban, kick, timeout, purge, slowmode',
              '**/config** - show current settings',
            ].join('\n'),
          ),
        ),
      ], EPHEMERAL_V2);
    }

    return reply([container(COLORS.DANGER, textDisplay(`Unknown command: ${name}`))], EPHEMERAL_V2);
  }

  // --- Components -----------------------------------------------------------

  /** Handle a component (button/select) interaction (type 3). */
  async function component(interaction) {
    const customId = interaction.data.custom_id;
    const guildId = interaction.guild_id;

    if (customId.startsWith('cc_setup:')) {
      const blocked = requirePermissions(interaction, 'MANAGE_GUILD');
      if (blocked) return blocked;
      const path = SETUP_FIELDS[customId];
      const value = interaction.data.values[0];
      await setConfigField(guildId, path, value);
      const config = await getConfig(guildId);
      return updateMessage(renderSetup(config), EPHEMERAL_V2);
    }

    if (customId === 'cc_welcome:test') {
      const blocked = requirePermissions(interaction, 'MANAGE_GUILD');
      if (blocked) return blocked;
      const config = await getConfig(guildId);
      const serverName = await guildName(guildId);
      await api('POST', `/channels/${config.welcome.channel_id}/messages`, {
        flags: 32768,
        components: [welcomeCard(config, serverName, `<@${interaction.member.user.id}>`)],
      });
      return reply([container(COLORS.SUCCESS, textDisplay('Welcome preview posted.'))], EPHEMERAL_V2);
    }

    if (customId === 'cc_ticket:open') {
      return showModal('cc_modal:ticket', 'Open a ticket', [
        label('Subject', textInput({ custom_id: 'ticket_subject', max_length: 100 })),
        label('What do you need?', textInput({ custom_id: 'ticket_details', style: 2, max_length: 1000 })),
      ]);
    }

    if (customId.startsWith('cc_ticket:claim:')) {
      const ticketId = customId.split(':')[2];
      const config = await getConfig(guildId);
      const isSupport = interaction.member.roles?.includes(config.support_role_id);
      const isMod = hasPermission(interaction.member?.permissions, 'MANAGE_MESSAGES');
      if (!isSupport && !isMod) {
        return reply([container(COLORS.DANGER, textDisplay('Only the support team can claim tickets.'))], EPHEMERAL_V2);
      }
      const ticket = await store.getTicket(ticketId);
      if (!ticket) return reply([container(COLORS.DANGER, textDisplay('That ticket no longer exists.'))], EPHEMERAL_V2);
      await store.updateTicket(ticketId, { status: 'claimed', claimed_by: interaction.member.user.id });
      await api('POST', `/channels/${ticket.channel_id}/messages`, {
        flags: 32768,
        components: [container(COLORS.ACCENT, textDisplay(`**Claimed** by <@${interaction.member.user.id}> - they will reply here.`))],
      });
      return reply([container(COLORS.SUCCESS, textDisplay('Ticket claimed.'))], EPHEMERAL_V2);
    }

    if (customId.startsWith('cc_ticket:close:')) {
      const ticketId = customId.split(':')[2];
      const ticket = await store.getTicket(ticketId);
      if (!ticket) return reply([container(COLORS.DANGER, textDisplay('That ticket no longer exists.'))], EPHEMERAL_V2);
      const config = await getConfig(guildId);
      const allowed = canCloseTicket(interaction, ticket, config);
      if (!allowed) return reply([container(COLORS.DANGER, textDisplay('Only the ticket owner or support can close this.'))], EPHEMERAL_V2);
      return reply(
        [
          container(
            COLORS.WARN,
            textDisplay('Close this ticket? The ticket owner will lose the ability to send messages.'),
            actionRow(
              button({ custom_id: `cc_ticket:confirm:${ticketId}`, label: 'Close ticket', style: 4 }),
              button({ custom_id: 'cc_ticket:cancel', label: 'Keep it open', style: 2 }),
            ),
          ),
        ],
        EPHEMERAL_V2,
      );
    }

    if (customId.startsWith('cc_ticket:confirm:')) {
      const ticketId = customId.split(':')[2];
      const ticket = await store.getTicket(ticketId);
      if (!ticket) return reply([container(COLORS.DANGER, textDisplay('That ticket no longer exists.'))], EPHEMERAL_V2);
      const config = await getConfig(guildId);
      const allowed = canCloseTicket(interaction, ticket, config);
      if (!allowed) return reply([container(COLORS.DANGER, textDisplay('Only the ticket owner or support can close this.'))], EPHEMERAL_V2);
      // Discord's permission PUT is idempotent: allow retry if persistence fails after it succeeds.
      await api('PUT', `/channels/${ticket.channel_id}/permissions/${ticket.user_id}`, { type: 1, allow: '0', deny: `${1 << 11}` });
      try {
        await store.updateTicket(ticketId, { status: 'closed', claimed_by: ticket.claimed_by });
      } catch {
        return updateMessage(
          [container(COLORS.WARN, textDisplay('Discord permissions were updated, but the ticket could not be marked closed. Please retry the Close ticket confirmation.'))],
          EPHEMERAL_V2,
        );
      }
      await api('POST', `/channels/${ticket.channel_id}/messages`, {
        flags: 32768,
        components: [container(COLORS.ACCENT, textDisplay(`**Ticket closed** by <@${interaction.member.user.id}>. Staff can still read everything here.`))],
      });
      return updateMessage(
        [container(COLORS.SUCCESS, textDisplay(`Ticket **${ticket.subject}** closed.`))],
        EPHEMERAL_V2,
      );
    }

    if (customId === 'cc_ticket:cancel') {
      return updateMessage([container(COLORS.ACCENT, textDisplay('Ticket stays open.'))], EPHEMERAL_V2);
    }

    if (customId.startsWith('cc_announce:post:')) {
      const pendingId = customId.split(':')[2];
      const blocked = requirePermissions(interaction, 'MANAGE_MESSAGES');
      if (blocked) return blocked;
      const payload = await store.getPending(pendingId);
      if (!payload) return reply([container(COLORS.DANGER, textDisplay('That draft expired - run `/announce` again.'))], EPHEMERAL_V2);
      await api('POST', `/channels/${payload.channel_id}/messages`, {
        flags: 32768,
        components: [container(COLORS.ACCENT, textDisplay(`# ${payload.title}\n${payload.body}\n-# Posted by <@${payload.user_id}>`))],
      });
      await store.deletePending(pendingId);
      return updateMessage([container(COLORS.SUCCESS, textDisplay('Announcement posted.'))], EPHEMERAL_V2);
    }

    if (customId.startsWith('cc_announce:cancel:')) {
      await store.deletePending(customId.split(':')[2]);
      return updateMessage([container(COLORS.ACCENT, textDisplay('Announcement discarded.'))], EPHEMERAL_V2);
    }

    return reply([container(COLORS.DANGER, textDisplay('Unknown button.'))], EPHEMERAL_V2);
  }

  // --- Modals ---------------------------------------------------------------

  /** Handle a modal submission (type 5) for welcome, announce, and tickets. */
  async function modal(interaction) {
    const customId = interaction.data.custom_id;
    const guildId = interaction.guild_id;
    const values = new Map(
      (interaction.data.components ?? []).flatMap((field) => (field.component ? [field.component] : field.components ?? []).map((input) => [input.custom_id, input.value])),
    );

    if (customId === 'cc_modal:welcome') {
      const blocked = requirePermissions(interaction, 'MANAGE_GUILD');
      if (blocked) return blocked;
      await withConfig(guildId, (config) => { config.welcome.message = values.get('welcome_text'); });
      return reply(
        [
          container(
            COLORS.SUCCESS,
            textDisplay('Welcome message saved.'),
            actionRow(button({ custom_id: 'cc_welcome:test', label: 'Post a test welcome', style: 1 })),
          ),
        ],
        EPHEMERAL_V2,
      );
    }

    if (customId === 'cc_modal:announce') {
      const blocked = requirePermissions(interaction, 'MANAGE_MESSAGES');
      if (blocked) return blocked;
      const config = await getConfig(guildId);
      const payload = {
        title: values.get('announce_title'),
        body: values.get('announce_body'),
        channel_id: config.announce_channel_id ?? interaction.channel_id,
        guild_id: guildId,
        user_id: interaction.member.user.id,
      };
      const pendingId = crypto.randomUUID();
      await store.savePending(pendingId, payload);
      return reply(
        [
          container(
            COLORS.WARN,
            textDisplay(`# ${payload.title}\n${payload.body}\n-# Preview - will post in <#${payload.channel_id}>`),
            actionRow(
              button({ custom_id: `cc_announce:post:${pendingId}`, label: 'Post it', style: 1 }),
              button({ custom_id: `cc_announce:cancel:${pendingId}`, label: 'Discard', style: 4 }),
            ),
          ),
        ],
        EPHEMERAL_V2,
      );
    }

    if (customId === 'cc_modal:ticket') {
      const config = await getConfig(guildId);
      if (!config.ticket_category_id) {
        return reply([container(COLORS.WARN, textDisplay('Tickets are not set up yet - an admin needs to run `/ticket category`.'))], EPHEMERAL_V2);
      }
      const userId = interaction.member.user.id;
      const number = String((await store.countTickets(guildId)) + 1).padStart(4, '0');
      const ticketId = crypto.randomUUID();
      let channel;
      try {
        channel = await api('POST', `/guilds/${guildId}/channels`, {
          name: `ticket-${number}`,
          type: 0,
          parent_id: config.ticket_category_id,
          permission_overwrites: [
            { id: guildId, type: 0, deny: `${1 << 10}` },
            { id: env.DISCORD_APPLICATION_ID, type: 1, allow: `${(1 << 10) | (1 << 11)}` },
            { id: userId, type: 1, allow: `${(1 << 10) | (1 << 11) | (1 << 14)}` },
            ...(config.support_role_id ? [{ id: config.support_role_id, type: 0, allow: `${(1 << 10) | (1 << 11) | (1 << 14)}` }] : []),
          ],
        });
        const subject = values.get('ticket_subject');
        await store.createTicket({
          id: ticketId, guild_id: guildId, channel_id: channel.id, user_id: userId,
          subject, status: 'open', claimed_by: null,
        });
        await api('POST', `/channels/${channel.id}/messages`, {
          flags: 32768,
          components: [
            container(
              COLORS.ACCENT,
              textDisplay(`# ${subject}\n${values.get('ticket_details')}\n-# Opened by <@${userId}>`),
              separator(),
              actionRow(
                button({ custom_id: `cc_ticket:claim:${ticketId}`, label: 'Claim', style: 1 }),
                button({ custom_id: `cc_ticket:close:${ticketId}`, label: 'Close', style: 4 }),
              ),
            ),
          ],
        });
      } catch (error) {
        if (channel) {
          // Attempt both compensations even if one provider is unavailable.
          const cleanup = await Promise.allSettled([
            api('DELETE', `/channels/${channel.id}`),
            store.deleteTicket(ticketId),
          ]);
          const failures = cleanup.filter((result) => result.status === 'rejected');
          if (failures.length) {
            console.error('Ticket cleanup failed', { ticketId, channelId: channel.id });
            throw new AggregateError([error, ...failures.map((result) => result.reason)], 'Ticket creation and cleanup failed');
          }
        }
        throw error;
      }
      return reply([container(COLORS.SUCCESS, textDisplay(`Ticket created: <#${channel.id}>`))], EPHEMERAL_V2);
    }

    return reply([container(COLORS.DANGER, textDisplay('Unknown form.'))], EPHEMERAL_V2);
  }

  // --- Webhook events -------------------------------------------------------

  /** Handle application webhook events; DMs the installer on authorization. */
  async function webhookEvent(event) {
    if (event.type === 'APPLICATION_AUTHORIZED') {
      const user = event.data?.user;
      if (!user) return;
      const dm = await api('POST', '/users/@me/channels', { recipient_id: user.id });
      await api('POST', `/channels/${dm.id}/messages`, {
        flags: 32768,
        components: [
          container(
            COLORS.ACCENT,
            textDisplay('# Chaotic Command\nThanks for installing me! Run `/setup` in your server to configure welcome messages, tickets, moderation, and announcements.'),
            separator(),
            textDisplay('-# The method to your madness - [command.chaoticmindsgaming.com](https://command.chaoticmindsgaming.com)'),
          ),
        ],
      });
    }
    // APPLICATION_DEAUTHORIZED and anything else: acknowledged, no action yet.
  }

  return { command, component, modal, webhookEvent, getConfig };
}
