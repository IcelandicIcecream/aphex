import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, posix, relative, sep } from 'node:path';
import type { AppInfo } from '../init/detect.js';
import { patchAppDts, patchViteConfig, type PatchResult } from '../init/patch.js';
import type { Change } from '../init/plan.js';
import { adminPageServer, adminPageSvelte } from '../init/templates.js';
import { KNOWN_FILES, KNOWN_LINES } from './known-files.js';
import { lineHash, meaningfulLines } from './lines.js';
import { HELPER_FILES, ROUTE_UNITS, SIGN_IN_UNIT, type RouteUnit } from './units.js';

export type UpgradeChange =
	| Change
	| {
			path: string;
			action: 'delete';
			reason: string;
			/** The route folder it's deleted with. */ dir?: string;
	  };

export interface EditedFile {
	path: string;
	/** Lines no shipped version of this file had: the person's own. Empty when they only deleted lines. */
	ownLines: string[];
	/** True when Aphex never shipped a file at this path, so all of it is theirs. */
	added: boolean;
}

export interface KeptUnit {
	unit: RouteUnit;
	/** Files that differ from every version Aphex shipped, or that Aphex never shipped. */
	edited: EditedFile[];
}

export interface UpgradeOptions {
	/** Labels of kept units to delete anyway, because the person said so. */
	replace?: ReadonlySet<string>;
}

export interface UpgradePlan {
	changes: UpgradeChange[];
	kept: KeptUnit[];
	/** Files outside the deleted routes that still link to one of them. */
	staleLinks: Array<{ path: string; link: string }>;
	/** Installed `@aphexcms/*` packages, to move to the new major. */
	packages: string[];
	/**
	 * Patches the app applies to an `@aphexcms/*` package. Each is pinned to the version
	 * installed now, so moving the package makes the install fail until it's dealt with.
	 */
	patches: Array<{ dependency: string; file: string }>;
}

