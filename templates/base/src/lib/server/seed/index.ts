/**
 * First-run seed for the base template.
 *
 * `seedOnFirstRun(locals)` is wired into `hooks.server.ts`. It runs once per
 * process, and only when the site is completely untouched: the first organization
 * exists and holds zero documents of any seeded type. That makes it safe to leave
 * enabled — it can populate exactly one moment in a site's life, right after the
 * first signup, and can never stomp anything a person made.
 *
 * The base template's content model is a single example `page` type, so the seed
 * creates one welcome page. As you grow your own schemas, grow this file with
 * them (add your types to SEEDED_TYPES so their presence blocks re-seeding) —
 * or delete the directory and the seed hook if you don't want seeding at all.
 * Kill switch without deleting: set `APHEX_SEED=false`.
 */
import { env } from '$env/dynamic/private';
import { systemContext } from '@aphexcms/cms-core/local-api/auth-helpers';
import type { LocalAPIContext } from '@aphexcms/cms-core/server';

type AphexServices = App.Locals['aphexCMS'];

/** The document types the seed creates — and the types whose presence blocks it. */
const SEEDED_TYPES = ['page'] as const;

/** Create the example content: a single welcome page. */
export async function seedContent(
	aphex: Pick<AphexServices, 'localAPI'>,
	context: LocalAPIContext
): Promise<{ pages: number }> {
	await aphex.localAPI.collections.page.create(
		context,
		{
			title: 'Welcome to Aphex',
			slug: 'welcome',
			body:
				'This page was created automatically on first run so the admin has something to show.\n\n' +
				'Edit or delete it, then make the content model your own: schemas live in ' +
				'src/lib/schemaTypes/, and `pnpm generate:types` keeps the frontend honest about them.'
		} as never,
		{ publish: true }
	);
	return { pages: 1 };
}

// --- first-run trigger --------------------------------------------------------

/**
 * Per-process latch. `'done'` means "decided" — either we seeded, or the site was
 * already touched. A pending promise dedupes concurrent first requests. `null`
 * means "no organization yet, check again next request" (pre-signup; signup
 * creates the org mid-request, so the decision lands on the request after it).
 */
let seedState: Promise<void> | 'done' | null = null;

/** Seed example content the first time the app runs against an untouched site. */
export function seedOnFirstRun(locals: App.Locals): Promise<void> {
	if (seedState === 'done') return Promise.resolve();
	if (seedState) return seedState;

	const attempt = (async () => {
		const { databaseAdapter } = locals.aphexCMS;
		const orgs = await databaseAdapter.findAllOrganizations();
		const org = orgs[0];
		if (!org) {
			seedState = null; // nothing to seed into yet — re-check next request
			return;
		}

		// One counts query decides it: any row of any seeded type means a person
		// has touched this site, and the seed stays out of it forever.
		const counts = await databaseAdapter.getDocCountsByType(org.id);
		const touched = SEEDED_TYPES.some((type) => (counts[type] ?? 0) > 0);
		if (touched) {
			seedState = 'done';
			return;
		}

		console.log('[seed] Fresh site detected — creating example content…');
		const created = await seedContent(locals.aphexCMS, systemContext(org.id));
		console.log(`[seed] Done: ${created.pages} page.`);
		seedState = 'done';
	})().catch((error) => {
		// Never let seeding take a request down. A partial seed leaves rows behind,
		// so the counts check above keeps the retry from duplicating anything.
		console.error('[seed] Failed to seed example content:', error);
		seedState = 'done';
	});

	seedState = attempt;
	return attempt;
}

/** Whether the first-run seed is enabled (kill switch: `APHEX_SEED=false`). */
export function seedEnabled(): boolean {
	return env.APHEX_SEED !== 'false';
}
