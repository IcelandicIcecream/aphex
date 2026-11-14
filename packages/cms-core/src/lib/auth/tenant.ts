import type { RequestEvent } from '@sveltejs/kit';
import type { DatabaseAdapter } from '../db/index';
import type { Auth } from '../types/auth';
import type { Organization } from '../types/organization';

/**
 * Which organization a request's URL names, from the slug the host's own hook put
 * in `locals.aphexTenant`:
 * - `none`: the host named no tenant (the apex domain, localhost), so the session's
 *   organization applies, as it does without tenants.
 * - `unknown`: the host named a slug no organization has.
 * - `found`: the request belongs to that organization, whoever is signed in.
 */
export type Tenant =
	| { kind: 'none' }
	| { kind: 'unknown'; slug: string }
	| { kind: 'found'; organization: Organization };

/** Looks the tenant up once per request and puts the organization on `locals.aphexTenantOrganization`. */
export async function resolveTenant(event: RequestEvent, db: DatabaseAdapter): Promise<Tenant> {
	const slug = event.locals.aphexTenant;
	event.locals.aphexTenantOrganization = null;
	if (!slug) return { kind: 'none' };
	const organization = await db.findOrganizationBySlug(slug);
	if (!organization) return { kind: 'unknown', slug };
	event.locals.aphexTenantOrganization = organization;
	return { kind: 'found', organization };
}

/**
 * Moves an auth result to the tenant's organization, for this request only. The
 * session row keeps whichever organization was last switched to, so two tabs on two
 * tenants don't overwrite each other.
 *
 * - A member gets their own role in the tenant. Capabilities are left for the hook
 *   to resolve, because they belong to the role in this organization.
 * - A signed-in non-member becomes a partial session: still identified, so the
 *   invitations page can greet them, but with no organization to act in.
 * - An API key for another organization is dropped, since a key acts in one
 *   organization only.
 */
export async function scopeToTenant(
	auth: Auth | null,
	tenant: Tenant,
	db: DatabaseAdapter
): Promise<Auth | null> {
	if (!auth || tenant.kind !== 'found') return auth;
	const organizationId = tenant.organization.id;
	if (auth.type === 'api_key') return auth.organizationId === organizationId ? auth : null;
	if (auth.type === 'session' && auth.organizationId === organizationId) return auth;

	const membership = await db.findUserMembership(auth.user.id, organizationId);
	if (!membership) {
		return { type: 'partial_session', user: auth.user, session: auth.session };
	}
	return {
		type: 'session',
		user: auth.user,
		session: auth.session,
		organizationId,
		organizationRole: membership.role
	};
}
