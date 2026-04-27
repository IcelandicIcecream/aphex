import { describe, it, expect } from 'vitest';
import { Hono } from 'hono';
import { organizationsRouter } from '@aphexcms/cms-core/server/api/routes/organizations';
import { organizationsByIdRouter } from '@aphexcms/cms-core/server/api/routes/organizations-by-id';
import { organizationsInvitationsRouter } from '@aphexcms/cms-core/server/api/routes/organizations-invitations';
import { organizationsMembersRouter } from '@aphexcms/cms-core/server/api/routes/organizations-members';
import { organizationsSwitchRouter } from '@aphexcms/cms-core/server/api/routes/organizations-switch';
import { rolesRouter } from '@aphexcms/cms-core/server/api/routes/roles';
import { userPreferencesRouter } from '@aphexcms/cms-core/server/api/routes/user-preferences';
import type { AphexEnv } from '@aphexcms/cms-core/server/api/index';

/**
 * Phase 4 gate — organizations / roles / user-preferences routers.
 *
 * Each is exercised in isolation with a hand-rolled fake CMS. The HTTP
 * surface (status codes + envelope) must stay byte-identical to the
 * legacy SvelteKit handlers so deleted shims are invisible to clients.
 */

// ---------- Mock builders ----------

const TEST_ORG = 'org-1';
const TEST_USER = 'user-1';

function buildFakeCMS(opts: {
	memberships?: { orgId: string; role: string }[];
	orgs?: { id: string; name: string; slug: string; metadata?: any }[];
	roles?: { name: string; capabilities: string[] }[];
	members?: { userId: string; role: string }[];
	invitations?: { id: string; email: string; role: string; acceptedAt: Date | null }[];
	userPrefs?: Record<string, any>;
	usersByEmail?: Record<string, { id: string }>;
} = {}) {
	const memberships = opts.memberships ?? [{ orgId: TEST_ORG, role: 'owner' }];
	const orgs = opts.orgs ?? [
		{ id: TEST_ORG, name: 'Test Org', slug: 'test', metadata: null }
	];
	const roles = opts.roles ?? [
		{ name: 'owner', capabilities: ['*'] },
		{ name: 'admin', capabilities: ['member.invite', 'member.remove', 'role.manage'] }
	];
	const members = opts.members ?? [{ userId: TEST_USER, role: 'owner' }];
	const invitations = opts.invitations ?? [];
	let userPrefs = opts.userPrefs ?? {};
	let userSession: { activeOrganizationId: string } | null = { activeOrganizationId: TEST_ORG };

	return {
		databaseAdapter: {
			findUserOrganizations: async (_uid: string) =>
				memberships.map((m) => ({
					organization: orgs.find((o) => o.id === m.orgId)!,
					member: { role: m.role, createdAt: new Date() }
				})),
			findUserMembership: async (uid: string, orgId: string) => {
				// Caller's membership (matches TEST_USER) is from `memberships`;
				// other users' memberships are looked up via the `members` list.
				if (uid === TEST_USER) {
					const m = memberships.find((x) => x.orgId === orgId);
					return m ? { role: m.role } : null;
				}
				const member = members.find((m) => m.userId === uid);
				return member ? { role: member.role } : null;
			},
			findOrganizationById: async (id: string) => orgs.find((o) => o.id === id) ?? null,
			findOrganizationBySlug: async (slug: string) => orgs.find((o) => o.slug === slug) ?? null,
			createOrganization: async (data: any) => ({ id: 'new-org', ...data }),
			updateOrganization: async (id: string, patch: any) => {
				const o = orgs.find((x) => x.id === id);
				return o ? { ...o, ...patch } : null;
			},
			deleteOrganization: async () => true,
			seedBuiltinRoles: async () => undefined,
			addMember: async () => undefined,
			updateUserSession: async (_uid: string, orgId: string) => {
				userSession = { activeOrganizationId: orgId };
			},
			deleteUserSession: async () => {
				userSession = null;
			},
			findUserSession: async () => userSession,
			findOrganizationMembers: async (_orgId: string) => members,
			removeAllMembers: async () => undefined,
			removeAllInvitations: async () => undefined,
			removeMember: async () => true,
			updateMemberRole: async (_orgId: string, userId: string, role: string) => ({
				userId,
				role
			}),
			findRoleByName: async (_orgId: string, name: string) =>
				roles.find((r) => r.name === name) ?? null,
			createRole: async (data: any) => ({ id: 'new-role', ...data }),
			updateRole: async (_orgId: string, name: string, patch: any) => {
				const r = roles.find((x) => x.name === name);
				return r ? { ...r, ...patch } : null;
			},
			deleteRole: async (_orgId: string, name: string) => roles.some((r) => r.name === name),
			findOrganizationInvitations: async () => invitations,
			createInvitation: async (data: any) => ({ id: 'inv-new', token: 't', ...data }),
			deleteInvitation: async (id: string) => invitations.some((i) => i.id === id),
			findUserProfileById: async () => ({ preferences: userPrefs }),
			updateUserPreferences: async (_uid: string, patch: any) => {
				userPrefs = { ...userPrefs, ...patch };
			}
		},
		rolesService: {
			listRoles: async () => roles,
			invalidate: async () => undefined
		},
		auth: {
			getUserByEmail: async (email: string) =>
				opts.usersByEmail?.[email.toLowerCase()] ?? null
		}
	};
}

