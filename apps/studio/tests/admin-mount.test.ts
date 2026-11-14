import { describe, expect, it, vi } from 'vitest';
import { Hono } from 'hono';
import { serveCoreRoute } from '@aphexcms/cms-core/server/core-routes';
import { createAdminLoad } from '@aphexcms/cms-core/server/pages/admin';
import { apiKeysRouter } from '@aphexcms/cms-core/server/api/routes/api-keys';
import { instanceSettingsRouter } from '@aphexcms/cms-core/server/api/routes/instance-settings';
import { organizationsRouter } from '@aphexcms/cms-core/server/api/routes/organizations';
import type { AphexEnv } from '@aphexcms/cms-core/server/api/index';

/**
 * What lets a host mount Aphex with one catch-all: the hook answers `/api` and `/media`
 * without taking anything from the host's own routes, and the page load carries the
 * sidebar's data.
 */

const session = (role = 'editor', capabilities: string[] = []) => ({
	type: 'session',
	user: { id: 'user-1', email: 'sam@example.com', name: 'Sam', role },
	session: { id: 's', expiresAt: new Date(Date.now() + 60_000) },
	organizationId: 'org-1',
	organizationRole: 'owner',
	capabilities
});

function coreEvent(path: string, routeId: string | null, aphexCMS: unknown, method = 'GET') {
	const url = new URL(`http://localhost${path}`);
	return {
		url,
		route: { id: routeId },
		request: new Request(url, { method }),
		locals: { aphexCMS, aphexAuth: null },
		getClientAddress: () => {
			throw new Error('unknowable');
		}
	} as never;
}

describe('serveCoreRoute', () => {
	const fetch = vi.fn(async () => new Response('from aphex'));
	const aphexCMS = { apiApp: { fetch } };

	it('answers /api when no host route matched, even with no client address', async () => {
		const response = await serveCoreRoute(coreEvent('/api/documents', null, aphexCMS));
		expect(await response?.text()).toBe('from aphex');
		expect(fetch.mock.lastCall?.at(1)).toMatchObject({ clientAddress: undefined, auth: null });
	});

	it('leaves a route the host defined alone', async () => {
		expect(await serveCoreRoute(coreEvent('/api/orders', '/api/orders', aphexCMS))).toBeNull();
		expect(
			await serveCoreRoute(coreEvent('/media/a/b.png', '/media/[...rest]', aphexCMS))
		).toBeNull();
	});

	it('leaves everything else to SvelteKit', async () => {
		for (const path of ['/apiary', '/media', '/media/only-id', '/media/a/b/c', '/about']) {
			expect(await serveCoreRoute(coreEvent(path, null, aphexCMS)), path).toBeNull();
		}
		expect(await serveCoreRoute(coreEvent('/media/a/b.png', null, aphexCMS, 'POST'))).toBeNull();
	});
});

describe('createAdminLoad', () => {
	function loadEvent(path: string, auth: unknown, favicon?: unknown) {
		const databaseAdapter = {
			findUserOrganizations: async () => [
				{
					organization: { id: 'org-1', name: 'Acme', slug: 'acme', metadata: null },
					member: { role: 'owner' }
				}
			],
			findAllOrganizations: async () => [{ id: 'org-2', name: 'Other', slug: 'other' }],
			findOrganizationMembers: async () => [{ role: 'owner', userId: 'user-9' }],
			getInstanceSettings: async () => ({ allowUserOrgCreation: true }),
			findUserProfileById: async () => null,
			findInvitationsByEmail: async () => []
		};
		return {
			locals: {
				aphexAuth: auth,
				aphexCMS: {
					databaseAdapter,
					cmsEngine: { listDocumentTypes: async () => [] },
					auth: { getUserById: async () => ({ email: 'owner@example.com' }) },
					aiProvider: null,
					config: { customization: { branding: { title: 'Acme', favicon } } }
				}
			},
			params: { path },
			url: new URL(`http://localhost/admin/${path}`),
			request: new Request('http://localhost/')
		} as never;
	}
	const load = createAdminLoad();

	it('carries what the sidebar needs', async () => {
		const data = await load(loadEvent('', session('editor', ['asset.read'])));
		expect(data.view).toBe('studio');
		expect(data.shell?.organizations).toHaveLength(1);
		expect(data.shell?.activeOrganization?.slug).toBe('acme');
		expect(data.shell?.canCreateOrganization).toBe(true);
		expect(data.shell?.agentEnabled).toBe(false);
		// No `organizationCapabilities` resolver is configured, so the organization has none.
		expect(data.rbac).toEqual({
			role: 'owner',
			capabilities: ['asset.read'],
			organizationCapabilities: []
		});
	});

	it('has no sidebar for a full-page view', async () => {
		const data = await load(loadEvent('invitations', session()));
		expect(data.standalone).toBe(true);
		expect(data.shell).toBeNull();
		expect(data.rbac).toBeUndefined();
	});

	it('takes the favicon as a URL or a function, and survives one that throws', async () => {
		const faviconOf = async (favicon: unknown) =>
			(await load(loadEvent('', session(), favicon))).shell?.faviconUrl;
		expect(await faviconOf(undefined)).toBeNull();
		expect(await faviconOf('/icon.png')).toBe('/icon.png');
		expect(await faviconOf(async () => '/org.png')).toBe('/org.png');
		await expect(
			faviconOf(() => {
				throw new Error('no settings row');
			})
		).resolves.toBeNull();
	});

	it('serves the organizations view', async () => {
		const data = await load(loadEvent('organizations', session()));
		expect(data).toMatchObject({
			view: 'organizations',
			organizations: [{ slug: 'acme', isActive: true, ownerEmail: 'owner@example.com' }]
		});
	});

	it('only lets a super admin into God Mode', async () => {
		await expect(load(loadEvent('god-mode', session()))).rejects.toMatchObject({
			status: 302,
			location: '/admin'
		});
		const data = await load(loadEvent('god-mode/organizations', session('super_admin')));
		expect(data).toMatchObject({
			view: 'god-mode',
			tab: 'organizations',
			allowUserOrgCreation: true,
			organizations: [{ slug: 'other', memberCount: 1 }]
		});
	});
});

