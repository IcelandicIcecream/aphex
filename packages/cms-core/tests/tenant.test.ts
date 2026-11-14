/**
 * Multi-tenancy: a host's hook names the organization a URL belongs to
 * (`locals.aphexTenant`), and Aphex's hook moves every principal there for that
 * request. These pin the parts that would leak or lock people out if they drifted:
 * a non-member never acts in the tenant, a key never crosses organizations, the
 * session row is never rewritten (two tabs, two tenants), and organization
 * capabilities can't be granted by a role or bypassed by an admin.
 */
import { describe, it, expect, vi } from 'vitest';
import { isHttpError, isRedirect, type RequestEvent } from '@sveltejs/kit';
import { handleAuthHook } from '../src/lib/auth/auth-hooks';
import { resolveTenant } from '../src/lib/auth/tenant';
import { createPartResolver } from '../src/lib/plugins/resolver';
import { POST as mcpPost } from '../src/lib/routes/mcp';
import type { Auth, SessionAuth, ApiKeyAuth } from '../src/lib/types/auth';
import type { Organization } from '../src/lib/types/organization';
import type { OrganizationCapabilities } from '../src/lib/types/config';

const user = { id: 'u1', email: 'ana@example.com', name: 'Ana', role: 'user' };

function org(id: string, slug: string, metadata: Organization['metadata'] = null): Organization {
	const now = new Date();
	return {
		id,
		name: slug.toUpperCase(),
		slug,
		parentOrganizationId: null,
		metadata,
		createdBy: 'u0',
		createdAt: now,
		updatedAt: now
	};
}

const acme = org('org_acme', 'acme', {
	logo: '/logo.png',
	theme: { primaryColor: '#f00', fontFamily: '', logoUrl: '' }
});
const globex = org('org_globex', 'globex');

/** Ana's session last switched to Globex. She's a member of both unless `memberOf` says otherwise. */
function session(organizationId = globex.id): SessionAuth {
	return {
		type: 'session',
		user,
		session: { id: 's1', expiresAt: new Date(Date.now() + 60_000) },
		organizationId,
		organizationRole: 'editor'
	};
}

function apiKey(organizationId: string): ApiKeyAuth {
	return { type: 'api_key', keyId: 'k1', name: 'ci', permissions: ['read'], organizationId };
}

interface Setup {
	auth?: SessionAuth | null;
	key?: ApiKeyAuth | null;
	memberOf?: string[];
	organizationCapabilities?: OrganizationCapabilities;
	roleCapabilities?: string[];
}

function setup({
	auth = session(),
	key = null,
	memberOf = [acme.id, globex.id],
	organizationCapabilities,
	roleCapabilities = ['document.read']
}: Setup = {}) {
	const updateUserSession = vi.fn();
	const db = {
		findOrganizationBySlug: async (slug: string) =>
			[acme, globex].find((candidate) => candidate.slug === slug) ?? null,
		findUserMembership: async (userId: string, organizationId: string) =>
			memberOf.includes(organizationId)
				? { userId, organizationId, role: organizationId === acme.id ? 'admin' : 'editor' }
				: null,
		updateUserSession
	};
	const provider = {
		requireSession: async () => {
			if (!auth) throw new Error('no session');
			return structuredClone(auth);
		},
		getSession: async () => (auth ? structuredClone(auth) : null),
		validateApiKey: async () => (key ? structuredClone(key) : null)
	};
	const rolesService = {
		getCapabilities: vi.fn(async () => [...roleCapabilities])
	};
	const config = { auth: { loginUrl: '/admin/login' }, organizationCapabilities };

	async function request(url: string, tenant: string | null, headers: Record<string, string> = {}) {
		const event = {
			url: new URL(url),
			request: new Request(url, { headers }),
			locals: { aphexTenant: tenant } as App.Locals
		} as unknown as RequestEvent;
		const resolved = await resolveTenant(event, db as never);
		let response: Response | null = null;
		let thrown: unknown = null;
		try {
			response = await handleAuthHook(
				event,
				config as never,
				provider as never,
				db as never,
				rolesService as never,
				resolved
			);
		} catch (error) {
			thrown = error;
		}
		return {
			response,
			thrown,
			locals: event.locals,
			auth: event.locals.aphexAuth as Auth | undefined
		};
	}

	return { request, rolesService, updateUserSession };
}

