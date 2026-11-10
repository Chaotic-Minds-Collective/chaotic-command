// Chaotic Command bot - shared helpers: signature verification, component
// builders (Components v2), and a thin Discord REST wrapper.

export const FLAG_COMPONENTS_V2 = 1 << 15; // 32768 - enables v2 components
export const FLAG_EPHEMERAL = 1 << 6; // 64 - only the invoking user sees it
export const EPHEMERAL_V2 = FLAG_COMPONENTS_V2 | FLAG_EPHEMERAL;

export const COLORS = {
  ACCENT: 0x00e5cc, // electric turquoise
  DANGER: 0xed4245,
  SUCCESS: 0x57f287,
  WARN: 0xfee75c,
};

export const PERMISSIONS = {
  KICK_MEMBERS: 1n << 1n,
  BAN_MEMBERS: 1n << 2n,
  MANAGE_CHANNELS: 1n << 4n,
  MANAGE_GUILD: 1n << 5n,
  MANAGE_MESSAGES: 1n << 13n,
  MANAGE_ROLES: 1n << 28n,
  MODERATE_MEMBERS: 1n << 40n,
};

/** True when the interaction member has every named permission. */
export function hasPermission(bits, ...names) {
  let value;
  try {
    value = BigInt(bits ?? 0);
  } catch {
    return false;
  }
  return names.every((name) => (value & PERMISSIONS[name]) === PERMISSIONS[name]);
}

/** Decode a hex string into bytes, tolerating odd-length input. */
export function hexToBytes(hex) {
  const clean = hex.length % 2 ? `0${hex}` : hex;
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < bytes.length; i++) bytes[i] = Number.parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  return bytes;
}

/** Verify an interaction or webhook-event request came from Discord. */
export async function verifySignature(request, rawBody, publicKeyHex) {
  const signature = request.headers.get('X-Signature-Ed25519') ?? '';
  const timestamp = request.headers.get('X-Signature-Timestamp') ?? '';
  if (!signature || !timestamp || !publicKeyHex) return false;
  const timestampMs = Number(timestamp) * 1000;
  if (!Number.isFinite(timestampMs) || Math.abs(Date.now() - timestampMs) > 5 * 60 * 1000) return false;
  try {
    const payload = new TextEncoder().encode(timestamp + rawBody);
    const key = await crypto.subtle.importKey('raw', hexToBytes(publicKeyHex), { name: 'Ed25519' }, false, ['verify']);
    return crypto.subtle.verify('Ed25519', key, hexToBytes(signature), payload);
  } catch {
    return false;
  }
}

// --- Components v2 builders -------------------------------------------------

/** Build a Components v2 text display. */
export const textDisplay = (content) => ({ type: 10, content });
/** Build a Components v2 separator. */
export const separator = () => ({ type: 14, divider: true, spacing: 1 });
/** Build an action row holding buttons or selects. */
export const actionRow = (...components) => ({ type: 1, components });
/** Build a button component. */
export const button = ({ custom_id, label, style = 1, disabled = false }) => ({ type: 2, style, label, custom_id, disabled });
/** Build a channel select menu restricted to the given channel types. */
export const channelSelect = (custom_id, placeholder, channel_types = [0]) => ({ type: 8, custom_id, placeholder, channel_types });
/** Build a role select menu. */
export const roleSelect = (custom_id, placeholder) => ({ type: 6, custom_id, placeholder });
/** Build a Components v2 container with an accent color. */
export const container = (accent_color, ...components) => ({ type: 17, accent_color, components });
/** Build a Components v2 section with an accessory component. */
export const section = (content, accessory) => ({ type: 9, components: [textDisplay(content)], accessory });
/** Build a Components v2 thumbnail. */
export const thumbnail = (url) => ({ type: 11, media: { url } });

// Modal builders (Label wraps inputs; Text Input inside Action Rows is deprecated)
/** Build a modal label wrapping a single input component. */
export const label = (text, component, description) => ({ type: 18, label: text, component, ...(description ? { description } : {}) });
/** Build a modal text input. */
export const textInput = ({ custom_id, style = 1, required = true, min_length = 1, max_length = 100, placeholder }) => ({
  type: 4, custom_id, style, required, min_length, max_length, ...(placeholder ? { placeholder } : {}),
});

// --- Discord REST -----------------------------------------------------------

export const DISCORD_API = 'https://discord.com/api/v10';

/** Create a Discord REST caller that JSON-decodes responses and throws on errors. */
export function createApi(token, fetcher = fetch) {
  return async function api(method, path, body) {
    const response = await fetcher(`${DISCORD_API}${path}`, {
      method,
      headers: { Authorization: `Bot ${token}`, 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await response.text();
    let data = null;
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }
    }
    if (!response.ok) {
      const error = new Error(`Discord ${method} ${path} -> ${response.status}`);
      error.status = response.status;
      error.data = data;
      throw error;
    }
    return data;
  };
}

// --- Interaction response shapes -------------------------------------------

/** Serialize an interaction response payload as JSON. */
export const interactionResponse = (payload) => new Response(JSON.stringify(payload), { headers: { 'Content-Type': 'application/json' } });
/** Answer a PING with the PONG response Discord requires. */
export const pong = () => interactionResponse({ type: 1 });
/** Build an ephemeral-first channel-message-with-source reply. */
export const reply = (components, flags = FLAG_COMPONENTS_V2) => interactionResponse({ type: 4, data: { flags, components } });
/** Build an update-the-message response for component interactions. */
export const updateMessage = (components, flags = FLAG_COMPONENTS_V2) => interactionResponse({ type: 7, data: { flags, components } });
/** Build a modal-opening response. */
export const showModal = (custom_id, title, components) => interactionResponse({ type: 9, data: { custom_id, title, components } });
/** Build an empty 204 acknowledgement for webhook events. */
export const noContent = () => new Response(null, { status: 204 });
/** Build a JSON response with the given status. */
export const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