function api(router: Hono<AphexEnv>, auth: unknown, aphexCMS: unknown) {
	const app = new Hono<AphexEnv>();
	app.use('*', async (c, next) => {
		c.set('auth', auth as never);
		c.set('aphexCMS', aphexCMS as never);
		await next();
	});
	app.route('/', router);
	return app;
}

const jsonRequest = (method: string, body: unknown) => ({
	method,
	headers: { 'Content-Type': 'application/json' },
	body: JSON.stringify(body)
});

describe('/settings/api-keys', () => {
	const manager = session('editor', ['apiKey.manage']);
	const provider = (overrides = {}) => ({
		auth: {
			listApiKeys: async () => [{ id: 'k1' }],
			createApiKey: vi.fn(async () => ({ id: 'k2', key: 'secret' })),
			deleteApiKey: vi.fn(async () => true),
			...overrides
		}
	});

	it('needs a session and the capability', async () => {
		const create = jsonRequest('POST', { name: 'CI', permissions: ['read'] });
		expect((await api(apiKeysRouter, null, provider()).request('/')).status).toBe(401);
		expect(
			(await api(apiKeysRouter, { type: 'api_key' }, provider()).request('/', create)).status
		).toBe(401);
		const cms = provider();
		expect((await api(apiKeysRouter, session(), cms).request('/', create)).status).toBe(403);
		expect(
			(await api(apiKeysRouter, session(), cms).request('/k1', { method: 'DELETE' })).status
		).toBe(403);
		expect(cms.auth.createApiKey).not.toHaveBeenCalled();
		expect(cms.auth.deleteApiKey).not.toHaveBeenCalled();
	});

	it('creates a key for the active organization, and validates the body', async () => {
		const cms = provider();
		const app = api(apiKeysRouter, manager, cms);
		expect((await app.request('/', jsonRequest('POST', { name: '' }))).status).toBe(400);
		const response = await app.request(
			'/',
			jsonRequest('POST', { name: 'CI', permissions: ['read'] })
		);
		expect(response.status).toBe(200);
		expect((await response.json()).data.apiKey.key).toBe('secret');
		expect(cms.auth.createApiKey.mock.lastCall?.slice(0, 2)).toEqual(['user-1', 'org-1']);
	});

	it('says so when the auth provider has no API keys', async () => {
		const app = api(apiKeysRouter, manager, provider({ createApiKey: undefined }));
		expect(
			(await app.request('/', jsonRequest('POST', { name: 'CI', permissions: ['read'] }))).status
		).toBe(501);
	});

	it('reports a half-finished revocation, whichever copy of the class threw it', async () => {
		const incomplete = Object.assign(new Error('flush the auth cache'), {
			code: 'API_KEY_REVOCATION_INCOMPLETE'
		});
		const app = api(
			apiKeysRouter,
			manager,
			provider({ deleteApiKey: async () => Promise.reject(incomplete) })
		);
		const response = await app.request('/k1', { method: 'DELETE' });
		expect(response.status).toBe(500);
		expect(await response.json()).toMatchObject({
			error: 'Revocation incomplete',
			message: 'flush the auth cache'
		});
	});
});

