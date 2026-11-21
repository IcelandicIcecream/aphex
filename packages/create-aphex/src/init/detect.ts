import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export type PackageManager = 'pnpm' | 'npm' | 'yarn' | 'bun';

interface PackageJson {
	name?: string;
	dependencies?: Record<string, string>;
	devDependencies?: Record<string, string>;
}

/** What `init` needs to know about the app before it plans anything. */
export interface AppInfo {
	cwd: string;
	name: string;
	packageManager: PackageManager;
	/** Every dependency and devDependency name the app already has. */
	installed: Set<string>;
	/** Major versions, from `node_modules` when installed, else from the range. */
	kitMajor: number | undefined;
	kitVersion: string | undefined;
	svelteMajor: number | undefined;
	tailwindMajor: number | undefined;
	hasTailwindVitePlugin: boolean;
	typescript: boolean;
	viteConfig: string | undefined;
	hooksFile: string | undefined;
	appDts: boolean;
}

function readJson(path: string): PackageJson | undefined {
	try {
		return JSON.parse(readFileSync(path, 'utf8')) as PackageJson;
	} catch {
		return undefined;
	}
}

export function readPackageJson(cwd: string): PackageJson | undefined {
	return readJson(join(cwd, 'package.json'));
}

/** True when the folder is a SvelteKit app, which is what switches create-aphex into init. */
export function isSvelteKitApp(cwd: string): boolean {
	const pkg = readPackageJson(cwd);
	return Boolean(pkg?.dependencies?.['@sveltejs/kit'] ?? pkg?.devDependencies?.['@sveltejs/kit']);
}

/** The installed version, else the first version in the declared range. */
function versionOf(cwd: string, pkg: PackageJson, name: string): string | undefined {
	const installed = readJson(join(cwd, 'node_modules', name, 'package.json'));
	if (installed && 'version' in installed && typeof installed.version === 'string') {
		return installed.version;
	}
	const range = pkg.dependencies?.[name] ?? pkg.devDependencies?.[name];
	return range?.match(/\d+(\.\d+){0,2}/)?.[0];
}

function major(version: string | undefined): number | undefined {
	if (!version) return undefined;
	const value = Number.parseInt(version, 10);
	return Number.isNaN(value) ? undefined : value;
}

export function detectPackageManager(
	cwd: string,
	userAgent = process.env.npm_config_user_agent
): PackageManager {
	if (existsSync(join(cwd, 'pnpm-lock.yaml'))) return 'pnpm';
	if (existsSync(join(cwd, 'bun.lock')) || existsSync(join(cwd, 'bun.lockb'))) return 'bun';
	if (existsSync(join(cwd, 'yarn.lock'))) return 'yarn';
	if (existsSync(join(cwd, 'package-lock.json'))) return 'npm';
	const fromAgent = userAgent?.split('/')[0];
	if (fromAgent === 'pnpm' || fromAgent === 'yarn' || fromAgent === 'bun') return fromAgent;
	return 'npm';
}

function firstExisting(cwd: string, candidates: string[]): string | undefined {
	return candidates.find((file) => existsSync(join(cwd, file)));
}

export function detectApp(cwd: string): AppInfo {
	const pkg = readPackageJson(cwd) ?? {};
	const installed = new Set([
		...Object.keys(pkg.dependencies ?? {}),
		...Object.keys(pkg.devDependencies ?? {})
	]);
	const kitVersion = versionOf(cwd, pkg, '@sveltejs/kit');
	const viteConfig = firstExisting(cwd, [
		'vite.config.ts',
		'vite.config.js',
		'vite.config.mts',
		'vite.config.mjs'
	]);
	const viteSource = viteConfig ? readFileSync(join(cwd, viteConfig), 'utf8') : '';

	return {
		cwd,
		name: pkg.name ?? 'my-app',
		packageManager: detectPackageManager(cwd),
		installed,
		kitMajor: major(kitVersion),
		kitVersion,
		svelteMajor: major(versionOf(cwd, pkg, 'svelte')),
		tailwindMajor: installed.has('tailwindcss')
			? major(versionOf(cwd, pkg, 'tailwindcss'))
			: undefined,
		hasTailwindVitePlugin:
			installed.has('@tailwindcss/vite') || viteSource.includes('@tailwindcss/vite'),
		typescript: existsSync(join(cwd, 'tsconfig.json')),
		viteConfig,
		hooksFile: firstExisting(cwd, ['src/hooks.server.ts', 'src/hooks.server.js']),
		appDts: existsSync(join(cwd, 'src/app.d.ts'))
	};
}

/**
 * Reasons `init` can't go ahead. Each one is something the person has to change first,
 * so they are checked before any question is asked.
 */
export function findBlockers(app: AppInfo): string[] {
	const blockers: string[] = [];
	if (app.kitMajor === undefined) {
		blockers.push('Couldn’t find the @sveltejs/kit version. Run your install first.');
	} else if (app.kitMajor >= 3) {
		blockers.push(
			`This app uses SvelteKit ${app.kitVersion}. Aphex supports SvelteKit 2 for now, and Kit 3 support is planned.`
		);
	} else if (app.kitMajor < 2) {
		blockers.push(
			`This app uses SvelteKit ${app.kitVersion}. Aphex needs SvelteKit 2.49 or newer.`
		);
	}
	if (app.svelteMajor !== undefined && app.svelteMajor < 5) {
		blockers.push('Aphex needs Svelte 5. Upgrade svelte first.');
	}
	if (app.tailwindMajor !== undefined && app.tailwindMajor < 4) {
		blockers.push(
			`This app uses Tailwind ${app.tailwindMajor}. The admin is styled with Tailwind 4, so upgrade Tailwind first.`
		);
	}
	if (!app.typescript) {
		blockers.push('Aphex’s setup files are TypeScript, and this app has no tsconfig.json.');
	}
	if (!app.viteConfig) {
		blockers.push('Couldn’t find vite.config.ts.');
	}
	if (existsSync(join(app.cwd, 'src/routes/admin'))) {
		blockers.push(
			'src/routes/admin already exists, and that’s where the admin goes. Move it, then run this again.'
		);
	}
	return blockers;
}
