import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { cmsLogger } from '../../../utils/logger';
import { hasCapability } from '../../../types/capabilities';
import { savePluginSettingsRequest } from '../../../api/schemas/plugin-settings';
import type { AphexEnv } from '../index';
import type { Context } from 'hono';
import type { Auth } from '../../../types/auth';

/**
 * Plugin settings router — the config plane's HTTP surface.
 *
 *   GET  /api/plugin-settings            → every declared plugin's values for the org
 *   PUT  /api/plugin-settings/:pluginId  → save a patch for one plugin
 *
 * Both are gated by `plugin.settings.manage` and scoped to the session's org (never
 * client input — the multi-tenancy wall). Field *declarations* are read client-side
 * from the plugin registry (the two-plane split); this endpoint only moves *values*.
 *
 * Phase 1 returns plaintext values. Phase 2 masks `secret` fields on read and
 * decrypts-on-write here, so a secret value never crosses to the browser.
 */

type SessionAuth = Extract<Auth, { type: 'session' }>;

/**
 * Require a session with `plugin.settings.manage`. Returns the narrowed session auth
 * to proceed, or a 401/403 Response to short-circuit — so callers get a typed org id
 * without a non-null assertion.
 */
function requireManage(c: Context<AphexEnv>): SessionAuth | Response {
	const auth = c.var.auth;
	if (!auth || auth.type !== 'session') {
		return c.json(
			{ success: false, error: 'Unauthorized', message: 'Session authentication required' },
			401
		);
	}
	if (!hasCapability(auth, 'plugin.settings.manage')) {
		return c.json(
			{
				success: false,
				error: 'Forbidden',
				message: 'The plugin.settings.manage capability is required'
			},
			403
		);
	}
	return auth;
}

/**
 * Does this session satisfy a settings section's own `requiredCapabilities`?
 *
 * `plugin.settings.manage` is the floor, checked by `requireManage`. A declaration may
 * additionally name narrower capabilities to gate itself more tightly — the part's
 * documented contract, and the same convention `hooks.ts` applies to plugin routes and
 * `resolver.ts` applies to actions and tools. Without this the declared gate was
 * silently ignored, so anyone who could manage settings could overwrite every plugin's
 * secrets regardless of what the plugin asked for.
 */
function canAccessSettings(auth: SessionAuth, required: string[] | undefined): boolean {
	if (!required || required.length === 0) return true;
	return required.every((capability) => hasCapability(auth, capability));
}

export const pluginSettingsRouter: Hono<AphexEnv> = new Hono<AphexEnv>()
	.get('/', async (c) => {
		try {
			const auth = requireManage(c);
			if (auth instanceof Response) return auth;
			const { pluginSettingsService, partResolver } = c.var.aphexCMS;

			// One entry per plugin that declared settings AND that this session is
			// allowed to see, with the org's effective values. `getMasked` — never
			// `get` — so secret plaintext never reaches the client (secrets come back
			// as a mask placeholder).
			const declarations = partResolver
				.settingsDeclarations()
				.filter((decl) => canAccessSettings(auth, decl.requiredCapabilities));
			const secretsEnabled = pluginSettingsService.secretsEnabled;
			const data = await Promise.all(
				declarations.map(async (decl) => ({
					pluginId: decl.pluginId,
					title: decl.title,
					values: await pluginSettingsService.getMasked(auth.organizationId, decl.pluginId)
				}))
			);
			return c.json({ success: true, data, secretsEnabled });
		} catch (error) {
			cmsLogger.error('Failed to list plugin settings:', error);
			return c.json({ success: false, error: 'Internal error' }, 500);
		}
	})
	.put('/:pluginId', zValidator('json', savePluginSettingsRequest), async (c) => {
		try {
			const auth = requireManage(c);
			if (auth instanceof Response) return auth;
			const { pluginSettingsService, partResolver } = c.var.aphexCMS;
			const pluginId = c.req.param('pluginId');

			// Reject plugins that never declared settings — nothing to write to.
			const declaration = partResolver.settingsDeclaration(pluginId);
			if (!declaration) {
				return c.json(
					{
						success: false,
						error: 'Unknown plugin settings',
						message: `Plugin "${pluginId}" has not declared any settings.`
					},
					404
				);
			}

			// Honour the declaration's own gate. GET only ever returns masked secrets,
			// so the exposure this closes is write: without it, anyone holding
			// `plugin.settings.manage` could overwrite the secrets of a plugin that
			// asked for a narrower capability.
			if (!canAccessSettings(auth, declaration.requiredCapabilities)) {
				return c.json(
					{
						success: false,
						error: 'Forbidden',
						message: `Plugin "${pluginId}" requires: ${declaration.requiredCapabilities?.join(', ')}`
					},
					403
				);
			}

			const { values } = c.req.valid('json');
			const saved = await pluginSettingsService.save(auth.organizationId, pluginId, values);
			return c.json({ success: true, data: { pluginId, values: saved } });
		} catch (error) {
			cmsLogger.error('Failed to save plugin settings:', error);
			return c.json({ success: false, error: 'Internal error' }, 500);
		}
	});
