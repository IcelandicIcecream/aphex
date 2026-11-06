// Adapters declared inline in `aphex.config.ts`: core connects the database, builds
// auth from it, and must not reconnect when hot reload re-evaluates the config.
import { existsSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it, expect, vi } from 'vitest';
import { sqliteAdapter } from '@aphexcms/sqlite-adapter';
import type { RequestEvent } from '@sveltejs/kit';
import {
	createCMSHook,
	createCMSConfig,
	resolveCMSConfig,
	__notifyAphexConfigChanged,
	type AuthProvider,
	type CMSConfig,
	type DatabaseDescriptor
} from '@aphexcms/cms-core/server';
import { client, db, drizzleDb, dbDialect } from '$lib/server/db';
import { testCmsConfig } from './fixtures/config';

const provider = testCmsConfig.auth?.provider;
if (!provider) throw new Error('The fixture config should have an auth provider');

function descriptor(key: string, overrides?: Partial<DatabaseDescriptor>) {
	return {
		kind: 'aphex/database' as const,
		key,
		connect: vi.fn(async () => ({ adapter: db, drizzleDb, client, dialect: dbDialect })),
		...overrides
	};
}

function deferredConfig(database: DatabaseDescriptor, factory: () => AuthProvider) {
	const { database: _database, auth: _auth, ...base } = testCmsConfig;
	return createCMSConfig({
		...base,
		graphql: false,
		jobs: undefined,
		database,
		auth: { provider: factory }
	});
}

const request = (path = '/deferred-config-probe') =>
	({
		url: new URL(`http://localhost${path}`),
		request: new Request(`http://localhost${path}`),
		locals: {},
		cookies: { get: () => undefined }
	}) as unknown as RequestEvent;

const resolve = async () => new Response('ok');