describe('/instance-settings', () => {
	const cms = () => ({
		databaseAdapter: {
			getInstanceSettings: async () => ({ allowUserOrgCreation: false }),
			updateInstanceSettings: vi.fn(async (data: object) => data)
		}
	});
	const patch = jsonRequest('PATCH', { allowUserOrgCreation: true });

	it('only lets a super admin change it', async () => {
		const database = cms();
		const response = await api(instanceSettingsRouter, session(), database).request('/', patch);
		expect(response.status).toBe(403);
		expect(database.databaseAdapter.updateInstanceSettings).not.toHaveBeenCalled();
		expect((await api(instanceSettingsRouter, null, cms()).request('/')).status).toBe(401);
	});

	it('saves it for a super admin', async () => {
		const response = await api(instanceSettingsRouter, session('super_admin'), cms()).request(
			'/',
			patch
		);
		expect(response.status).toBe(200);
		expect((await response.json()).data.allowUserOrgCreation).toBe(true);
	});
});

describe('POST /organizations', () => {
	const noOrg = {
		type: 'partial_session',
		user: { id: 'user-1', email: 'sam@example.com', name: 'Sam', role: 'editor' },
		session: { id: 's', expiresAt: new Date(Date.now() + 60_000) }
	};
	const create = (extra = {}) => jsonRequest('POST', { name: 'New', slug: 'new', ...extra });

	function fakeCms(allowUserOrgCreation: boolean, roleInParent: string | null = null) {
		return {
			cmsEngine: { ownerCapabilities: () => [] },
			rolesService: {
				getCapabilities: async (_org: string, role: string) =>
					role === 'admin' ? ['org.settings'] : ['document.read']
			},
			databaseAdapter: {
				getInstanceSettings: async () => ({ allowUserOrgCreation }),
				findOrganizationBySlug: async () => null,
				findOrganizationById: async (id: string) => ({ id }),
				findUserMembership: async () => (roleInParent ? { role: roleInParent } : null),
				createOrganization: vi.fn(async (data: object) => ({ id: 'new-org', ...data })),
				seedBuiltinRoles: vi.fn(async () => undefined),
				addMember: vi.fn(async () => undefined),
				updateUserSession: vi.fn(async () => undefined)
			}
		};
	}
	const parentOf = (cms: ReturnType<typeof fakeCms>) =>
		cms.databaseAdapter.createOrganization.mock.lastCall?.at(0);

	it('is closed to ordinary users unless the instance allows it', async () => {
		const cms = fakeCms(false);
		const response = await api(organizationsRouter, session(), cms).request('/', create());
		expect(response.status).toBe(403);
		expect(cms.databaseAdapter.createOrganization).not.toHaveBeenCalled();
	});

	it('lets a user with no organization create their first, and makes them its owner', async () => {
		const cms = fakeCms(true);
		const response = await api(organizationsRouter, noOrg, cms).request('/', create());
		expect(response.status).toBe(201);
		expect(parentOf(cms)).toMatchObject({ parentOrganizationId: null, createdBy: 'user-1' });
		expect(cms.databaseAdapter.addMember).toHaveBeenCalledWith({
			organizationId: 'new-org',
			userId: 'user-1',
			role: 'owner'
		});
		expect(cms.databaseAdapter.updateUserSession).toHaveBeenCalledWith('user-1', 'new-org');
	});

	it("doesn't put a user's new organization under the one they happen to be in", async () => {
		const cms = fakeCms(true);
		await api(organizationsRouter, session(), cms).request('/', create());
		expect(parentOf(cms)).toMatchObject({ parentOrganizationId: null });
	});

	it('only adds a child organization under one the user administers', async () => {
		const child = create({ parentOrganizationId: 'org-1' });
		for (const role of [null, 'viewer']) {
			const cms = fakeCms(true, role);
			const response = await api(organizationsRouter, session(), cms).request('/', child);
			expect(response.status, String(role)).toBe(403);
			expect(cms.databaseAdapter.createOrganization).not.toHaveBeenCalled();
		}
		const cms = fakeCms(true, 'admin');
		const response = await api(organizationsRouter, session(), cms).request('/', child);
		expect(response.status).toBe(201);
		expect(parentOf(cms)).toMatchObject({ parentOrganizationId: 'org-1' });
	});

	// The dialog sends no parent when "Create inside" is unticked, so a default parent made
	// that box do nothing for super admins.
	it('lets a super admin create with the setting off, top-level unless a parent is named', async () => {
		const cms = fakeCms(false);
		const response = await api(organizationsRouter, session('super_admin'), cms).request(
			'/',
			create()
		);
		expect(response.status).toBe(201);
		expect(parentOf(cms)).toMatchObject({ parentOrganizationId: null });
	});

	it('refuses an API key', async () => {
		const response = await api(organizationsRouter, { type: 'api_key' }, fakeCms(true)).request(
			'/',
			create()
		);
		expect(response.status).toBe(401);
	});
});
