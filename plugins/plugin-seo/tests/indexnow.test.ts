import { afterEach, describe, expect, it, vi } from 'vitest';
import {
	deliverIndexNow,
	indexNowBody,
	indexNowConsumer,
	indexNowKeyResponse
} from '../src/lib/indexnow';

const KEY = 'a1b2c3d4e5f6a7b8';

describe('indexNowBody', () => {
	it('lists the changed addresses on the site, once each', () => {
		expect(
			indexNowBody('https://lilys.example', KEY, '/indexnow.txt', [
				'/classes',
				'/classes',
				'https://lilys.example/blog'
			])
		).toEqual({
			host: 'lilys.example',
			key: KEY,
			keyLocation: 'https://lilys.example/indexnow.txt',
			urlList: ['https://lilys.example/classes', 'https://lilys.example/blog']
		});
	});

	it('leaves out addresses on another host, which would void the whole list', () => {
		expect(
			indexNowBody('https://lilys.example', KEY, '/indexnow.txt', ['https://elsewhere.example/x'])
		).toBeNull();
	});

	it('sends nothing for a site that isn’t https', () => {
		expect(indexNowBody('http://localhost:5173', KEY, '/indexnow.txt', ['/x'])).toBeNull();
	});
});

describe('indexNowKeyResponse', () => {
	it('serves a valid key and nothing else', async () => {
		expect(await indexNowKeyResponse(KEY).text()).toBe(KEY);
		expect(indexNowKeyResponse('bad key').status).toBe(404);
		expect(indexNowKeyResponse(null).status).toBe(404);
	});
});

describe('deliverIndexNow', () => {
	afterEach(() => vi.unstubAllGlobals());

	const options = { key: KEY, siteUrl: () => 'https://lilys.example' };
	const run = async (published: unknown, documentType = 'page') => {
		const fetch = vi.fn(
			async (_url: string, _init: RequestInit) => new Response(null, { status: 202 })
		);
		vi.stubGlobal('fetch', fetch);
		await deliverIndexNow(options, ['page'], {
			organizationId: 'org1',
			payload: { documentId: 'd1', documentType, publishedHash: 'h' },
			findPublished: async () => published,
			warn: () => {}
		});
		return fetch;
	};

	it('sends the published page’s address', async () => {
		const fetch = await run({ slug: 'classes' });
		expect(fetch).toHaveBeenCalledOnce();
		const body = JSON.parse(String(fetch.mock.calls[0]?.[1].body));
		expect(body.urlList).toEqual(['https://lilys.example/classes']);
	});

	it('skips a page hidden from search, and types it wasn’t asked to watch', async () => {
		expect(await run({ slug: 'thanks', seo: { noIndex: true } })).not.toHaveBeenCalled();
		expect(await run({ slug: 'x' }, 'author')).not.toHaveBeenCalled();
	});

	it('throws on an answer worth retrying', async () => {
		vi.stubGlobal('fetch', async () => new Response(null, { status: 429 }));
		await expect(
			deliverIndexNow(options, undefined, {
				organizationId: 'org1',
				payload: { documentId: 'd1', documentType: 'page', publishedHash: null },
				findPublished: async () => ({ slug: 'x' }),
				warn: () => {}
			})
		).rejects.toThrow(/429/);
	});

	it('refuses a key IndexNow wouldn’t accept', () => {
		expect(() => indexNowConsumer({ key: 'short', siteUrl: () => null })).toThrow(/8 to 128/);
	});
});
