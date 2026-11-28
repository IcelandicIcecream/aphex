// What the Redirects screen and the AI's tools do, with the same checks for both.
import type { DatabaseAdapter } from '@aphexcms/cms-core/server';
import { normalizePath, normalizeTarget, MAX_PATH_LENGTH } from './paths';
import { findRedirect, isLive, listRedirects, recordMove, type Redirect } from './store';

type Storage = DatabaseAdapter;

export type AddResult =
	| { ok: true; redirects: Redirect[] }
	| { ok: false; error: string; field: 'from' | 'to' };

/** Adds a redirect from `fromInput` (a path, or a whole link from an old site) to `toInput`. */
export async function addRedirect(
	db: Storage,
	organizationId: string,
	fromInput: string,
	toInput: string
): Promise<AddResult> {
	const from = normalizePath(fromInput);
	const to = normalizeTarget(toInput);
	if (!from) {
		return {
			ok: false,
			field: 'from',
			error: `Enter the old address, like /about-us or a full link to it (at most ${MAX_PATH_LENGTH} characters).`
		};
	}
	if (!to)
		return {
			ok: false,
			field: 'to',
			error: 'Enter where it goes: a path like /about, or a full https:// link.'
		};
	if (from === to) return { ok: false, field: 'to', error: 'That sends the address to itself.' };
	if (await isLive(db, organizationId, from)) {
		return {
			ok: false,
			field: 'from',
			error: `Something on your site is at ${from}, so a redirect from it would never be used.`
		};
	}
	// To an old address: straight to where that goes now, in one hop. Unless it comes
	// back here, which would go round in circles.
	const external = /^https?:/.test(to);
	const onward =
		external || (await isLive(db, organizationId, to))
			? null
			: await findRedirect(db, organizationId, to, { count: false });
	if (onward === from) {
		return {
			ok: false,
			field: 'to',
			error: `${to} already redirects to ${from}, so this would go round in circles.`
		};
	}
	await recordMove(db, organizationId, from, onward ?? to, { source: 'manual' });
	return { ok: true, redirects: await listRedirects(db, organizationId) };
}
