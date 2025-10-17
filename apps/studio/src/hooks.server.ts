import { redirect } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import type { Handle } from '@sveltejs/kit';
import { svelteKitHandler } from 'better-auth/svelte-kit';
import { building } from '$app/environment';
import { createCMSHook } from '@aphex/cms-core/server';
import cmsConfig from '../aphex.config.js';
import { auth } from '$lib/server/auth';

// Better Auth hook (handles /api/auth/* routes)
const authHook: Handle = async ({ event, resolve }) => {
	return svelteKitHandler({ event, resolve, auth, building });
};

// CMS hook for dependency injection and route protection
// Database provider is registered in aphex.config.ts
const aphexHook = createCMSHook(cmsConfig);

// Invitation processing hook - auto-joins users with pending invitations
const invitationHook: Handle = async ({ event, resolve }) => {
	const session = await auth.api.getSession({ headers: event.request.headers });
	const db = event.locals.aphexCMS?.databaseAdapter;

	// Only process if we have a session and database access
	if (session?.user?.email && db) {
		try {
			// Check if user has organizations
			const userOrgs = await db.findUserOrganizations(session.user.id);

			// Only process invitations if user has NO organizations
			if (userOrgs.length === 0) {
				const invitations = await db.findInvitationsByEmail(session.user.email);
				const pendingInvitations = invitations.filter(
					(inv) => !inv.acceptedAt && inv.expiresAt > new Date()
				);

				if (pendingInvitations.length > 0) {
					console.log(`[Invitation Hook]: Processing ${pendingInvitations.length} pending invitations for ${session.user.email}`);

					// Accept each invitation
					for (const invitation of pendingInvitations) {
						await db.acceptInvitation(invitation.token, session.user.id);
					}

					// Set first org as active
					await db.updateUserSession(session.user.id, pendingInvitations[0].organizationId);
					console.log(`[Invitation Hook]: User auto-joined ${pendingInvitations.length} organization(s)`);
				}
			}
		} catch (error) {
			console.error('[Invitation Hook]: Error processing invitations:', error);
		}
	}

	return resolve(event);
};

const routingHook: Handle = async ({ event, resolve }) => {
	if (event.url.pathname === '/') {
		throw redirect(302, '/admin');
	}
	return resolve(event);
};

// Combine hooks - authHook must be first, then CMS for DB access, then invitation processing
export const handle = sequence(authHook, aphexHook, invitationHook, routingHook);