function buildEnv(
	cms: ReturnType<typeof buildFakeCMS>,
	authOpts: {
		role?: 'super_admin' | 'admin' | 'editor';
		organizationRole?: string;
		userId?: string;
		email?: string;
		capabilities?: string[];
		missing?: boolean;
	} = {}
) {
	if (authOpts.missing) return { aphexCMS: cms, auth: null };
	return {
		aphexCMS: cms,
		auth: {
			type: 'session',
			organizationId: TEST_ORG,
			organizationRole: authOpts.organizationRole ?? 'owner',
			capabilities: authOpts.capabilities ?? ['*'],
			user: {
				id: authOpts.userId ?? TEST_USER,
				email: authOpts.email ?? 'me@e.com',
				name: 'Me',
				role: authOpts.role ?? 'super_admin'
			}
		}
	};
}

function makeApp() {
	const app = new Hono<AphexEnv>();
	app.use('*', async (c, next) => {
		c.set('aphexCMS', c.env.aphexCMS);
		c.set('auth', c.env.auth);
		await next();
	});
	// Production order
	app.route('/organizations', organizationsSwitchRouter);
	app.route('/organizations', organizationsInvitationsRouter);
	app.route('/organizations', organizationsMembersRouter);
	app.route('/organizations', organizationsByIdRouter);
	app.route('/organizations', organizationsRouter);
	app.route('/roles', rolesRouter);
	app.route('/user', userPreferencesRouter);
	return app;
}

// ---------- /organizations ----------

describe('GET /organizations', () => {
	it('lists user orgs with isActive flag', async () => {
		const cms = buildFakeCMS();
		const res = await makeApp().fetch(
			new Request('http://localhost/organizations'),
			buildEnv(cms) as any
		);
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.success).toBe(true);
		expect(body.data[0].isActive).toBe(true);
	});

	it('401 when not session auth', async () => {
		const cms = buildFakeCMS();
		const res = await makeApp().fetch(
			new Request('http://localhost/organizations'),
			buildEnv(cms, { missing: true }) as any
		);
		expect(res.status).toBe(401);
	});
});

describe('POST /organizations', () => {
	it('403 when user is not super_admin', async () => {
		const cms = buildFakeCMS();
		const res = await makeApp().fetch(
			new Request('http://localhost/organizations', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ name: 'New', slug: 'new' })
			}),
			buildEnv(cms, { role: 'admin' }) as any
		);
		expect(res.status).toBe(403);
	});

	it('409 when slug already exists', async () => {
		const cms = buildFakeCMS();
		const res = await makeApp().fetch(
			new Request('http://localhost/organizations', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ name: 'Dup', slug: 'test' })
			}),
			buildEnv(cms) as any
		);
		expect(res.status).toBe(409);
	});

	it('201 on successful create', async () => {
		const cms = buildFakeCMS({ orgs: [] });
		const res = await makeApp().fetch(
			new Request('http://localhost/organizations', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ name: 'Brand New', slug: 'brand-new' })
			}),
			buildEnv(cms) as any
		);
		expect(res.status).toBe(201);
		const body = await res.json();
		expect(body.data.id).toBe('new-org');
	});

	it('400 with issues[] when zod fails', async () => {
		const cms = buildFakeCMS();
		const res = await makeApp().fetch(
			new Request('http://localhost/organizations', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({})
			}),
			buildEnv(cms) as any
		);
		expect(res.status).toBe(400);
		const body = await res.json();
		expect(Array.isArray(body.issues)).toBe(true);
	});
});

// ---------- /organizations/:id ----------