/** `pnpm.patchedDependencies` in package.json, and `patchedDependencies` in pnpm-workspace.yaml. */
export function aphexPatches(cwd: string): Array<{ dependency: string; file: string }> {
	const found: Array<{ dependency: string; file: string }> = [];
	const pkg = read(cwd, 'package.json');
	if (pkg) {
		try {
			const parsed: { pnpm?: { patchedDependencies?: Record<string, string> } } = JSON.parse(pkg);
			for (const [dependency, file] of Object.entries(parsed.pnpm?.patchedDependencies ?? {})) {
				if (dependency.startsWith('@aphexcms/')) found.push({ dependency, file });
			}
		} catch {
			// A package.json that doesn't parse is reported by the package manager.
		}
	}
	const workspace = read(cwd, 'pnpm-workspace.yaml') ?? '';
	const block = workspace.match(/^patchedDependencies:\s*\n((?:[ \t]+.*\n?)*)/m);
	for (const line of block?.[1].split('\n') ?? []) {
		const entry = line.match(/^\s+['"]?(@aphexcms\/[^'":\s]+)['"]?\s*:\s*['"]?([^'"\s]+)/);
		if (entry) found.push({ dependency: entry[1], file: entry[2] });
	}
	return found;
}

/** Git's blob id, so a file can be matched against every version in the repo's history. */
export function blobId(content: Buffer): string {
	return createHash('sha1').update(`blob ${content.length}\0`).update(content).digest('hex');
}

/** Which lines of a changed file are the person's own, judged against every shipped version. */
export function describeEdit(path: string, source: string): EditedFile {
	const known = KNOWN_LINES[path];
	if (known === undefined) return { path, ownLines: [], added: true };
	const hashes = new Set(known.split(' '));
	return {
		path,
		ownLines: meaningfulLines(source).filter((line) => !hashes.has(lineHash(line))),
		added: false
	};
}

/** True when the file is byte-for-byte a version Aphex shipped, with either line ending. */
export function isKnownVersion(path: string, content: Buffer): boolean {
	const known = KNOWN_FILES[path];
	if (!known) return false;
	if (known.includes(blobId(content))) return true;
	const text = content.toString('utf8');
	return text.includes('\r\n') && known.includes(blobId(Buffer.from(text.replace(/\r\n/g, '\n'))));
}

function toPosix(path: string): string {
	return path.split(sep).join(posix.sep);
}

/** Every file under `dir`, as app-relative posix paths. */
function filesUnder(cwd: string, dir: string): string[] {
	const full = join(cwd, dir);
	if (!existsSync(full)) return [];
	const out: string[] = [];
	const walk = (path: string) => {
		for (const entry of readdirSync(path)) {
			const child = join(path, entry);
			if (statSync(child).isDirectory()) walk(child);
			else out.push(toPosix(relative(cwd, child)));
		}
	};
	walk(full);
	return out;
}

const SOURCE = /\.(ts|js|mjs|svelte)$/;

/** The app's own source: `src/` plus root config files like `aphex.config.ts`. */
function sourceFiles(cwd: string): string[] {
	const root = readdirSync(cwd).filter(
		(name) => SOURCE.test(name) && statSync(join(cwd, name)).isFile()
	);
	return [...root, ...filesUnder(cwd, 'src').filter((path) => SOURCE.test(path))];
}

const SPECIFIER = /(?:from\s*|import\s*\(\s*|import\s+)['"]([^'"]+)['"]/g;

/** Drops the extension an import may or may not spell out. */
function stem(path: string): string {
	return path.replace(/\.(js|ts)$/, '').replace(/\.svelte$/, '.svelte');
}

/** The app-relative module an import in `importer` points at, if it's one of the app's own. */
function resolveImport(importer: string, specifier: string): string | undefined {
	if (specifier.startsWith('$lib/')) return stem(`src/lib/${specifier.slice(5)}`);
	if (specifier.startsWith('.'))
		return stem(posix.normalize(posix.join(posix.dirname(importer), specifier)));
	return undefined;
}

function importsIn(path: string, source: string): Set<string> {
	const found = new Set<string>();
	for (const match of source.matchAll(SPECIFIER)) {
		const resolved = resolveImport(path, match[1]);
		if (resolved) {
			found.add(resolved);
			// `./index` is how a folder import resolves.
			found.add(`${resolved}/index`);
		}
	}
	return found;
}

function read(cwd: string, path: string): string | undefined {
	const full = join(cwd, path);
	return existsSync(full) ? readFileSync(full, 'utf8') : undefined;
}

/**
 * Removes the old template's invitation email hook from `aphex.config.ts`, because core
 * sends that email now and leaving it means invitees get two.
 */
export function removeInvitationHook(source: string): PatchResult {
	if (!source.includes('registerInvitationEmailHook')) return { kind: 'unchanged' };
	let code = source.replace(
		/^import\s*\{\s*registerInvitationEmailHook\s*\}\s*from\s*['"][^'"]+['"];?[ \t]*\r?\n/m,
		''
	);
	// The whole `api` option when that call is all it does, with the comment above it.
	code = code.replace(
		/\r?\n(?:[ \t]*\r?\n)*(?:[ \t]*\/\/[^\n]*\r?\n)*[ \t]*api:\s*\(\s*(\w+)\s*\)\s*=>\s*\{\s*registerInvitationEmailHook\(\s*\1\s*\);?\s*\},?/,
		''
	);
	// Otherwise just the call.
	code = code.replace(/^[ \t]*registerInvitationEmailHook\([^)]*\);?[ \t]*\r?\n/m, '');
	if (code.includes('registerInvitationEmailHook')) {
		return {
			kind: 'manual',
			instructions:
				'Remove registerInvitationEmailHook. Core sends the invitation email now, so with it invitees get two.'
		};
	}
	// Drop a trailing comma left before the closing `});`.
	code = code.replace(/,(\s*\r?\n\}\);)/, '$1');
	return { kind: 'patched', code };
}

