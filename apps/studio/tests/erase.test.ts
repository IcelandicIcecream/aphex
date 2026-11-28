/**
 * Deleting a workspace and deleting an account, end to end against a real auth instance
 * and database: nothing personal is left, and what can't go is refused untouched.
 *
 * Run: pnpm -F @aphexcms/studio test erase
 */
import { describe, expect, it, vi } from 'vitest';
import { Hono } from 'hono';
import { createAphexAuth } from '@aphexcms/auth';
import {
	eraseAccount,
	eraseOrganization,
	isDeletionBlocked,
	type EraseServices
} from '@aphexcms/cms-core/server';
import { instanceUsersRouter } from '@aphexcms/cms-core/server/api/routes/instance-users';
import { organizationsByIdRouter } from '@aphexcms/cms-core/server/api/routes/organizations-by-id';
import type { AphexEnv } from '@aphexcms/cms-core/server/api/index';
import { db, drizzleDb, dbDialect } from './helpers/db';

const ORIGIN = 'http://localhost:5173';
const { auth, provider } = createAphexAuth({
	database: db,
	drizzleDb,
	dialect: dbDialect,
	secret: 'erase-test-secret-at-least-32-characters!',
	baseURL: ORIGIN,
	options: { inviteOnly: false, allowAccountDeletion: true },
	oauth: { enabled: true }
});

const stored = new Set<string>();
let storageDown = false;
const services: EraseServices & { auth: typeof provider } = {
	databaseAdapter: db,
	auth: provider,
	assetService: {
		findAssets: (org, filters) => db.findAssets(org, filters),
		deleteAsset: async (org, id) => {
			if (storageDown) throw new Error('storage is down');
			stored.delete(id);
			return db.deleteAsset(org, id);
		}
	},
	config: {}
};
provider.onAccountDelete?.((user) => eraseAccount(services, user));

let n = 0;
const PASSWORD = 'correct horse battery';
async function signUp() {
	const email = `erase-${Date.now()}-${n++}@example.com`;
	const response = await auth.handler(
		new Request(`${ORIGIN}/api/auth/sign-up/email`, {
			method: 'POST',
			headers: { 'content-type': 'application/json', 'x-forwarded-for': `10.1.0.${n}` },
			body: JSON.stringify({ email, password: PASSWORD, name: 'Sam' })
		})
	);
	const { user } = await response.json();
	const cookie = response.headers
		.getSetCookie()
		.map((value) => value.split(';')[0])
		.join('; ');
	if (!(await db.findUserProfileById(user.id))) {
		await db.createUserProfile({ userId: user.id, role: 'editor' });
	}
	return { id: String(user.id), email, cookie };
}

async function workspace(ownerId: string) {
	const org = await db.createOrganization({
		name: 'Doomed',
		slug: `erase-${Date.now()}-${n++}`,
		createdBy: ownerId
	});
	await db.seedBuiltinRoles(org.id);
	await db.addMember({ organizationId: org.id, userId: ownerId, role: 'owner' });
	return org;
}

async function asset(organizationId: string, createdBy: string, system = false) {
	const row = await db.createAsset({
		organizationId,
		assetType: 'image',
		filename: 'a.png',
		originalFilename: 'a.png',
		mimeType: 'image/png',
		size: 1,
		url: '/media/a',
		path: 'a',
		storageAdapter: 'local',
		metadata: system ? { system: true } : {},
		createdBy
	});
	stored.add(row.id);
	return row;
}

const deleteSelf = (cookie: string, password = PASSWORD) =>
	auth.handler(
		new Request(`${ORIGIN}/api/auth/delete-user`, {
			method: 'POST',
			headers: { 'content-type': 'application/json', origin: ORIGIN, cookie },
			body: JSON.stringify({ password })
		})
	);

function asUser(user: { id: string; role: string }) {
	const app = new Hono<AphexEnv>();
	app.use('*', async (c, next) => {
		c.set('aphexCMS', services as never);
		c.set('auth', { type: 'session', user } as never);
		await next();
	});
	app.route('/organizations', organizationsByIdRouter);
	app.route('/users', instanceUsersRouter);
	return (path: string, body?: unknown) =>
		app.request(path, {
			method: 'DELETE',
			headers: { 'content-type': 'application/json' },
			body: body ? JSON.stringify(body) : undefined
		});
}

