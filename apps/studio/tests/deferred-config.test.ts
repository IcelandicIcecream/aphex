// Adapters declared inline in `aphex.config.ts`: core connects the database, builds
// auth from it, and must not reconnect when hot reload re-evaluates the config.
import { existsSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it, expect, vi } from 'vitest';
import { aphexAuth } from '@aphexcms/auth';
import { sqliteAdapter } from '@aphexcms/sqlite-adapter';
import { s3Storage } from '@aphexcms/storage-s3';
import type { RequestEvent } from '@sveltejs/kit';
import {
	createCMSHook,
	createCMSConfig,
	getAphex,
	resolveCMSConfig,
	__notifyAphexConfigChanged,
	type AuthProvider,
	type CMSConfig,
	type DatabaseDescriptor
} from '@aphexcms/cms-core/server';
import { client, db, drizzleDb, dbDialect } from './helpers/db';
import { testCmsConfig } from './fixtures/config';

const provider = testCmsConfig.auth?.provider;
if (!provider) throw new Error('The fixture config should have an auth provider');

function descriptor(key: string, overrides?: Partial<DatabaseDescriptor>) {
	return {
		kind: 'aphex/database' as const,
		key,
		dialect: dbDialect,
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
		route: { id: null },
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
			email: config.email ?? null,
			building: false
		});
		expect(resolved.database).toBe(db);
		expect(resolved.auth?.provider).toBe(provider);
	});

	it('gives the database the tables the auth provider declares for its dialect', async () => {
		const database = descriptor(`tables-${crypto.randomUUID()}`);
		const tables = { [dbDialect]: { user: {} } };
		const { database: _database, auth: _auth, ...base } = testCmsConfig;

		const resolved = await resolveCMSConfig(
			createCMSConfig({
				...base,
				graphql: false,
				jobs: undefined,
				database,
				auth: { provider: () => provider, tables }
			})
		);

		expect(database.connect).toHaveBeenCalledWith({ tables: tables[dbDialect], building: false });
		expect(resolved.auth).not.toHaveProperty('tables');
	});

	it('aphexAuth declares its tables and the admin defaults, and builds nothing yet', () => {
		const auth = aphexAuth();
		expect(Object.keys(auth.tables?.sqlite ?? {})).toContain('user');
		expect(Object.keys(auth.tables?.pg ?? {})).toContain('user');
		expect(auth.loginUrl).toBe('/admin/login');
		expect(auth.features).toEqual({
			twoFactorMethods: ['totp', 'email'],
			allowAccountDeletion: false,
			requireEmailVerification: false
		});
		expect(typeof auth.provider).toBe('function');
	});

	it('sqliteAdapter creates the auth tables it is given', async () => {
		const directory = await mkdtemp(join(tmpdir(), 'aphex-auth-tables-'));
		const url = `file:${join(directory, 'aphex.db')}`;
		try {
			const { client } = await sqliteAdapter({ url }).connect({
				tables: aphexAuth().tables?.sqlite
			});
			const rows = await client.execute("select name from sqlite_master where name = 'user'");
			expect(rows.rows).toHaveLength(1);
			client.close();
		} finally {
			await rm(directory, { recursive: true });
		}
	});

	it('runs no migration during the build, and a missing url is not an error then', async () => {
		const { client } = await sqliteAdapter({ url: undefined }).connect({ building: true });
		const rows = await client.execute("select name from sqlite_master where name = 'user'");
		expect(rows.rows).toHaveLength(0);
		client.close();
	});

	it('s3Storage is the adapter itself, and needs no credentials until it is used', () => {
		const declared = { bucket: undefined, endpoint: undefined };
		const storage = s3Storage(declared as unknown as Parameters<typeof s3Storage>[0]);
		expect(storage.name).toBe('s3');
		expect(storage.adapter).toBe(storage);
		expect(() => storage.getSignedUploadUrl('a.png')).rejects.toThrow('are all required');
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

	it("getAphex shares one resolution per config, so scripts get the hook's instances", async () => {
		const factory = vi.fn(() => provider);
		const config = deferredConfig(descriptor(`shared-${crypto.randomUUID()}`), factory);

		const [script, hook] = await Promise.all([getAphex(config), resolveCMSConfig(config)]);

		expect(factory).toHaveBeenCalledTimes(1);
		expect(hook).toBe(script.config);
		expect(script.database?.drizzleDb).toBe(drizzleDb);
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

	it('lets a prerendered page through without auth or reading the query string', async () => {
		vi.doMock('$app/environment', () => ({
			building: true,
			dev: false,
			browser: false,
			version: ''
		}));
		const requireSession = vi.spyOn(provider, 'requireSession');
		try {
			const config = deferredConfig(descriptor(`prerender-${crypto.randomUUID()}`), () => provider);
			const handle = createCMSHook(config);
			__notifyAphexConfigChanged(config);

			const event = request('/admin');
			// What SvelteKit does during prerender.
			Object.defineProperty(event.url, 'searchParams', {
				get: () => {
					throw new Error('Cannot access url.searchParams on a page with prerendering enabled');
				}
			});
			const response = await handle({ event, resolve });

			expect(await response.text()).toBe('ok');
			expect(event.locals.previewPerspective).toBe('published');
			expect(requireSession).not.toHaveBeenCalled();
		} finally {
			vi.doUnmock('$app/environment');
			requireSession.mockRestore();
		}
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
