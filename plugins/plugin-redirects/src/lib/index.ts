/**
 * First-party redirects plugin, as WordPress keeps old slugs and Payload's
 * plugin-redirects keeps a list: an address that changed keeps working.
 *
 * `redirectsPlugin({ addresses, sections })` contributes:
 *
 *  - a consumer that, when a published document's address changes, makes the old
 *    one redirect to the new (`aphex/event/consumer`). Chains collapse (A → B, then
 *    B → C makes A → C) and a move back removes the redirect it would loop on.
 *  - sections: an address prefix a document owns, such as a blog whose address is
 *    a setting. When it moves, everything under it redirects, posts included.
 *  - the Redirects screen, to see them all and add your own for a site you're
 *    moving from (`aphex/admin/tool`), and its API (`aphex/server/route`)
 *  - tools for the site's AI to list, add and remove them (`aphex/agent/tool`)
 *
 * Everything is kept in plugin storage (`cms_plugin_storage`): no tables, no
 * migration, each organization's own. Following a redirect is the host's: call
 * `findRedirect` when a path finds nothing (a 404), and send the visitor on.
 *
 * ```ts
 * redirectsPlugin({
 *   addresses: {
 *     page: (doc) => (doc.slug === 'home' ? '/' : `/${doc.slug}`),
 *     post: (doc, { sections }) => `${sections.blog}/${doc.slug}`
 *   },
 *   sections: { blog: { type: 'siteSettings', path: (doc) => `/${doc.blogPath || 'blog'}`, initial: '/blog' } }
 * })
 * ```
 */
import { definePlugin, documentPublished } from '@aphexcms/cms-core';
import type { PluginPart } from '@aphexcms/cms-core';
import type { Auth, DatabaseAdapter } from '@aphexcms/cms-core/server';
import { Signpost } from '@lucide/svelte';
import { z } from 'zod';
import RedirectsTool from './RedirectsTool.svelte';
import { addRedirect } from './service';
import {
	deleteRedirect,
	listRedirects,
	moveAddresses,
	noteAddress,
	PLUGIN_ID,
	recordMove,
	sectionPath
} from './store';

type Doc = Record<string, unknown>;

export interface RedirectsSection {
	/** The document type that holds its address (usually a singleton). */
	type: string;
	/** Its address from that document's published data, like `/news`. */
	path: (doc: Doc) => string | null | undefined;
	/** Where it was before anyone changed it. */
	initial: string;
}

export interface RedirectsPluginOptions {
	/**
	 * Where each type's published documents are served, by type name. A type not
	 * listed gets no automatic redirects. `sections` has each section's address now.
	 */
	addresses: Record<
		string,
		(doc: Doc, context: { sections: Record<string, string> }) => string | null | undefined
	>;
	/** Address prefixes a document owns, by a name of your choosing (`blog`). */
	sections?: Record<string, RedirectsSection>;
	/** The sidebar group the Redirects screen sits in. Default: the Tools group. */
	group?: string;
	/** Its order in that group. */
	order?: number;
}

function organizationOf(auth: Auth | null): string | null {
	const id = (auth as { organizationId?: unknown } | null)?.organizationId;
	return typeof id === 'string' && id ? id : null;
}

function published(doc: { publishedData?: unknown } | null | undefined): Doc | null {
	const data = doc?.publishedData;
	return data && typeof data === 'object' ? (data as Doc) : null;
}

/** After a publish: did a section or the document move? Then the old address redirects. */
async function onPublished(
	options: RedirectsPluginOptions,
	db: DatabaseAdapter,
	organizationId: string,
	documentId: string,
	documentType: string
) {
	const sections = Object.entries(options.sections ?? {});
	const address = options.addresses[documentType];
	if (!address && !sections.some(([, section]) => section.type === documentType)) return;
	const doc = published(await db.findByDocIdAdvanced(organizationId, documentId));
	if (!doc) return;

	const current: Record<string, string> = {};
	for (const [name, section] of sections) {
		const before = await sectionPath(db, organizationId, name, section.initial);
		current[name] = before;
		if (section.type !== documentType) continue;
		const now = section.path(doc) || section.initial;
		current[name] = now;
		await noteAddress(db, organizationId, `s:${name}`, now);
		if (now !== before) {
			await recordMove(db, organizationId, before, now, { prefix: true });
			await moveAddresses(db, organizationId, before, now);
		}
	}

	const path = address?.(doc, { sections: current });
	if (!path) return;
	const before = await noteAddress(db, organizationId, documentId, path);
	if (before && before !== path) await recordMove(db, organizationId, before, path);
}

