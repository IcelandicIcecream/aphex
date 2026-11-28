import { describe, expect, it } from 'vitest';
import { Hono } from 'hono';
import { createAdminLoad } from '@aphexcms/cms-core/server/pages/admin';
import { organizationsByIdRouter } from '@aphexcms/cms-core/server/api/routes/organizations-by-id';
import type { AphexEnv } from '@aphexcms/cms-core/server/api/index';

/**
 * A super admin switches an organization's features in God Mode, where the config can
 * store them (`organizationCapabilities.set`). Nobody else can: an organization's own
 * owner could otherwise give it a paid feature.
 */

const ORG = '11111111-1111-4111-8111-111111111111';

function featureStore(initial: Record<string, string[]> = {}) {
	const rows = new Map(Object.entries(initial));
	return {
		rows,
		config: {
			ids: ['site.shop', 'site.bookings'],
			labels: { 'site.shop': { title: 'Shop', description: 'Sell products' } },
			resolve: ({ organizationId }: { organizationId: string }) => rows.get(organizationId) ?? [],
			set: ({ organizationId, ids }: { organizationId: string; ids: string[] }) => {
				rows.set(organizationId, ids);
			}
		}
	};
}

const session = (role: string) => ({
	type: 'session',
	user: { id: 'user-1', email: 'sam@example.com', name: 'Sam', role },
	session: { id: 's', expiresAt: new Date(Date.now() + 60_000) },
	organizationId: ORG,
	organizationRole: 'owner',
	capabilities: ['*']
});

function cms(organizationCapabilities: unknown) {
	return {
		config: { organizationCapabilities },
		databaseAdapter: {
			findOrganizationById: async (id: string) =>
				id === ORG ? { id: ORG, name: 'Acme', slug: 'acme' } : null,
			findAllOrganizations: async () => [{ id: ORG, name: 'Acme', slug: 'acme' }],
			findOrganizationMembers: async () => [],
			getInstanceSettings: async () => ({ allowUserOrgCreation: false }),
			findUserOrganizations: async () => [],
			findUserProfileById: async () => null,
			findInvitationsByEmail: async () => []
		},
		cmsEngine: { listDocumentTypes: async () => [] },
		auth: { getUserById: async () => null },
		aiProvider: null
	};
}

function put(aphexCMS: unknown, auth: unknown, capabilities: unknown, orgId = ORG) {
	const app = new Hono<AphexEnv>();
	app.use('*', async (c, next) => {
		c.set('auth', auth as never);
		c.set('aphexCMS', aphexCMS as never);
		await next();
	});
	app.route('/organizations', organizationsByIdRouter);
	return app.fetch(
		new Request(`http://localhost/organizations/${orgId}/capabilities`, {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ capabilities })
		})
	);
}

describe('PUT /organizations/:id/capabilities', () => {
	it('saves for a super admin and answers with what the organization now has', async () => {
		const store = featureStore();
		const res = await put(cms(store.config), session('super_admin'), ['site.shop', 'site.shop']);
		expect(res.status).toBe(200);
		expect(await res.json()).toEqual({ success: true, data: { capabilities: ['site.shop'] } });
		expect(store.rows.get(ORG)).toEqual(['site.shop']);
	});

	it("refuses anyone else, including the organization's own owner", async () => {
		const store = featureStore();
		expect((await put(cms(store.config), session('user'), ['site.shop'])).status).toBe(403);
		expect((await put(cms(store.config), null, ['site.shop'])).status).toBe(401);
		expect(store.rows.size).toBe(0);
	});

	it('refuses an undeclared capability, naming it', async () => {
		const store = featureStore();
		const res = await put(cms(store.config), session('super_admin'), ['site.shop', 'site.shopp']);
		expect(res.status).toBe(400);
		expect((await res.json()).message).toContain('site.shopp');
		expect(store.rows.size).toBe(0);
	});

	it('is not there when the config cannot store them, or for an unknown organization', async () => {
		const { set: _set, ...readOnly } = featureStore().config;
		expect((await put(cms(readOnly), session('super_admin'), [])).status).toBe(404);
		expect((await put(cms(undefined), session('super_admin'), [])).status).toBe(404);
		const store = featureStore();
		const res = await put(cms(store.config), session('super_admin'), [], 'missing');
		expect(res.status).toBe(404);
	});
});

describe('God Mode features', () => {
	const load = createAdminLoad();
	const event = (aphexCMS: unknown) =>
		({
			locals: { aphexAuth: session('super_admin'), aphexCMS },
			params: { path: 'god-mode/organizations' },
			url: new URL('http://localhost/admin/god-mode/organizations'),
			request: new Request('http://localhost/')
		}) as never;

	it('lists each declared feature, labelled, and what each organization has', async () => {
		const store = featureStore({ [ORG]: ['site.bookings'] });
		const data = await load(event(cms(store.config)));
		expect(data).toMatchObject({
			features: {
				available: [
					{ id: 'site.shop', title: 'Shop', description: 'Sell products' },
					{ id: 'site.bookings', title: 'site.bookings' }
				],
				granted: { [ORG]: ['site.bookings'] }
			}
		});
	});

	it('shows no switches when something else decides the features', async () => {
		const { set: _set, ...readOnly } = featureStore().config;
		expect(await load(event(cms(readOnly)))).toMatchObject({ features: null });
	});
});