/** Points `loginUrl` at core's sign-in page. */
export function moveLoginUrl(source: string): PatchResult {
	if (/loginUrl:\s*['"]\/admin\/login['"]/.test(source)) return { kind: 'unchanged' };
	const code = source.replace(/loginUrl:\s*(['"])\/login\1/, "loginUrl: '/admin/login'");
	if (code !== source) return { kind: 'patched', code };
	// `aphexAuth()` with no loginUrl already means /admin/login.
	if (/\baphexAuth\s*\(/.test(source) && !source.includes('loginUrl')) return { kind: 'unchanged' };
	return {
		kind: 'manual',
		instructions: "Set auth.loginUrl to '/admin/login', where core serves the sign-in page now."
	};
}

/** Tells `createAphexAuth()` that the reset page is under /admin, for the reset email's link. */
export function addAuthPagesPath(source: string): PatchResult {
	if (source.includes('authPagesPath')) return { kind: 'unchanged' };
	const match = source.match(/createAphexAuth\(\{[ \t]*\r?\n([ \t]*)/);
	if (!match) {
		return {
			kind: 'manual',
			instructions:
				"Pass authPagesPath: '/admin' to createAphexAuth(), so password reset emails link to core's page."
		};
	}
	const indent = match[1];
	const code = source.replace(
		match[0],
		`createAphexAuth({\n${indent}// Core serves the password reset page under /admin.\n${indent}authPagesPath: '/admin',\n${indent}`
	);
	return { kind: 'patched', code };
}

function aphexClientFor(cwd: string): string {
	const hasPlugins = existsSync(join(cwd, 'src/lib/plugins.ts'));
	return `import type { AphexClientConfig } from '@aphexcms/cms-core/client';
import { adminAuthClient } from '@aphexcms/auth/client';
import { schemaTypes } from '$lib/schemaTypes';
${hasPlugins ? "import { plugins } from '$lib/plugins';\n" : ''}
export const aphexClient: AphexClientConfig = {
	schemas: schemaTypes,
${hasPlugins ? '\tplugins,\n' : ''}	adminAuthClient
};
`;
}

const ROUTE_LINKS: Record<string, string[]> = {
	[SIGN_IN_UNIT]: [
		'/login',
		'/invite/',
		'/invitations',
		'/reset-password',
		'/two-factor',
		'/verify-email'
	],
	'God Mode': ['/god-mode']
};

/**
 * Old apps read the session as `locals.auth`, which Aphex renamed `locals.aphexAuth`.
 * Only renamed when `app.d.ts` shows `auth` is Aphex's, since the name is now the app's own.
 */
export function aphexOwnsLocalsAuth(appDts: string): boolean {
	return (
		/\bauth\??:\s*Auth\b/.test(appDts) &&
		/import\s+type\s*\{[^}]*\bAuth\b[^}]*\}\s*from\s*['"]@aphexcms\/cms-core/.test(appDts)
	);
}

export function renameLocalsAuth(source: string): PatchResult {
	const code = source.replace(/\blocals\.auth\b(?![\w$])/g, 'locals.aphexAuth');
	return code === source ? { kind: 'unchanged' } : { kind: 'patched', code };
}

export function renameLocalsAuthDeclaration(source: string): PatchResult {
	const code = source.replace(/\bauth(\??):\s*Auth\b/, 'aphexAuth$1: Auth');
	return code === source ? { kind: 'unchanged' } : { kind: 'patched', code };
}

export function buildUpgradePlan(app: AppInfo, options: UpgradeOptions = {}): UpgradePlan {
	const { cwd } = app;
	const deletes: UpgradeChange[] = [];
	const creates: UpgradeChange[] = [];
	const manual: UpgradeChange[] = [];
	const kept: KeptUnit[] = [];
	const deleted = new Set<string>();
	const removedUnits: RouteUnit[] = [];

	// Every edit goes through here, so two edits to one file become one change.
	const edited = new Map<string, string>();
	const current = (path: string) => edited.get(path) ?? read(cwd, path);
	const apply = (path: string, patch: (source: string) => PatchResult) => {
		const source = current(path);
		if (source === undefined) return;
		const result = patch(source);
		if (result.kind === 'patched') edited.set(path, result.code);
		if (result.kind === 'manual')
			manual.push({ path, action: 'manual', instructions: result.instructions });
	};

	for (const unit of ROUTE_UNITS) {
		const files = unit.dirs.flatMap((dir) => filesUnder(cwd, dir));
		if (files.length === 0) continue;
		const changed = files.filter((path) => !isKnownVersion(path, readFileSync(join(cwd, path))));
		if (changed.length > 0 && !options.replace?.has(unit.label)) {
			kept.push({ unit, edited: changed.map((path) => describeEdit(path, read(cwd, path) ?? '')) });
			continue;
		}
		removedUnits.push(unit);
		for (const dir of unit.dirs) {
			for (const path of filesUnder(cwd, dir)) {
				deleted.add(path);
				deletes.push({ path, action: 'delete', reason: `core serves ${unit.servedAt}`, dir });
			}
		}
	}
	const remaining = () => sourceFiles(cwd).filter((path) => !deleted.has(path));
	const signInMoved = removedUnits.some((unit) => unit.label === SIGN_IN_UNIT);

	if (existsSync(join(cwd, 'aphex.config.ts'))) {
		apply('aphex.config.ts', removeInvitationHook);
		if (signInMoved) apply('aphex.config.ts', moveLoginUrl);
	}
	if (signInMoved) {
		const authFile = remaining().find((path) => (current(path) ?? '').includes('createAphexAuth('));
		if (authFile) apply(authFile, addAuthPagesPath);
		else if (!/\baphexAuth\s*\(/.test(current('aphex.config.ts') ?? '')) {
			manual.push({
				path: 'password reset email',
				action: 'manual',
				instructions:
					'This app builds its own auth, so check its reset email: it must link to\n/admin/reset-password/<token>, where core serves the page now. Moving to\naphexAuth() in aphex.config.ts does this for you.'
			});
		}
	}

	const appDts = current('src/app.d.ts');
	if (appDts !== undefined && aphexOwnsLocalsAuth(appDts)) {
		apply('src/app.d.ts', renameLocalsAuthDeclaration);
		for (const path of remaining()) apply(path, renameLocalsAuth);
	}

	// A helper goes once nothing that stays imports it. Repeat, because removing one
	// helper can free another that only it imported.
	let freed = true;
	while (freed) {
		freed = false;
		const imported = new Set<string>();
		for (const path of remaining()) {
			for (const target of importsIn(path, current(path) ?? '')) imported.add(target);
		}
		for (const helper of HELPER_FILES) {
			if (deleted.has(helper) || !existsSync(join(cwd, helper))) continue;
			if (imported.has(stem(helper))) continue;
			if (!isKnownVersion(helper, readFileSync(join(cwd, helper)))) continue;
			deleted.add(helper);
			deletes.push({ path: helper, action: 'delete', reason: 'only the old routes used it' });
			freed = true;
		}
	}

	// What the new admin needs. Created only when missing.
	const create = (path: string, content: string) => {
		if (read(cwd, path) === undefined) creates.push({ path, action: 'create', content });
	};
	create('src/routes/admin/[...path]/+page.server.ts', adminPageServer);
	create('src/routes/admin/[...path]/+page.svelte', adminPageSvelte);
	if (existsSync(join(cwd, 'src/lib/schemaTypes'))) {
		create('src/lib/aphex.client.ts', aphexClientFor(cwd));
	} else if (read(cwd, 'src/lib/aphex.client.ts') === undefined) {
		manual.push({
			path: 'src/lib/aphex.client.ts',
			action: 'manual',
			instructions:
				'Create it with your schemas and adminAuthClient from @aphexcms/auth/client. See the upgrade guide.'
		});
	}

	if (app.viteConfig) apply(app.viteConfig, (source) => patchViteConfig(source, false));
	if (current('src/app.d.ts') !== undefined) apply('src/app.d.ts', patchAppDts);

	// Links elsewhere in the app to a route that's going away.
	const staleLinks: Array<{ path: string; link: string }> = [];
	const gone = removedUnits.flatMap((unit) => ROUTE_LINKS[unit.label] ?? []);
	for (const path of gone.length > 0 ? remaining() : []) {
		const source = current(path) ?? '';
		for (const link of gone) {
			const pattern = new RegExp(`['"\`]${link.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')}(?![\\w-])`);
			if (pattern.test(source)) staleLinks.push({ path, link });
		}
	}

	const updates: UpgradeChange[] = [...edited.entries()]
		.filter(([path, code]) => code !== read(cwd, path))
		.map(([path, content]) => ({ path, action: 'update', content }));
	const packages = [...app.installed].filter((name) => name.startsWith('@aphexcms/')).sort();
	return {
		changes: [...deletes, ...creates, ...updates, ...manual],
		kept,
		staleLinks,
		packages,
		patches: aphexPatches(cwd)
	};
}

/** Folders left empty once their files are deleted, deepest first, stopping at `src/routes`. */
export function emptiedDirs(cwd: string, deletedPaths: string[]): string[] {
	const candidates = new Set<string>();
	for (const path of deletedPaths) {
		let dir = posix.dirname(path);
		while (dir !== 'src/routes' && dir !== 'src/lib' && dir !== 'src' && dir !== '.') {
			candidates.add(dir);
			dir = posix.dirname(dir);
		}
	}
	return [...candidates]
		.sort((a, b) => b.length - a.length)
		.filter((dir) => existsSync(join(cwd, dir)));
}
