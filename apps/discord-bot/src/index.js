// Cloudflare Worker entrypoint for the Chaotic Minds Command Discord bot.
// HTTP-only: interactions + webhook events arrive as signed POSTs; no gateway.

import {
  verifySignature, createApi, pong, reply, noContent, json,
  EPHEMERAL_V2, container, textDisplay, COLORS,
} from './lib.js';
import { COMMANDS } from './commands.js';
import { createStore } from './store.js';
import { createHandlers } from './handlers.js';

/** Build the Worker fetch handler: signature checks, /register, interactions, webhook events. */
export function createApp(env, fetcher = fetch) {
  const api = createApi(env.DISCORD_BOT_TOKEN, fetcher);
  const store = createStore(env, fetcher);
  const handlers = createHandlers(env, api, store);

  /** Route a verified interaction payload to its type-specific handler. */
  async function dispatchInteraction(body) {
    if (body.type === 1) return pong();
    if (body.type === 2) return handlers.command(body);
    if (body.type === 3) return handlers.component(body);
    if (body.type === 5) return handlers.modal(body);
    return reply([container(COLORS.DANGER, textDisplay('Unsupported interaction type.'))], EPHEMERAL_V2);
  }

  return {
    async fetch(request, ctx = null) {
      const url = new URL(request.url);

      if (request.method === 'GET') return json({ ok: true, app: 'chaotic-command-bot' });

      // One-shot command registration: POST /register with the shared secret.
      if (url.pathname === '/register') {
        if (!env.REGISTER_SECRET || request.headers.get('X-Register-Secret') !== env.REGISTER_SECRET) {
          return json({ error: 'unauthorized' }, 401);
        }
        const registered = await api('PUT', `/applications/${env.DISCORD_APPLICATION_ID}/commands`, COMMANDS);
        return json({ registered: registered.map((c) => c.name) });
      }

      const rawBody = await request.text();
      if (!(await verifySignature(request, rawBody, env.DISCORD_PUBLIC_KEY))) {
        return new Response('invalid signature', { status: 401 });
      }
      const body = JSON.parse(rawBody);

      // Webhook events: outer payload has {version, application_id, type, event?}.
      // type 0 is the validation PING; type 1 wraps a real event.
      if (body.type === 0 && !body.token) return noContent();
      if (body.event) {
        const work = handlers.webhookEvent(body.event).catch((error) => {
          console.error(`webhook event ${body.event.type} failed: ${error.message}`);
        });
        if (ctx?.waitUntil) ctx.waitUntil(work);
        else await work;
        return noContent();
      }

      // Interactions: {id, token, type, ...}.
      try {
        return await dispatchInteraction(body);
      } catch (error) {
        console.error(`interaction failed: ${error.message}`, error.errors ?? '');
        return reply(
          [container(COLORS.DANGER, textDisplay('## Something went wrong'))],
          EPHEMERAL_V2,
        );
      }
    },
  };
}

export default {
  fetch: (request, env, ctx) => createApp(env, fetch).fetch(request, ctx),
};