describe('a tenant URL', () => {
	it('changes nothing when the host names no tenant', async () => {
		const { request } = setup();
		const { auth, locals } = await request('http://localhost/admin', null);
		expect(auth).toMatchObject({ type: 'session', organizationId: globex.id });
		expect(locals.aphexTenantOrganization).toBeNull();
	});

	it("puts a member in the tenant's organization, with their role there", async () => {
		const { request, rolesService } = setup();
		const { auth, locals } = await request('http://acme.localhost/admin', 'acme');
		expect(auth).toMatchObject({
			type: 'session',
			organizationId: acme.id,
			organizationRole: 'admin'
		});
		expect(rolesService.getCapabilities).toHaveBeenCalledWith(acme.id, 'admin');
		expect(locals.aphexTenantOrganization?.id).toBe(acme.id);
	});

	it('never rewrites the session, so two tabs on two tenants each keep theirs', async () => {
		const { request, updateUserSession } = setup();
		const [first, second] = await Promise.all([
			request('http://acme.localhost/api/documents', 'acme'),
			request('http://globex.localhost/api/documents', 'globex')
		]);
		expect(first.auth).toMatchObject({ organizationId: acme.id });
		expect(second.auth).toMatchObject({ organizationId: globex.id });
		expect(updateUserSession).not.toHaveBeenCalled();
	});

	it('sends a signed-in non-member from the admin to the invitations page', async () => {
		const { request } = setup({ memberOf: [globex.id] });
		const { thrown } = await request('http://acme.localhost/admin', 'acme');
		expect(isRedirect(thrown) && thrown.location).toBe('/admin/invitations');
	});

	it('leaves a non-member identified but without an organization, on any page', async () => {
		const { request } = setup({ memberOf: [globex.id] });
		for (const path of ['/admin/invitations', '/api/documents', '/media/a/b.png', '/pricing']) {
			const { auth } = await request(`http://acme.localhost${path}`, 'acme');
			expect(auth?.type).toBe('partial_session');
		}
	});

	it("refuses an API key for another organization, and accepts the tenant's own", async () => {
		const other = setup({ auth: null, key: apiKey(globex.id) });
		const refused = await other.request('http://acme.localhost/api/documents', 'acme', {
			'x-api-key': 'secret'
		});
		expect(refused.response?.status).toBe(403);

		const own = setup({ auth: null, key: apiKey(acme.id) });
		const accepted = await own.request('http://acme.localhost/api/documents', 'acme', {
			'x-api-key': 'secret'
		});
		expect(accepted.response).toBeNull();
		expect(accepted.auth).toMatchObject({ type: 'api_key', organizationId: acme.id });
	});

	it("doesn't serve a key for another organization's media either", async () => {
		const { request } = setup({ auth: null, key: apiKey(globex.id) });
		const { auth } = await request('http://acme.localhost/media/a/b.png', 'acme', {
			'x-api-key': 'secret'
		});
		expect(auth).toBeUndefined();
	});

	it('answers 404 for a slug no organization has, and signs no one in on its pages', async () => {
		const { request } = setup();
		const admin = await request('http://nope.localhost/admin', 'nope');
		expect(admin.response?.status).toBe(404);
		const api = await request('http://nope.localhost/api/documents', 'nope');
		expect(api.response?.status).toBe(404);
		const page = await request('http://nope.localhost/pricing', 'nope');
		expect(page.response).toBeNull();
		expect(page.auth).toBeUndefined();
		expect(page.locals.aphexTenantOrganization).toBeNull();
	});
});

describe("a tenant's MCP endpoint", () => {
	// `/mcp` sits outside `/api` and checks its own key, so the auth hook's tenant
	// check never reaches it. An assistant connected to two clients must not edit
	// one through the other's address.
	async function mcp(tenant: string | null, organization: Organization | null, key: ApiKeyAuth) {
		const host = tenant ? `${tenant}.localhost` : 'localhost';
		const request = new Request(`http://${host}/mcp`, {
			method: 'POST',
			headers: { 'x-api-key': 'secret', 'content-type': 'application/json' },
			body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' })
		});
		const locals = {
			aphexTenant: tenant,
			aphexTenantOrganization: organization,
			aphexCMS: {
				config: { auth: { provider: { validateApiKey: async () => key } } },
				databaseAdapter: {}
			}
		};
		return mcpPost({ request, locals } as never);
	}

	it("refuses a key for another organization on the tenant's address", async () => {
		const response = await mcp('acme', acme, apiKey(globex.id));
		expect(response.status).toBe(403);
		expect(await response.json()).toEqual({ error: "This API key isn't for ACME" });
	});

	it('answers 404 for a slug no organization has', async () => {
		const response = await mcp('nope', null, apiKey(acme.id));
		expect(response.status).toBe(404);
	});

	it("lets the tenant's own key through, and any key with no tenant", async () => {
		for (const response of [
			await mcp('acme', acme, apiKey(acme.id)),
			await mcp(null, null, apiKey(globex.id))
		]) {
			expect([401, 403, 404]).not.toContain(response.status);
		}
	});
});