describe('deferred adapters', () => {
	it('connects once on the first request, reuses it, and survives hot reload', async () => {
		const database = descriptor(`hook-${crypto.randomUUID()}`);
		const factory = vi.fn(() => provider);
		const handle = createCMSHook(deferredConfig(database, factory));

		expect(database.connect).not.toHaveBeenCalled();

		const first = request();
		await handle({ event: first, resolve });
		expect(database.connect).toHaveBeenCalledTimes(1);
		expect(factory).toHaveBeenCalledTimes(1);
		expect(first.locals.aphexCMS.databaseAdapter).toBe(db);
		expect(first.locals.aphexCMS.auth).toBe(provider);

		await handle({ event: request(), resolve });
		expect(database.connect).toHaveBeenCalledTimes(1);
		expect(factory).toHaveBeenCalledTimes(1);

		// What a schema edit does: the config re-evaluates into a new descriptor.
		const reloaded = descriptor(database.key);
		const reloadedFactory = vi.fn(() => provider);
		__notifyAphexConfigChanged(deferredConfig(reloaded, reloadedFactory));

		await handle({ event: request(), resolve });
		expect(reloaded.connect).not.toHaveBeenCalled();
		expect(reloadedFactory).toHaveBeenCalledTimes(1);
	});

	it('hands the auth factory the resolved adapters', async () => {
		const factory = vi.fn(() => provider);
		const config = deferredConfig(descriptor(`ctx-${crypto.randomUUID()}`), factory);

		const resolved = await resolveCMSConfig(config);

		expect(factory).toHaveBeenCalledWith({
			database: db,
			drizzleDb,
			dialect: dbDialect,
			cache: config.cache ?? null,
			email: config.email ?? null
		});
		expect(resolved.database).toBe(db);
		expect(resolved.auth?.provider).toBe(provider);
	});

	it('retries after a failed connection rather than caching the failure', async () => {
		const key = `retry-${crypto.randomUUID()}`;
		const failing = descriptor(key, {
			connect: async () => {
				throw new Error('database down');
			}
		});
		await expect(resolveCMSConfig(deferredConfig(failing, () => provider))).rejects.toThrow(
			'database down'
		);

		const healthy = descriptor(key);
		await resolveCMSConfig(deferredConfig(healthy, () => provider));
		expect(healthy.connect).toHaveBeenCalledTimes(1);
	});

	it('rejects an auth factory paired with an already-built adapter', async () => {
		const { auth: _auth, ...base } = testCmsConfig;
		const config = createCMSConfig({ ...base, auth: { provider: () => provider } });
		await expect(resolveCMSConfig(config)).rejects.toThrow('already-built adapter');
	});

	it('leaves already-built adapters untouched', async () => {
		const config: CMSConfig = testCmsConfig;
		const resolved = await resolveCMSConfig(config);
		expect(resolved.database).toBe(config.database);
		expect(resolved.auth?.provider).toBe(provider);
	});

	it('sqliteAdapter opens nothing until core connects it, then hands auth the real driver', async () => {
		const directory = await mkdtemp(join(tmpdir(), 'aphex-deferred-'));
		const file = join(directory, 'aphex.db');
		const factory = vi.fn(() => provider);
		try {
			const config = deferredConfig(sqliteAdapter({ url: `file:${file}` }), factory);
			expect(existsSync(file)).toBe(false);

			const resolved = await resolveCMSConfig(config);

			expect(existsSync(file)).toBe(true);
			expect(factory).toHaveBeenCalledWith(expect.objectContaining({ dialect: 'sqlite' }));
			await expect(resolved.database.getInstanceSettings()).resolves.toBeDefined();
		} finally {
			globalThis.__aphexDatabaseConnections?.delete(`sqlite:file:${file}`);
			await rm(directory, { recursive: true });
		}
	});

	it('sqliteAdapter only requires its url once it connects', async () => {
		const database = sqliteAdapter({ url: undefined });
		await expect(database.connect()).rejects.toThrow('`url` is required');
	});

	describe('provider.handle', () => {
		const authRoute = (path: string) => path.startsWith('/api/auth/');

		function handleWith(serve: AuthProvider['handle']) {
			const database = descriptor(`handle-${crypto.randomUUID()}`);
			const config = deferredConfig(database, () => ({ ...provider, handle: serve }));
			const hook = createCMSHook(config);
			__notifyAphexConfigChanged(config);
			return hook;
		}

		const answerAuthRoutes: AuthProvider['handle'] = ({ event, resolve }) =>
			authRoute(event.url.pathname) ? new Response('from provider') : resolve(event);

		it('answers its own routes before any CMS auth check', async () => {
			const getSession = vi.spyOn(provider, 'getSession');
			const next = vi.fn(resolve);
			const handle = handleWith(answerAuthRoutes);

			const response = await handle({ event: request('/api/auth/sign-in/email'), resolve: next });

			expect(await response.text()).toBe('from provider');
			expect(next).not.toHaveBeenCalled();
			expect(getSession).not.toHaveBeenCalled();
			getSession.mockRestore();
		});

		it('passes other requests through the CMS checks to the app', async () => {
			const requireSession = vi
				.spyOn(provider, 'requireSession')
				.mockRejectedValue(new Error('no'));
			const next = vi.fn(resolve);
			const handle = handleWith(answerAuthRoutes);

			// /admin with no session must still be gated when the provider has a handle.
			await expect(handle({ event: request('/admin'), resolve: next })).rejects.toMatchObject({
				status: 302
			});
			expect(requireSession).toHaveBeenCalled();
			expect(next).not.toHaveBeenCalled();
			requireSession.mockRestore();

			const event = request();
			await handle({ event, resolve: next });
			expect(next).toHaveBeenCalledTimes(1);
			expect(event.locals.previewPerspective).toBeDefined();
		});

		it('is optional, so a provider with no routes of its own still works', async () => {
			const next = vi.fn(resolve);
			const handle = handleWith(undefined);
			await handle({ event: request(), resolve: next });
			expect(next).toHaveBeenCalledTimes(1);
		});
	});
});
