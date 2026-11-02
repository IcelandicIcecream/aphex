import { Hono } from 'hono';
import { cmsLogger } from '../../../utils/logger';
import { getOrganizationTeam } from '../../queries/organization-team';
import type { AphexEnv } from '../index';

/**
 * `GET /organizations/team` — the members settings page in one round-trip:
 * members with their user profile, pending invitations (with the accept link
 * for callers who can invite), the invitable roles, and whether email is
 * configured. Exists so the page can be a cms-core component rather than an
 * app-owned `+page.server.ts`, which every scaffold would otherwise have to
 * patch by hand to pick up improvements.
 *
 * Mounted before the `/:id` router — `team` must not be read as an org id.
 */
export const organizationsTeamRouter: Hono<AphexEnv> = new Hono<AphexEnv>().get(
	'/team',
	async (c) => {
		try {
			const auth = c.var.auth;

			if (!auth || auth.type !== 'session') {
				return c.json(
					{
						success: false,
						error: 'Unauthorized',
						message: 'Session authentication required'
					},
					401
				);
			}

			const origin = new URL(c.req.url).origin;
			const team = await getOrganizationTeam(c.var.aphexCMS, auth, origin);

			return c.json({ success: true, data: team });
		} catch (error) {
			cmsLogger.error('Failed to fetch organization team:', error);
			return c.json(
				{
					success: false,
					error: 'Failed to fetch team',
					message: error instanceof Error ? error.message : 'Unknown error'
				},
				500
			);
		}
	}
);
