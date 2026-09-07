import { json, error } from '@sveltejs/kit';
import { createHash, timingSafeEqual } from 'node:crypto';
import { dev } from '$app/environment';
import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';
import { systemContext } from '@aphexcms/cms-core/local-api/auth-helpers';
import type { CollectionAPI, LocalAPIContext } from '@aphexcms/cms-core/server';
import { seedContent } from '$lib/server/seed';

/**
 * `POST /api/seed` — wipe the seeded content and create it again.
 *
 * The first-run seed in `hooks.server.ts` only fires on a completely untouched
 * site, which is right for a real install and useless while you're building the
 * template: the moment one page exists it never runs again. This is the manual
 * trigger — Payload's website template has the same thing behind a "Seed your
 * database" button on the admin dashboard.
 *
 * **It deletes every page, post, category, form and form submission in the
 * organization**, then writes the demo content again. That's the point — re-running an additive seed would
 * pile up duplicates — and it is why it is guarded by an operator secret rather
 * than by a user session:
 *
 *  - In development it's open, so `curl -X POST localhost:5173/api/seed` works.
 *  - Anywhere else it requires `SEED_SECRET` to be set, and the request to carry
 *    it as `Authorization: Bearer <secret>`. With the variable unset the route
 *    404s, so it is not a live surface on a default deploy.
 *
 * A session check is deliberately *not* what guards this. The handler runs under
 * `systemContext` against `findAllOrganizations()[0]`, so it bypasses RBAC and
 * ignores which organization the caller belongs to: gating on "is anyone signed
 * in" would have let any authenticated user of any organization destroy the
 * content of a different one. A route that bypasses permissions cannot be
 * guarded by something weaker than the permissions it bypasses — hence a
 * deployment-level credential, held by whoever operates the site.
 *
 *     SEED_SECRET=$(openssl rand -hex 32)
 *     curl -X POST https://example.com/api/seed -H "Authorization: Bearer $SEED_SECRET"
 *
 * Delete this route along with `src/lib/server/seed/` once you have your own
 * content. Nothing else imports it.
 */
export const POST: RequestHandler = async ({ locals, request }) => {
	const { aphexCMS } = locals;

	if (!dev && !isAuthorized(request)) {
		// Not 403: whether this endpoint exists at all depends on a secret being
		// configured, and that's not worth confirming to an unauthenticated caller.
		throw error(404, 'Not found');
	}

	const [org] = await aphexCMS.databaseAdapter.findAllOrganizations();
	if (!org) throw error(409, 'No organization yet — sign up first.');

	const context = systemContext(org.id);
	const { localAPI } = aphexCMS;
	const { collections } = localAPI;

	/*
	 * Order matters: a document is deleted before anything it points at, so
	 * nothing is briefly referencing a row that no longer exists. Pages reference
	 * posts and forms; posts reference categories; submissions reference forms.
	 *
	 * Singletons are left alone — there's exactly one row each and `seedContent`
	 * overwrites them.
	 *
	 * Forms and submissions are cleared with everything else, and must be: the
	 * seed creates a form every time it runs, so leaving them behind meant a
	 * second re-seed produced two identical "Contact" forms, a third produced
	 * three, and the contact page pointed at whichever was newest. They're reached
	 * by name because `@aphexcms/plugin-forms` contributes them, so they aren't in
	 * the generated `collections` map — and `clearByName` no-ops when the plugin
	 * isn't installed.
	 */
	const deleted =
		(await clear(collections.page, context)) +
		(await clear(collections.post, context)) +
		(await clear(collections.category, context)) +
		// Submissions before forms: a submission holds a reference to its form.
		(await clearByName(localAPI, 'formSubmission', context)) +
		(await clearByName(localAPI, 'form', context));

	try {
		const created = await seedContent(aphexCMS, context);
		return json({ ok: true, deleted, created });
	} catch (cause) {
		// Surface the real reason in the response body rather than only in the
		// server log. A seed fails almost exclusively on field validation, and the
		// message names the field — which is the entire diagnosis. Safe to return
		// verbatim: this handler is unreachable outside `dev`.
		const message = cause instanceof Error ? cause.message : String(cause);
		console.error('[seed] Failed:', cause);
		return json({ ok: false, deleted, error: message }, { status: 500 });
	}
};

/**
 * Does the request carry the operator secret?
 *
 * Read through `$env/dynamic/private` rather than the static import so the same
 * build can be deployed with or without the variable set — a static import would
 * bake "unset" in at build time.
 *
 * The comparison is constant-time. A `===` on a secret leaks its prefix through
 * response timing, which is a slow but real way to recover a token one byte at a
 * time; hashing both sides to a fixed width first keeps `timingSafeEqual` from
 * throwing on a length mismatch and stops the length itself leaking.
 */
function isAuthorized(request: Request): boolean {
	const secret = env.SEED_SECRET;
	if (!secret) return false;

	const header = request.headers.get('authorization') ?? '';
	const match = header.match(/^Bearer\s+(.+)$/i);
	if (!match) return false;

	const digest = (value: string) => createHash('sha256').update(value).digest();
	return timingSafeEqual(digest(match[1]!), digest(secret));
}

/**
 * Delete every document in a plugin-contributed collection, by name.
 *
 * Returns 0 when the collection isn't registered, so removing a plugin doesn't
 * break the seed route.
 */
async function clearByName(
	localAPI: App.Locals['aphexCMS']['localAPI'],
	name: string,
	context: LocalAPIContext
): Promise<number> {
	const collection = localAPI.getCollection<{ id: string }>(name);
	return collection ? clear(collection, context) : 0;
}

/** Delete every document in a collection. Returns how many went. */
async function clear<T extends { id: string }>(
	collection: CollectionAPI<T>,
	context: LocalAPIContext
): Promise<number> {
	// `perspective: 'draft'` so unpublished documents are found too — a published
	// filter would leave drafts behind and the next seed would collide with them.
	const { docs } = await collection.find(context, { limit: 500, perspective: 'draft' });
	for (const doc of docs) await collection.delete(context, doc.id);
	return docs.length;
}
