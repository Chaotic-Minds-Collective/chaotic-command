// Slash command definitions for the Chaotic Command bot.
// Registered globally via PUT /applications/{id}/commands (the /register route).

const GUILD_ONLY = { integration_types: [0], contexts: [0] };

export const COMMANDS = [
  {
    name: 'setup',
    description: 'Configure the Chaotic Command bot for this server',
    default_member_permissions: '32', // MANAGE_GUILD
    ...GUILD_ONLY,
  },
  {
    name: 'welcome',
    description: 'Welcome message settings',
    default_member_permissions: '32',
    ...GUILD_ONLY,
    options: [
      {
        name: 'message',
        description: 'Set the welcome text ({user} and {server} are replaced)',
        type: 1,
        options: [{ name: 'text', description: 'Welcome text, up to 1500 characters', type: 3, required: true, max_length: 1500 }],
      },
      { name: 'test', description: 'Preview the welcome card in its channel', type: 1 },
      { name: 'on', description: 'Automatic join messages are not available yet', type: 1 },
      { name: 'off', description: 'Disable welcome messages', type: 1 },
    ],
  },
  {
    name: 'ticket',
    description: 'Support ticket system',
    default_member_permissions: '32',
    ...GUILD_ONLY,
    options: [
      { name: 'panel', description: 'Post the ticket panel in this channel', type: 1 },
      {
        name: 'category',
        description: 'Set the category new tickets are created under',
        type: 1,
        options: [{ name: 'channel', description: 'Category channel', type: 7, required: true, channel_types: [4] }],
      },
      {
        name: 'support',
        description: 'Set the support role that can claim tickets',
        type: 1,
        options: [{ name: 'role', description: 'Support team role', type: 8, required: true }],
      },
    ],
  },
  {
    name: 'announce',
    description: 'Compose a branded announcement',
    default_member_permissions: '8192', // MANAGE_MESSAGES
    ...GUILD_ONLY,
  },
  {
    name: 'mod',
    description: 'Moderation tools',
    default_member_permissions: '1099511635990', // BAN | KICK | MANAGE_CHANNELS | MODERATE_MEMBERS | MANAGE_MESSAGES
    ...GUILD_ONLY,
    options: [
      {
        name: 'ban',
        description: 'Ban a member',
        type: 1,
        options: [
          { name: 'user', description: 'Member to ban', type: 6, required: true },
          { name: 'reason', description: 'Reason for the ban', type: 3, max_length: 300 },
          { name: 'delete_days', description: 'Also delete their messages from the last N days', type: 4, min_value: 0, max_value: 7 },
        ],
      },
      {
        name: 'kick',
        description: 'Kick a member',
        type: 1,
        options: [
          { name: 'user', description: 'Member to kick', type: 6, required: true },
          { name: 'reason', description: 'Reason for the kick', type: 3, max_length: 300 },
        ],
      },
      {
        name: 'timeout',
        description: 'Time out a member',
        type: 1,
        options: [
          { name: 'user', description: 'Member to time out', type: 6, required: true },
          { name: 'minutes', description: 'Duration in minutes (max 40320 = 28 days)', type: 4, required: true, min_value: 1, max_value: 40320 },
          { name: 'reason', description: 'Reason for the timeout', type: 3, max_length: 300 },
        ],
      },
      {
        name: 'purge',
        description: 'Bulk delete recent messages in this channel',
        type: 1,
        options: [{ name: 'count', description: 'How many messages (2-100)', type: 4, required: true, min_value: 2, max_value: 100 }],
      },
      {
        name: 'slowmode',
        description: 'Set channel slowmode',
        type: 1,
        options: [{ name: 'seconds', description: 'Seconds between messages (0 disables)', type: 4, required: true, min_value: 0, max_value: 21600 }],
      },
    ],
  },
  {
    name: 'config',
    description: 'Show the current bot configuration for this server',
    default_member_permissions: '32',
    ...GUILD_ONLY,
  },
  {
    name: 'help',
    description: 'What the Chaotic Command bot can do',
    integration_types: [0, 1],
    contexts: [0, 1, 2],
  },
];
