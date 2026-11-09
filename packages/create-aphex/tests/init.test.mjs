import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import {
	appendMissingLines,
	patchAppDts,
	patchEnv,
	patchHooks,
	patchViteConfig
} from '../dist/init/patch.js';
import { detectApp, findBlockers } from '../dist/init/detect.js';
import { buildPlan } from '../dist/init/plan.js';
import { aphexConfig, titleFromName } from '../dist/init/templates.js';

const defaults = { database: 'sqlite', storage: 'local', email: 'none' };

// What `npx sv create` writes, Kit 2 era.
const SV_VITE = `import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()]
});
`;

const SV_APP_DTS = `// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
`;

test('vite config: adds aphex() and tailwindcss() to a fresh sv config', () => {
	const result = patchViteConfig(SV_VITE, true);
	assert.equal(result.kind, 'patched');
	assert.match(result.code, /import \{ aphex \} from ['"]@aphexcms\/cms-core\/vite['"]/);
	assert.match(result.code, /import tailwindcss from ['"]@tailwindcss\/vite['"]/);
	assert.match(result.code, /\n\tplugins: \[sveltekit\(\), tailwindcss\(\), aphex\(\)\]/);
});

test('vite config: keeps two-space indentation as it is', () => {
	const result = patchViteConfig(SV_VITE.replace('\tplugins', '  plugins'), false);
	assert.match(result.code, /\n  plugins: \[sveltekit\(\), aphex\(\)\]/);
});

test('vite config: leaves Tailwind alone when the app has it, and is idempotent', () => {
	const withTailwind = SV_VITE.replace(
		"import { defineConfig } from 'vite';",
		"import { defineConfig } from 'vite';\nimport tailwindcss from '@tailwindcss/vite';"
	).replace('[sveltekit()]', '[tailwindcss(), sveltekit()]');
	const once = patchViteConfig(withTailwind, false);
	assert.equal(once.kind, 'patched');
	assert.equal(once.code.match(/tailwindcss\(\)/g).length, 1);
	assert.deepEqual(patchViteConfig(once.code, false), { kind: 'unchanged' });
});

test('vite config: asks for a hand edit when the config is a function', () => {
	const result = patchViteConfig(
		`import { sveltekit } from '@sveltejs/kit/vite';\nexport default ({ mode }) => buildConfig(mode, [sveltekit()]);\n`,
		false
	);
	assert.equal(result.kind, 'manual');
	assert.match(result.instructions, /aphex\(\)/);
});

test('hooks: puts Aphex first in front of an existing const handle', () => {
	const result = patchHooks(
		`import type { Handle } from '@sveltejs/kit';\n\nexport const handle: Handle = async ({ event, resolve }) => resolve(event);\n`
	);
	assert.equal(result.kind, 'patched');
	assert.match(result.code, /const appHandle: Handle = async/);
	assert.match(
		result.code,
		/export const handle = sequence\(createCMSHook\(cmsConfig\), appHandle\);/
	);
	assert.match(result.code, /import \{ sequence \} from '@sveltejs\/kit\/hooks';/);
	assert.equal(result.code.match(/export const handle/g).length, 1);
});

test('hooks: handles a function declaration and an existing sequence import', () => {
	const result = patchHooks(
		`import { sequence } from '@sveltejs/kit/hooks';\nexport async function handle({ event, resolve }) {\n\treturn resolve(event);\n}\n`
	);
	assert.equal(result.kind, 'patched');
	assert.match(result.code, /async function appHandle\(/);
	assert.equal(result.code.match(/import \{ sequence \}/g).length, 1);
});

test('hooks: adds a handle beside other hooks, and leaves a set-up file alone', () => {
	const result = patchHooks(`export const handleError = ({ error }) => console.error(error);\n`);
	assert.equal(result.kind, 'patched');
	assert.match(result.code, /export const handleError/);
	assert.match(result.code, /export const handle = createCMSHook\(cmsConfig\);/);
	assert.deepEqual(patchHooks(result.code), { kind: 'unchanged' });
});

test('hooks: asks for a hand edit when handle is re-exported', () => {
	const result = patchHooks(`import { handle } from './lib/hooks';\nexport { handle };\n`);
	assert.equal(result.kind, 'manual');
});

test('app.d.ts: fills in the commented Locals from sv create', () => {
	const result = patchAppDts(SV_APP_DTS);
	assert.equal(result.kind, 'patched');
	assert.match(result.code, /^import type \{ CMSInstances, Auth \}/);
	assert.match(
		result.code,
		/\t\tinterface Locals \{\n\t\t\taphexCMS: CMSInstances;\n\t\t\taphexAuth\?: Auth;\n\t\t\}/
	);
	assert.doesNotMatch(result.code, /\/\/ interface Locals/);
	assert.deepEqual(patchAppDts(result.code), { kind: 'unchanged' });
});

test('app.d.ts: adds to an existing Locals without dropping its fields', () => {
	const source = SV_APP_DTS.replace(
		'// interface Locals {}',
		'interface Locals {\n\t\t\tuser: string;\n\t\t}'
	);
	const result = patchAppDts(source);
	assert.equal(result.kind, 'patched');
	assert.match(
		result.code,
		/interface Locals \{\n\t\t\taphexCMS: CMSInstances;\n\t\t\taphexAuth\?: Auth;\n\t\t\tuser: string;/
	);
});

test('app.d.ts: asks for a hand edit without declare global', () => {
	assert.equal(patchAppDts('declare namespace App { interface Locals {} }\n').kind, 'manual');
});

test('.env: adds missing keys and never changes a value that is set', () => {
	const result = patchEnv('AUTH_SECRET=mine\nOTHER=1', [
		['DATABASE_URL', 'file:.aphex/app.db'],
		['AUTH_SECRET', 'generated']
	]);
	assert.equal(result.kind, 'patched');
	assert.match(result.code, /AUTH_SECRET=mine/);
	assert.doesNotMatch(result.code, /generated/);
	assert.match(result.code, /\n\n# Aphex\nDATABASE_URL=file:\.aphex\/app\.db\n$/);
	assert.deepEqual(appendMissingLines('.aphex\n', ['.aphex'], 'Aphex'), { kind: 'unchanged' });
});

test('config: one import and one line per choice', () => {
	const config = aphexConfig(
		{ database: 'postgres', storage: 's3', email: 'resend' },
		"Ben's Shop"
	);
	assert.match(config, /postgresAdapter\(\{ connectionString: env\.DATABASE_URL \}\)/);
	assert.match(config, /s3Storage\(\{/);
	assert.match(config, /resendAdapter\(\{ apiKey: env\.RESEND_API_KEY, from: env\.EMAIL_FROM \}\)/);
	assert.match(config, /title: 'Ben\\'s Shop'/);
	assert.doesNotMatch(aphexConfig(defaults, 'X'), /s3Storage|resendAdapter|postgres/);
	assert.equal(titleFromName('@acme/my-shop'), 'My Shop');
});

function fakeApp(files, packageJson) {
	const dir = mkdtempSync(join(tmpdir(), 'aphex-init-'));
	writeFileSync(join(dir, 'package.json'), JSON.stringify(packageJson));
	for (const [path, content] of Object.entries(files)) {
		mkdirSync(join(dir, path, '..'), { recursive: true });
		writeFileSync(join(dir, path), content);
	}
	return dir;
}

const kit2 = { name: 'my-shop', devDependencies: { '@sveltejs/kit': '^2.49.0', svelte: '^5.0.0' } };

test('plan: a fresh sv app gets every file and the guide’s packages', () => {
	const dir = fakeApp(
		{
			'vite.config.ts': SV_VITE,
			'src/app.d.ts': SV_APP_DTS,
			'tsconfig.json': '{}',
			'.gitignore': 'node_modules\n'
		},
		kit2
	);
	const app = detectApp(dir);
	assert.deepEqual(findBlockers(app), []);
	const plan = buildPlan(app, defaults, 'secret');
	const byPath = Object.fromEntries(plan.changes.map((change) => [change.path, change.action]));
	assert.deepEqual(byPath, {
		'aphex.config.ts': 'create',
		'src/lib/schemaTypes/index.ts': 'create',
		'src/lib/aphex.client.ts': 'create',
		'src/routes/admin/[...path]/+page.server.ts': 'create',
		'src/routes/admin/[...path]/+page.svelte': 'create',
		'vite.config.ts': 'update',
		'src/hooks.server.ts': 'create',
		'src/app.d.ts': 'update',
		'.env': 'create',
		'.gitignore': 'update'
	});
	assert.deepEqual(plan.dependencies, [
		'@aphexcms/cms-core',
		'@aphexcms/auth',
		'sharp',
		'graphql@16',
		'@aphexcms/sqlite-adapter',
		'drizzle-kit'
	]);
	assert.deepEqual(plan.devDependencies, ['tailwindcss', '@tailwindcss/vite']);
	const env = plan.changes.find((change) => change.path === '.env');
	assert.match(env.content, /AUTH_SECRET=secret/);
});

test('plan: never overwrites a config or schemas the app already has', () => {
	const dir = fakeApp(
		{
			'vite.config.ts': SV_VITE,
			'tsconfig.json': '{}',
			'aphex.config.ts': '// mine',
			'src/lib/schemaTypes/index.ts': '// mine'
		},
		{ ...kit2, dependencies: { '@aphexcms/cms-core': '^11.0.0', graphql: '^16.0.0' } }
	);
	const plan = buildPlan(detectApp(dir), defaults, 'secret');
	const actions = Object.fromEntries(plan.changes.map((change) => [change.path, change.action]));
	assert.equal(actions['aphex.config.ts'], 'keep');
	assert.equal(actions['src/lib/schemaTypes/index.ts'], 'keep');
	assert.ok(!plan.dependencies.includes('@aphexcms/cms-core'));
	assert.ok(!plan.dependencies.includes('graphql@16'));
});

test('blockers: Kit 3, Tailwind 3, no TypeScript and an existing admin route', () => {
	const dir = fakeApp(
		{ 'vite.config.ts': SV_VITE, 'src/routes/admin/+page.svelte': '' },
		{ devDependencies: { '@sveltejs/kit': '^3.0.0', svelte: '^5.0.0', tailwindcss: '^3.4.0' } }
	);
	const blockers = findBlockers(detectApp(dir)).join('\n');
	assert.match(blockers, /SvelteKit 3/);
	assert.match(blockers, /Tailwind 3/);
	assert.match(blockers, /tsconfig\.json/);
	assert.match(blockers, /src\/routes\/admin already exists/);
});