describe('deleting a workspace', () => {
	it('takes hidden files, keys, sessions of people who are not members, and everyone’s membership', async () => {
		const owner = await signUp();
		const visitor = await signUp();
		const org = await workspace(owner.id);
		const other = await workspace(owner.id);
		const picture = await asset(org.id, owner.id, true);
		await provider.changeUserImage?.(owner.id, `/media/${picture.id}/a.png`);
		await asset(org.id, owner.id);
		await db.updateUserSession(visitor.id, org.id);
		const key = { name: 'k', permissions: ['read' as const] };
		const gone = await provider.createApiKey!(owner.id, org.id, key);
		const kept = await provider.createApiKey!(owner.id, other.id, key);

		const after = vi.fn();
		services.config = { beforeOrganizationDelete: async () => after };
		await eraseOrganization(services, { organizationId: org.id, actorId: owner.id });
		services.config = {};

		expect(after).toHaveBeenCalledOnce();
		expect(await db.findOrganizationById(org.id)).toBeNull();
		expect(await db.findOrganizationMembers(org.id)).toHaveLength(0);
		expect(await db.findUserSession(visitor.id)).toBeNull();
		expect(stored.size).toBe(0);
		expect((await provider.getUserById(owner.id))?.image).toBeUndefined();
		const keys = (await provider.listApiKeys!(owner.id)).map((row) => row.id);
		expect(keys).toContain(kept.id);
		expect(keys).not.toContain(gone.id);
	});

	it('keeps it whole when a file or the app’s own cleanup fails', async () => {
		const owner = await signUp();
		const org = await workspace(owner.id);
		await asset(org.id, owner.id);
		const call = asUser({ id: owner.id, role: 'editor' });

		storageDown = true;
		expect((await call(`/organizations/${org.id}`)).status).toBe(409);
		storageDown = false;
		services.config = {
			beforeOrganizationDelete: () => {
				throw new Error('Stripe said no');
			}
		};
		const refused = await call(`/organizations/${org.id}`);
		services.config = {};
		expect(refused.status).toBe(409);
		expect((await refused.json()).message).toBe('Stripe said no');
		expect(await db.findOrganizationMembers(org.id)).toHaveLength(1);

		expect((await call(`/organizations/${org.id}`)).status).toBe(200);
	});

	it('is for its owner or a super admin', async () => {
		const owner = await signUp();
		const org = await workspace(owner.id);
		expect((await asUser({ id: 'x', role: 'admin' })(`/organizations/${org.id}`)).status).toBe(403);
		expect(
			(await asUser({ id: 'x', role: 'super_admin' })(`/organizations/${org.id}`)).status
		).toBe(200);
	});
});

describe('deleting an account', () => {
	it('takes their own workspaces, memberships, profile, keys and invitations', async () => {
		const owner = await signUp();
		const leaver = await signUp();
		const shared = await workspace(owner.id);
		const own = await workspace(leaver.id);
		await asset(own.id, leaver.id);
		await db.addMember({ organizationId: shared.id, userId: leaver.id, role: 'editor' });
		await db.updateUserSession(leaver.id, shared.id);
		await db.createInvitation({
			organizationId: shared.id,
			email: leaver.email,
			role: 'editor',
			token: `t-${leaver.id}`,
			invitedBy: owner.id,
			expiresAt: new Date(Date.now() + 60_000)
		});
		await provider.createApiKey!(leaver.id, shared.id, { name: 'k', permissions: ['read'] });

		expect((await deleteSelf(leaver.cookie, 'wrong password here')).status).toBe(400);
		expect(await db.findOrganizationById(own.id)).not.toBeNull();

		expect((await deleteSelf(leaver.cookie)).status).toBe(200);
		expect(await provider.getUserById(leaver.id)).toBeNull();
		expect(await db.findUserProfileById(leaver.id)).toBeNull();
		expect(await db.findUserSession(leaver.id)).toBeNull();
		expect(await db.findOrganizationById(own.id)).toBeNull();
		expect(await db.findInvitationsByEmail(leaver.email)).toHaveLength(0);
		expect(await provider.listApiKeys!(leaver.id)).toHaveLength(0);
		const members = await db.findOrganizationMembers(shared.id);
		expect(members.map((member) => member.userId)).toEqual([owner.id]);
		const events = await db.listEvents({ organizationId: shared.id });
		expect(JSON.stringify(events)).toContain('user.deleted');
		expect(JSON.stringify(events)).not.toContain(leaver.email);

		// Their cookie is still good for a minute; it must not write the profile back.
		const request = new Request(`${ORIGIN}/admin`, { headers: { cookie: leaver.cookie } });
		expect(await provider.getSession(request, db)).toBeNull();
		expect(await db.findUserProfileById(leaver.id)).toBeNull();
	});

	it('refuses to strand a workspace others use', async () => {
		const owner = await signUp();
		const member = await signUp();
		const org = await workspace(owner.id);
		await db.addMember({ organizationId: org.id, userId: member.id, role: 'editor' });
		expect((await deleteSelf(owner.cookie)).status).toBe(400);
		expect(await provider.getUserById(owner.id)).not.toBeNull();
		const error = await eraseAccount(services, owner).catch((e: unknown) => e);
		expect(isDeletionBlocked(error)).toBe(true);
	});

	it('by a super admin: their address typed out, never themselves or another super admin', async () => {
		const admin = await signUp();
		const peer = await signUp();
		const target = await signUp();
		await db.deleteUserProfile(peer.id);
		await db.createUserProfile({ userId: peer.id, role: 'super_admin' });
		const call = asUser({ id: admin.id, role: 'super_admin' });
		const asEditor = asUser({ id: admin.id, role: 'editor' });

		const { email } = target;
		expect((await asEditor(`/users/${target.id}`, { email })).status).toBe(403);
		expect((await call(`/users/${target.id}`, { email: 'other@example.com' })).status).toBe(400);
		expect((await call(`/users/${admin.id}`, { email: admin.email })).status).toBe(400);
		expect((await call(`/users/${peer.id}`, { email: peer.email })).status).toBe(403);
		expect((await provider.listUsers!({ search: email, limit: 5, offset: 0 })).total).toBe(1);
		expect((await provider.listUsers!({ search: '%', limit: 5, offset: 0 })).total).toBe(0);

		expect((await call(`/users/${target.id}`, { email })).status).toBe(200);
		expect(await provider.getUserById(target.id)).toBeNull();
		expect(await db.findUserProfileById(target.id)).toBeNull();
	});
});