describe('organization capabilities', () => {
	const pro: OrganizationCapabilities = {
		ids: ['billing.reports', 'billing.recurring'],
		resolve: ({ organizationId }) => (organizationId === acme.id ? ['billing.reports'] : [])
	};

	it('grants what the organization has, to sessions and keys alike', async () => {
		const { request } = setup({ organizationCapabilities: pro });
		const { auth } = await request('http://acme.localhost/admin', 'acme');
		expect(auth?.type === 'session' && auth.capabilities).toEqual(
			expect.arrayContaining(['document.read', 'billing.reports'])
		);

		const keyed = setup({ auth: null, key: apiKey(acme.id), organizationCapabilities: pro });
		const { auth: keyAuth } = await keyed.request('http://acme.localhost/api/documents', 'acme', {
			'x-api-key': 'secret'
		});
		expect(keyAuth?.type === 'api_key' && keyAuth.capabilities).toContain('billing.reports');
	});

	it("can't be granted by a role, which the organization's own admins edit", async () => {
		const { request } = setup({
			organizationCapabilities: pro,
			roleCapabilities: ['document.read', 'billing.recurring']
		});
		const { auth } = await request('http://acme.localhost/admin', 'acme');
		expect(auth?.type === 'session' && auth.capabilities).not.toContain('billing.recurring');
	});

	it('grants none when the resolver throws, and ignores ids it never declared', async () => {
		const failing = setup({
			organizationCapabilities: {
				ids: ['billing.reports'],
				resolve: () => {
					throw new Error('billing is down');
				}
			}
		});
		const down = await failing.request('http://acme.localhost/admin', 'acme');
		expect(down.auth?.type === 'session' && down.auth.capabilities).toEqual(['document.read']);

		const sloppy = setup({
			organizationCapabilities: { ids: ['billing.reports'], resolve: () => ['god.mode'] }
		});
		const ignored = await sloppy.request('http://acme.localhost/admin', 'acme');
		expect(ignored.auth?.type === 'session' && ignored.auth.capabilities).not.toContain('god.mode');
	});

	it("aren't bypassed by an admin's override in the studio", () => {
		const resolver = createPartResolver([
			{
				id: 'billing',
				parts: [
					{
						implements: 'aphex/admin/tool',
						id: 'reports',
						title: 'Reports',
						component: (() => {}) as never,
						requiredCapabilities: ['billing.reports']
					},
					{
						implements: 'aphex/admin/tool',
						id: 'audit',
						title: 'Audit',
						component: (() => {}) as never,
						requiredCapabilities: ['audit.read']
					}
				]
			}
		]);
		const tools = resolver.adminTools({
			capabilities: [],
			overrideAccess: true,
			organizationOnly: pro.ids
		});
		expect(tools.map((tool) => tool.id)).toEqual(['audit']);
	});
});

it('is not an error for site pages that read the tenant without signing anyone in', async () => {
	const { request } = setup({ auth: null });
	const { response, thrown, locals } = await request('http://acme.localhost/pricing', 'acme');
	expect(response).toBeNull();
	expect(isHttpError(thrown)).toBe(false);
	expect(locals.aphexTenantOrganization?.name).toBe('ACME');
});

describe("a tenant's sign-in page", () => {
	async function login(
		loginBranding?: (ctx: { organization: Organization | null }) => object | null
	) {
		const { createAdminLoad } = await import('../src/lib/server/pages/admin');
		const locals = {
			aphexTenantOrganization: acme,
			aphexCMS: {
				databaseAdapter: {},
				authFeatures: undefined,
				config: { auth: { loginUrl: '/admin/login', loginBranding } }
			}
		} as unknown as App.Locals;
		const data = await createAdminLoad()({
			locals,
			params: { path: 'login' },
			url: new URL('http://acme.localhost/admin/login'),
			request: new Request('http://acme.localhost/admin/login')
		});
		if (data.view !== 'login') throw new Error(`expected the login view, got ${data.view}`);
		return data;
	}

	it("shows the tenant's name, logo and colour with no loginBranding", async () => {
		const data = await login();
		expect(data.organization).toEqual({ name: 'ACME', slug: 'acme' });
		expect(data.branding).toEqual({
			title: 'ACME',
			tagline: 'Sign in to ACME',
			logoUrl: '/logo.png',
			accentColor: '#f00'
		});
	});

	it('hands loginBranding the tenant, so it has nothing to look up', async () => {
		const data = await login(({ organization }) => ({ title: `Welcome to ${organization?.name}` }));
		expect(data.branding).toEqual({ title: 'Welcome to ACME' });
	});
});
