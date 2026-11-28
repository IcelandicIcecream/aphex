import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import {
	chooseOAuthSiteRequest,
	connectedAppAllowedRequest,
	oauthConsentRequest
} from '../../../api/schemas/oauth';
import { resolveCapabilities } from '../../../types/capabilities';
import { cmsLogger } from '../../../utils/logger';
import type { AphexEnv } from '../index';

const UNAUTHORIZED = {
	success: false,
	error: 'Unauthorized',
	message: 'Session authentication required'
};
const NOT_ENABLED = {
	success: false,
	error: 'Not found',
	message: 'Connecting apps with OAuth is not enabled here.'
};

const invalid = (result: { success: boolean; error?: { issues: unknown } }, c: any) => {
	if (!result.success) {
		return c.json({ success: false, error: 'Invalid input', issues: result.error?.issues }, 400);
	}
};

/**
 * The steps of connecting an app (Claude, ChatGPT) that the admin's pages drive:
 * picking the site, then allowing or denying. Each answers with the URL the browser
 * goes to next. The auth provider checks the flow's signature, the session and the
 * membership; these routes only need a signed-in person.
 */
export const oauthRouter: Hono<AphexEnv> = new Hono<AphexEnv>()
	.post('/site', zValidator('json', chooseOAuthSiteRequest, invalid), async (c) => {
		const auth = c.var.auth;
		if (!auth || auth.type !== 'session') return c.json(UNAUTHORIZED, 401);
		const oauth = c.var.aphexCMS.auth?.oauth;
		if (!oauth) return c.json(NOT_ENABLED, 404);
		const { oauthQuery, organizationId } = c.req.valid('json');
		try {
			const next = await oauth.chooseOrganization(c.req.raw, oauthQuery, organizationId);
			return c.json({ success: true, data: next });
		} catch (error) {
			cmsLogger.warn('[OAuth]', 'Choosing a site failed:', error);
			return c.json({ success: false, error: 'Bad request', message: messageOf(error) }, 400);
		}
	})
	.post('/consent', zValidator('json', oauthConsentRequest, invalid), async (c) => {
		const auth = c.var.auth;
		if (!auth || auth.type !== 'session') return c.json(UNAUTHORIZED, 401);
		const oauth = c.var.aphexCMS.auth?.oauth;
		if (!oauth) return c.json(NOT_ENABLED, 404);
		const { oauthQuery, accept } = c.req.valid('json');
		try {
			const next = await oauth.consent(c.req.raw, oauthQuery, accept);
			return c.json({ success: true, data: next });
		} catch (error) {
			cmsLogger.warn('[OAuth]', 'Consent failed:', error);
			return c.json({ success: false, error: 'Bad request', message: messageOf(error) }, 400);
		}
	});

/** The apps the signed-in user has connected to this organization, and disconnecting one. */
export const connectedAppsRouter: Hono<AphexEnv> = new Hono<AphexEnv>()
	.get('/', async (c) => {
		const auth = c.var.auth;
		if (!auth || auth.type !== 'session') return c.json(UNAUTHORIZED, 401);
		const oauth = c.var.aphexCMS.auth?.oauth;
		if (!oauth) return c.json({ success: true, data: [] });
		const data = await oauth.listConnections(auth.user.id, auth.organizationId);
		return c.json({ success: true, data });
	})
	// Switching on what a connected app may do beyond drafts. Only what the user can do
	// themselves: an app never holds more than the person it acts for.
	.patch('/:clientId', zValidator('json', connectedAppAllowedRequest, invalid), async (c) => {
		const auth = c.var.auth;
		if (!auth || auth.type !== 'session') return c.json(UNAUTHORIZED, 401);
		const oauth = c.var.aphexCMS.auth?.oauth;
		if (!oauth) return c.json(NOT_ENABLED, 404);
		const { allowed } = c.req.valid('json');
		const held = resolveCapabilities(auth);
		const missing = allowed.filter((id) => !held.has(id));
		if (missing.length > 0) {
			return c.json(
				{
					success: false,
					error: 'Forbidden',
					message: `You can't allow what you can't do yourself: ${missing.join(', ')}.`
				},
				403
			);
		}
		const updated = await oauth.setAllowed(
			auth.user.id,
			auth.organizationId,
			c.req.param('clientId'),
			allowed
		);
		if (!updated) return c.json({ success: false, error: 'Not found' }, 404);
		cmsLogger.info(
			'[OAuth]',
			`Connected app ${c.req.param('clientId')} allowed: ${allowed.join(', ') || 'drafts only'}`
		);
		return c.json({ success: true });
	})
	.delete('/:clientId', async (c) => {
		const auth = c.var.auth;
		if (!auth || auth.type !== 'session') return c.json(UNAUTHORIZED, 401);
		const oauth = c.var.aphexCMS.auth?.oauth;
		if (!oauth) return c.json(NOT_ENABLED, 404);
		const removed = await oauth.disconnect(
			auth.user.id,
			auth.organizationId,
			c.req.param('clientId')
		);
		if (!removed) return c.json({ success: false, error: 'Not found' }, 404);
		return c.json({ success: true });
	});

/** The plugin's errors carry the reason in `body.error_description`. */
function messageOf(error: unknown): string {
	const body = (error as { body?: { error_description?: string; message?: string } })?.body;
	if (body?.error_description) return body.error_description;
	if (body?.message) return body.message;
	return error instanceof Error ? error.message : 'The connection could not continue.';
}