describe('GET /organizations/:id', () => {
	it('200 when user is a member', async () => {
		const cms = buildFakeCMS();
		const res = await makeApp().fetch(
			new Request(`http://localhost/organizations/${TEST_ORG}`),
			buildEnv(cms) as any
		);
		expect(res.status).toBe(200);
	});

	it('403 when user not a member', async () => {
		const cms = buildFakeCMS({ memberships: [] });
		const res = await makeApp().fetch(
			new Request(`http://localhost/organizations/${TEST_ORG}`),
			buildEnv(cms) as any
		);
		expect(res.status).toBe(403);
	});
});

describe('PATCH /organizations/:id', () => {
	it('403 without org.settings capability', async () => {
		const cms = buildFakeCMS();
		const res = await makeApp().fetch(
			new Request(`http://localhost/organizations/${TEST_ORG}`, {
				method: 'PATCH',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ name: 'Updated' })
			}),
			buildEnv(cms, { capabilities: [] }) as any
		);
		expect(res.status).toBe(403);
	});
});

describe('DELETE /organizations/:id', () => {
	it('403 when caller is not owner', async () => {
		const cms = buildFakeCMS({ memberships: [{ orgId: TEST_ORG, role: 'admin' }] });
		const res = await makeApp().fetch(
			new Request(`http://localhost/organizations/${TEST_ORG}`, { method: 'DELETE' }),
			buildEnv(cms) as any
		);
		expect(res.status).toBe(403);
	});
});

// ---------- /organizations/switch ----------

describe('POST /organizations/switch', () => {
	it('200 when target org membership exists', async () => {
		const cms = buildFakeCMS({
			memberships: [
				{ orgId: TEST_ORG, role: 'owner' },
				{ orgId: 'org-2', role: 'editor' }
			],
			orgs: [
				{ id: TEST_ORG, name: 'Test Org', slug: 'test' },
				{ id: 'org-2', name: 'Other', slug: 'other' }
			]
		});
		const res = await makeApp().fetch(
			new Request('http://localhost/organizations/switch', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ organizationId: 'org-2' })
			}),
			buildEnv(cms) as any
		);
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.data.organizationId).toBe('org-2');
	});

	it('403 when not a member of target', async () => {
		const cms = buildFakeCMS();
		const res = await makeApp().fetch(
			new Request('http://localhost/organizations/switch', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ organizationId: 'unknown-org' })
			}),
			buildEnv(cms) as any
		);
		expect(res.status).toBe(403);
	});

	it('does NOT collide with /organizations/:id', async () => {
		// /organizations/switch must hit switchRouter, not byId. switchRouter
		// is registered first.
		const cms = buildFakeCMS();
		const res = await makeApp().fetch(
			new Request('http://localhost/organizations/switch', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ organizationId: TEST_ORG })
			}),
			buildEnv(cms) as any
		);
		// If this fell to byIdRouter (no POST handler), Hono would 404.
		expect(res.status).toBe(200);
	});
});

// ---------- /organizations/invitations ----------

describe('POST /organizations/invitations', () => {
	it('400 when self-inviting', async () => {
		const cms = buildFakeCMS();
		const res = await makeApp().fetch(
			new Request('http://localhost/organizations/invitations', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ email: 'me@e.com', role: 'admin' })
			}),
			buildEnv(cms, { capabilities: ['member.invite'] }) as any
		);
		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.error).toBe('Invalid invitation');
	});

	it('400 when role is unknown', async () => {
		const cms = buildFakeCMS({ roles: [{ name: 'admin', capabilities: [] }] });
		const res = await makeApp().fetch(
			new Request('http://localhost/organizations/invitations', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ email: 'new@e.com', role: 'phantom' })
			}),
			buildEnv(cms, { capabilities: ['member.invite'] }) as any
		);
		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.error).toBe('Unknown role');
	});

	it('201 happy path', async () => {
		const cms = buildFakeCMS();
		const res = await makeApp().fetch(
			new Request('http://localhost/organizations/invitations', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ email: 'new@e.com', role: 'admin' })
			}),
			buildEnv(cms, { capabilities: ['member.invite'] }) as any
		);
		expect(res.status).toBe(201);
	});
});

describe('DELETE /organizations/invitations', () => {
	it('404 when invitation id not found', async () => {
		const cms = buildFakeCMS({ invitations: [] });
		const res = await makeApp().fetch(
			new Request('http://localhost/organizations/invitations', {
				method: 'DELETE',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ invitationId: 'nope' })
			}),
			buildEnv(cms, { capabilities: ['member.invite'] }) as any
		);
		expect(res.status).toBe(404);
	});
});

// ---------- /organizations/members ----------

describe('GET /organizations/members', () => {
	it('200 with members list', async () => {
		const cms = buildFakeCMS();
		const res = await makeApp().fetch(
			new Request('http://localhost/organizations/members'),
			buildEnv(cms) as any
		);
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.data).toHaveLength(1);
	});
});

