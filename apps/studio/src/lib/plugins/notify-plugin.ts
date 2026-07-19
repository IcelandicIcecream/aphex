// @aphexcms/plugin-notify (in-studio prototype) — posts a message to a Discord/Slack-style
// webhook whenever a document is published. The first real consumer of the event system, and
// a template for any "react to a publish" plugin.
//
// It exercises the full self-contained-plugin shape in the smallest surface:
//   - an `aphex/settings` part → the webhook URL, stored as an encrypted `secret`
//   - an `aphex/event/consumer` part → subscribes to `document.published`, reads its own
//     settings, fetches the published doc for a title, and POSTs the webhook
//
// Nothing is wired in `aphex.config.ts` beyond adding this to the plugins array — the plugin
// declares its settings, its subscription, and its reaction, and the host does the rest
// (encryption, relay, delivery job, retries). Lives in the app for now; trivially extractable
// to `plugins/plugin-notify` once the shape is settled.
import { definePlugin, documentPublished } from '@aphexcms/cms-core';

/** Settings key + delivery-job scope. Use the eventual package name so it stays stable on extraction. */
const PLUGIN_ID = '@aphexcms/plugin-notify';

/** Pull the first non-empty string field from a document's published data, for a human title. */
function pickTitle(publishedData: unknown, fallback: string): string {
	if (publishedData && typeof publishedData === 'object') {
		const data = publishedData as Record<string, unknown>;
		for (const key of ['title', 'name', 'heading']) {
			const value = data[key];
			if (typeof value === 'string' && value.trim()) return value;
		}
	}
	return fallback;
}

export const notifyPlugin = definePlugin({
	name: PLUGIN_ID,
	parts: [
		{
			implements: 'aphex/settings',
			pluginId: PLUGIN_ID,
			title: 'Publish Notifications',
			description: 'Post to a Discord/Slack webhook whenever a document is published.',
			fields: [
				{
					name: 'webhookUrl',
					type: 'secret',
					title: 'Webhook URL',
					description: 'Discord/Slack incoming webhook. Stored encrypted; leave blank to disable.'
				}
			]
		},
		{
			implements: 'aphex/event/consumer',
			id: 'notify.on-publish',
			events: ['document.published'],
			async handler({ event, databaseAdapter, logger, settings }) {
				// 1. Read our own decrypted config for this event's org.
				const config = await settings.get(PLUGIN_ID);
				const webhookUrl = config.webhookUrl;
				if (typeof webhookUrl !== 'string' || !webhookUrl) {
					logger.debug('[notify] no webhook URL configured; skipping');
					return;
				}

				// 2. The event carries ids only (lean by design) — fetch the doc for a title.
				const { documentId, documentType } = documentPublished.parse(event.payload);
				const doc = await databaseAdapter.findByDocIdAdvanced(event.organizationId, documentId);
				const title = pickTitle(doc?.publishedData, documentId);

				// 3. POST the webhook. `content` is Discord's field; Slack uses `text` — send both so
				//    one payload works for either. Throwing on a bad response lets the delivery job
				//    retry with backoff (the whole point of running this as a durable job).
				const message = `📝 **${title}** (${documentType}) was just published.`;
				const res = await fetch(webhookUrl, {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({ content: message, text: message })
				});
				if (!res.ok) {
					throw new Error(`[notify] webhook POST failed: ${res.status} ${res.statusText}`);
				}
				logger.info(`[notify] posted publish notification for ${documentType} "${title}"`);
			}
		}
	]
});