export function redirectsPlugin(options: RedirectsPluginOptions) {
	const parts: PluginPart[] = [
		{
			implements: 'aphex/event/consumer',
			id: 'redirects.address-changed',
			events: [documentPublished.type],
			async handler({ event, databaseAdapter }) {
				const { documentId, documentType } = documentPublished.parse(event.payload);
				await onPublished(options, databaseAdapter, event.organizationId, documentId, documentType);
			}
		},
		{
			implements: 'aphex/admin/tool',
			id: 'redirects',
			title: 'Redirects',
			icon: Signpost,
			component: RedirectsTool,
			placement: 'sidebar',
			requiredCapabilities: ['document.read'],
			...(options.group ? { group: options.group } : {}),
			...(options.order !== undefined ? { order: options.order } : {})
		},
		{
			implements: 'aphex/server/route',
			id: 'redirects.list',
			method: 'GET',
			path: '/redirects',
			requiredCapabilities: ['document.read'],
			handler: async (c) => {
				const organizationId = organizationOf(c.var.auth);
				if (!organizationId) return c.json({ error: 'Sign in to see redirects.' }, 401);
				return c.json({
					redirects: await listRedirects(c.var.aphexCMS.databaseAdapter, organizationId)
				});
			}
		},
		{
			implements: 'aphex/server/route',
			id: 'redirects.add',
			method: 'POST',
			path: '/redirects',
			requiredCapabilities: ['document.update'],
			handler: async (c) => {
				const organizationId = organizationOf(c.var.auth);
				if (!organizationId) return c.json({ error: 'Sign in to change redirects.' }, 401);
				const body = (await c.req.json().catch(() => null)) as {
					from?: unknown;
					to?: unknown;
				} | null;
				const result = await addRedirect(
					c.var.aphexCMS.databaseAdapter,
					organizationId,
					typeof body?.from === 'string' ? body.from : '',
					typeof body?.to === 'string' ? body.to : ''
				);
				return result.ok
					? c.json({ redirects: result.redirects })
					: c.json({ error: result.error, field: result.field }, 400);
			}
		},
		{
			implements: 'aphex/server/route',
			id: 'redirects.remove',
			method: 'DELETE',
			path: '/redirects',
			requiredCapabilities: ['document.update'],
			handler: async (c) => {
				const organizationId = organizationOf(c.var.auth);
				if (!organizationId) return c.json({ error: 'Sign in to change redirects.' }, 401);
				const body = (await c.req.json().catch(() => null)) as { id?: unknown } | null;
				if (typeof body?.id !== 'string') return c.json({ error: 'Which redirect?' }, 400);
				const db = c.var.aphexCMS.databaseAdapter;
				await deleteRedirect(db, organizationId, body.id);
				return c.json({ redirects: await listRedirects(db, organizationId) });
			}
		},
		{
			implements: 'aphex/agent/instructions',
			id: 'redirects',
			title: 'Redirects',
			requiredCapabilities: ['document.read'],
			text: [
				'When a page or post gets a new address, its old address redirects by itself: no need to add one.',
				'When the owner is moving from another site, add a redirect for each of its old addresses that has a new home (add_redirect), so links and search results keep working. Ask for the old addresses rather than guessing them.'
			].join(' ')
		},
		{
			implements: 'aphex/agent/tool',
			definition: {
				name: 'list_redirects',
				description: 'The site’s redirects: old addresses and where each now leads.',
				mutates: false,
				requiredCapabilities: ['document.read'],
				execution: 'server',
				inputSchema: z.object({})
			},
			execute: async (_input, { aphexCMS, context }) => ({
				success: true,
				data: (await listRedirects(aphexCMS.databaseAdapter, context.organizationId)).map(
					({ id, from, to, prefix, source, hits }) => ({
						id,
						from,
						to,
						includesEverythingUnder: prefix,
						source,
						hits
					})
				)
			})
		},
		{
			implements: 'aphex/agent/tool',
			definition: {
				name: 'add_redirect',
				description:
					'Send an old address to a new one: `from` is a path (/about-us.html) or a full link from an old site, `to` a path on this site or a full https:// link. Takes effect at once, for addresses nothing on the site answers.',
				mutates: true,
				requiredCapabilities: ['document.update'],
				execution: 'server',
				inputSchema: z.object({ from: z.string().min(1), to: z.string().min(1) })
			},
			execute: async (input, { aphexCMS, context }) => {
				const { from, to } = input as { from: string; to: string };
				const result = await addRedirect(
					aphexCMS.databaseAdapter,
					context.organizationId,
					from,
					to
				);
				return result.ok
					? { success: true, data: { redirects: result.redirects.length } }
					: { success: false, error: result.error };
			}
		},
		{
			implements: 'aphex/agent/tool',
			definition: {
				name: 'remove_redirect',
				description: 'Remove a redirect by its id (from list_redirects).',
				mutates: true,
				requiredCapabilities: ['document.update'],
				execution: 'server',
				inputSchema: z.object({ id: z.string().min(1) })
			},
			execute: async (input, { aphexCMS, context }) => {
				const removed = await deleteRedirect(
					aphexCMS.databaseAdapter,
					context.organizationId,
					(input as { id: string }).id
				);
				return removed ? { success: true } : { success: false, error: 'No redirect has that id.' };
			}
		}
	];

	return definePlugin({ name: PLUGIN_ID, version: '0.1.0', parts });
}

export { findRedirect, isLive, listRedirects, recordMove, PLUGIN_ID } from './store';
export type { Redirect } from './store';
export { addRedirect } from './service';
export { normalizePath, normalizeTarget, matchRedirect, ancestors, MAX_PATH_LENGTH } from './paths';
export type { RedirectRule } from './paths';