describe('DELETE /organizations/members', () => {
	it('400 when removing self', async () => {
		const cms = buildFakeCMS();
		const res = await makeApp().fetch(
			new Request('http://localhost/organizations/members', {
				method: 'DELETE',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ userId: TEST_USER })
			}),
			buildEnv(cms, { capabilities: ['member.remove'] }) as any
		);
		expect(res.status).toBe(400);
	});

	it('403 when admin tries to remove owner', async () => {
		const cms = buildFakeCMS({
			memberships: [
				{ orgId: TEST_ORG, role: 'admin' }
			],
			members: [{ userId: 'other-user', role: 'owner' }]
		});
		const res = await makeApp().fetch(
			new Request('http://localhost/organizations/members', {
				method: 'DELETE',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ userId: 'other-user' })
			}),
			buildEnv(cms, {
				capabilities: ['member.remove'],
				organizationRole: 'admin'
			}) as any
		);
		expect(res.status).toBe(403);
	});
});

describe('PATCH /organizations/members', () => {
	it('400 when changing own role', async () => {
		const cms = buildFakeCMS();
		const res = await makeApp().fetch(
			new Request('http://localhost/organizations/members', {
				method: 'PATCH',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ userId: TEST_USER, role: 'admin' })
			}),
			buildEnv(cms, { capabilities: ['member.changeRole'] }) as any
		);
		expect(res.status).toBe(400);
	});
});

// ---------- /roles ----------

describe('roles router', () => {
	it('GET /roles returns roles list', async () => {
		const cms = buildFakeCMS();
		const res = await makeApp().fetch(
			new Request('http://localhost/roles'),
			buildEnv(cms) as any
		);
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.data).toHaveLength(2);
	});

	it('POST /roles 409 on built-in name collision', async () => {
		const cms = buildFakeCMS();
		const res = await makeApp().fetch(
			new Request('http://localhost/roles', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ name: 'admin', capabilities: ['member.invite'] })
			}),
			buildEnv(cms, { capabilities: ['role.manage'] }) as any
		);
		expect(res.status).toBe(409);
	});

	it('DELETE /roles/:name 403 for built-in', async () => {
		const cms = buildFakeCMS();
		const res = await makeApp().fetch(
			new Request('http://localhost/roles/admin', { method: 'DELETE' }),
			buildEnv(cms, { capabilities: ['role.manage'] }) as any
		);
		expect(res.status).toBe(403);
	});

	it('DELETE /roles/:name 409 when custom role is in use by member', async () => {
		// Use a non-builtin name (`reviewer`) so we hit the in-use check
		// rather than the built-in 403.
		const cms = buildFakeCMS({
			roles: [{ name: 'reviewer', capabilities: [] }],
			members: [{ userId: TEST_USER, role: 'reviewer' }]
		});
		const res = await makeApp().fetch(
			new Request('http://localhost/roles/reviewer', { method: 'DELETE' }),
			buildEnv(cms, { capabilities: ['role.manage'] }) as any
		);
		expect(res.status).toBe(409);
	});
});

// ---------- /user/cms-preference ----------

describe('user preferences', () => {
	it('GET /user/cms-preference returns prefs', async () => {
		const cms = buildFakeCMS({ userPrefs: { includeChildOrganizations: true } });
		const res = await makeApp().fetch(
			new Request('http://localhost/user/cms-preference'),
			buildEnv(cms) as any
		);
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.data.includeChildOrganizations).toBe(true);
	});

	it('PATCH /user/cms-preference merges and returns updated', async () => {
		// Schema is .strict() — only the documented keys are accepted.
		const cms = buildFakeCMS({ userPrefs: { includeChildOrganizations: false } });
		const res = await makeApp().fetch(
			new Request('http://localhost/user/cms-preference', {
				method: 'PATCH',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ includeChildOrganizations: true })
			}),
			buildEnv(cms) as any
		);
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.data.includeChildOrganizations).toBe(true);
	});

	it('PATCH 400 on unknown pref key (.strict)', async () => {
		const cms = buildFakeCMS();
		const res = await makeApp().fetch(
			new Request('http://localhost/user/cms-preference', {
				method: 'PATCH',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ foo: 'bar' })
			}),
			buildEnv(cms) as any
		);
		expect(res.status).toBe(400);
	});

	it('401 without session', async () => {
		const cms = buildFakeCMS();
		const res = await makeApp().fetch(
			new Request('http://localhost/user/cms-preference'),
			buildEnv(cms, { missing: true }) as any
		);
		expect(res.status).toBe(401);
	});
});
