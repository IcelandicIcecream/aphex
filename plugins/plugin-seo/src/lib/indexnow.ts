/**
 * IndexNow: when a document is published, tell Bing (and Yandex, Seznam, Naver and
 * the others that share it) which addresses changed, so they're crawled within
 * minutes instead of whenever the crawler comes round. Google doesn't take IndexNow;
 * it reads your sitemap.
 *
 * Runs as an event consumer on `document.published`, so it's out of the publish
 * itself: a slow or failing IndexNow never slows or fails a publish, and a 429 or a
 * 5xx is retried by the job queue.
 *
 * The search engine checks the key by fetching it from your site, so the host serves
 * it: `src/routes/indexnow.txt/+server.ts` exporting
 * `GET = () => indexNowKeyResponse(KEY)`.
 */
import { documentPublished } from '@aphexcms/cms-core';
import type { EventConsumerPart } from '@aphexcms/cms-core';
import { seoGenerators } from './config';

const ENDPOINT = 'https://api.indexnow.org/indexnow';

/** IndexNow's rule for a key: 8 to 128 letters, digits and dashes. */
export const isIndexNowKey = (key: string) => /^[a-zA-Z0-9-]{8,128}$/.test(key);

export interface IndexNowOptions {
	/**
	 * The key, or a function giving each organization its own (a multi-site host).
	 * Return `null` to send nothing for that organization.
	 */
	key: string | ((organizationId: string) => string | null);
	/**
	 * The site's public address for an organization (`https://example.com`), or
	 * `null` to send nothing. Nothing is sent for an address that isn't https, so a
	 * development server is never reported.
	 */
	siteUrl: (organizationId: string) => string | null | Promise<string | null>;
	/** Where the key is served on the site. Default `/indexnow.txt`. */
	keyPath?: string;
	/**
	 * The addresses a publish changed, as paths or full URLs. Default: the document's
	 * own address from `generateURL`. Return more for pages that list it (a blog's
	 * index), or none to skip it.
	 */
	paths?: (doc: { type: string; data: Record<string, unknown> }) => string[];
	/** Only these document types. Default: the plugin's `collections`, else every type. */
	types?: string[];
}

/** The response for the key file. */
export function indexNowKeyResponse(key: string | null): Response {
	if (!key || !isIndexNowKey(key)) return new Response('Not found', { status: 404 });
	return new Response(key, {
		headers: {
			'content-type': 'text/plain; charset=utf-8',
			'cache-control': 'public, max-age=86400'
		}
	});
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === 'object' && value !== null && !Array.isArray(value);

/** The body IndexNow takes, or `null` when there's nothing it may be sent. */
export function indexNowBody(origin: string, key: string, keyPath: string, paths: string[]) {
	const site = new URL(origin);
	if (site.protocol !== 'https:' || !isIndexNowKey(key)) return null;
	// IndexNow refuses the whole list if any address is on another host.
	const urlList = [
		...new Set(
			paths
				.map((path) => new URL(path, site))
				.filter((u) => u.host === site.host)
				.map((u) => u.href)
		)
	];
	if (urlList.length === 0) return null;
	return { host: site.host, key, keyLocation: new URL(keyPath, site).href, urlList };
}

/** What one delivery needs, kept apart from the consumer's context so it can be tested. */
export interface IndexNowDelivery {
	organizationId: string;
	payload: unknown;
	/** The document's published data, or `null` when it's gone. */
	findPublished: (organizationId: string, documentId: string) => Promise<unknown>;
	warn: (message: string) => void;
}

/** Report one publish. Throws on an answer worth retrying. */
export async function deliverIndexNow(
	options: IndexNowOptions,
	types: string[] | undefined,
	{ organizationId, payload, findPublished, warn }: IndexNowDelivery
): Promise<void> {
	const { documentId, documentType } = documentPublished.parse(payload);
	if (types && types.length > 0 && !types.includes(documentType)) return;

	const key = typeof options.key === 'string' ? options.key : options.key(organizationId);
	const origin = await options.siteUrl(organizationId);
	if (!key || !origin) return;

	const data = await findPublished(organizationId, documentId);
	if (!isRecord(data)) return;
	// A page hidden from search shouldn't be pointed out to one.
	if (isRecord(data.seo) && data.seo.noIndex === true) return;

	const paths = options.paths
		? options.paths({ type: documentType, data })
		: [seoGenerators().generateURL(data, { typeName: documentType })];
	const body = indexNowBody(origin, key, options.keyPath ?? '/indexnow.txt', paths);
	if (!body) return;

	const response = await fetch(ENDPOINT, {
		method: 'POST',
		headers: { 'content-type': 'application/json; charset=utf-8' },
		body: JSON.stringify(body)
	});
	// 429 and 5xx are worth another try; a 4xx won't change by retrying.
	if (response.status === 429 || response.status >= 500) {
		throw new Error(`IndexNow answered ${response.status}`);
	}
	if (!response.ok)
		warn(`[seo] IndexNow answered ${response.status} for ${body.urlList.join(', ')}`);
}

export function indexNowConsumer(
	options: IndexNowOptions,
	collections?: string[]
): EventConsumerPart {
	if (typeof options.key === 'string' && !isIndexNowKey(options.key)) {
		throw new Error('seoPlugin: an IndexNow key is 8 to 128 letters, digits and dashes.');
	}
	const types = options.types ?? collections;

	return {
		implements: 'aphex/event/consumer',
		id: 'seo.indexnow',
		events: ['document.published'],
		maxAttempts: 4,
		handler: ({ event, databaseAdapter, logger }) =>
			deliverIndexNow(options, types, {
				organizationId: event.organizationId,
				payload: event.payload,
				findPublished: async (organizationId, documentId) =>
					(await databaseAdapter.findByDocIdAdvanced(organizationId, documentId))?.publishedData ??
					null,
				warn: (message) => logger.warn(message)
			})
	};
}
