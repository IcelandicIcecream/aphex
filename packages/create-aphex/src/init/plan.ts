import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { AppInfo } from './detect.js';
import {
	appendMissingLines,
	patchAppDts,
	patchEnv,
	patchHooks,
	patchViteConfig,
	type PatchResult
} from './patch.js';
import {
	adminPageServer,
	adminPageSvelte,
	aphexClient,
	aphexConfig,
	appDts,
	drizzleConfig,
	envEntries,
	hooksServer,
	packagesFor,
	schemaTypesIndex,
	titleFromName,
	type InitChoices
} from './templates.js';

export type Change =
	| { path: string; action: 'create' | 'update'; content: string }
	| { path: string; action: 'keep'; reason: string }
	| { path: string; action: 'manual'; instructions: string };

export interface Plan {
	changes: Change[];
	dependencies: string[];
	devDependencies: string[];
}

function read(app: AppInfo, path: string): string | undefined {
	const full = join(app.cwd, path);
	return existsSync(full) ? readFileSync(full, 'utf8') : undefined;
}

/** A file only init writes: created when missing, otherwise left as the person has it. */
function createOnly(
	app: AppInfo,
	path: string,
	content: string,
	reason = 'already exists'
): Change {
	return read(app, path) === undefined
		? { path, action: 'create', content }
		: { path, action: 'keep', reason };
}

/** A file the app may already have: patched in place, or created from scratch. */
function patchOrCreate(
	app: AppInfo,
	path: string,
	create: string,
	patch: (source: string) => PatchResult
): Change {
	const source = read(app, path);
	if (source === undefined) return { path, action: 'create', content: create };
	const result = patch(source);
	if (result.kind === 'patched') return { path, action: 'update', content: result.code };
	if (result.kind === 'manual')
		return { path, action: 'manual', instructions: result.instructions };
	return { path, action: 'keep', reason: 'already set up for Aphex' };
}

function fromPatch(path: string, result: PatchResult): Change {
	if (result.kind === 'patched') return { path, action: 'update', content: result.code };
	if (result.kind === 'manual')
		return { path, action: 'manual', instructions: result.instructions };
	return { path, action: 'keep', reason: 'already set up for Aphex' };
}

/**
 * Everything init would do, worked out before anything is written, so `--dry-run`
 * and the confirmation prompt show exactly what happens.
 */
export function buildPlan(app: AppInfo, choices: InitChoices, secret: string): Plan {
	const needsTailwind = !app.hasTailwindVitePlugin;
	const changes: Change[] = [
		createOnly(app, 'aphex.config.ts', aphexConfig(choices, titleFromName(app.name))),
		createOnly(app, 'src/lib/schemaTypes/index.ts', schemaTypesIndex),
		createOnly(app, 'src/lib/aphex.client.ts', aphexClient),
		{
			path: 'src/routes/admin/[...path]/+page.server.ts',
			action: 'create',
			content: adminPageServer
		},
		{ path: 'src/routes/admin/[...path]/+page.svelte', action: 'create', content: adminPageSvelte }
	];

	if (app.viteConfig) {
		changes.push(
			fromPatch(app.viteConfig, patchViteConfig(read(app, app.viteConfig) ?? '', needsTailwind))
		);
	}

	changes.push(
		app.hooksFile
			? fromPatch(app.hooksFile, patchHooks(read(app, app.hooksFile) ?? ''))
			: { path: 'src/hooks.server.ts', action: 'create', content: hooksServer }
	);
	changes.push(patchOrCreate(app, 'src/app.d.ts', appDts, patchAppDts));

	if (choices.database === 'postgres') {
		const existing = read(app, 'drizzle.config.ts');
		changes.push(
			existing === undefined
				? { path: 'drizzle.config.ts', action: 'create', content: drizzleConfig }
				: existing.includes('@aphexcms/postgresql-adapter')
					? { path: 'drizzle.config.ts', action: 'keep', reason: 'already lists the Aphex tables' }
					: {
							path: 'drizzle.config.ts',
							action: 'manual',
							instructions: [
								'Add the Aphex tables to schema:',
								"\t'./node_modules/@aphexcms/postgresql-adapter/dist/schema.js',",
								"\t'./node_modules/@aphexcms/auth/dist/schema/pg.js'"
							].join('\n')
						}
		);
	}

	const entries = envEntries(choices, app.name, secret);
	changes.push(fromPatchOrNew('.env', read(app, '.env'), (source) => patchEnv(source, entries)));
	const example = read(app, '.env.example');
	if (example !== undefined) {
		// The example gets the keys but never the secret.
		changes.push(
			fromPatch(
				'.env.example',
				patchEnv(
					example,
					entries.map(([key, value]) => [key, key === 'AUTH_SECRET' ? '' : value])
				)
			)
		);
	}

	const ignored = [
		...(choices.database === 'sqlite' ? ['.aphex'] : []),
		...(choices.storage === 'local' ? ['/storage'] : [])
	];
	if (ignored.length > 0) {
		changes.push(
			fromPatchOrNew('.gitignore', read(app, '.gitignore'), (source) =>
				appendMissingLines(source, ignored, 'Aphex')
			)
		);
	}

	const packages = packagesFor(choices, needsTailwind);
	const bare = (spec: string) => spec.replace(/(.)@[^/]*$/, '$1');
	return {
		changes,
		dependencies: packages.dependencies.filter((spec) => !app.installed.has(bare(spec))),
		devDependencies: packages.devDependencies.filter((spec) => !app.installed.has(bare(spec)))
	};
}

function fromPatchOrNew(
	path: string,
	source: string | undefined,
	patch: (source: string) => PatchResult
): Change {
	const result = patch(source ?? '');
	if (result.kind === 'patched') {
		return { path, action: source === undefined ? 'create' : 'update', content: result.code };
	}
	return fromPatch(path, result);
}
