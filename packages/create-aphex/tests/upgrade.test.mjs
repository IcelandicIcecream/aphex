import assert from 'node:assert/strict';
import {
	cpSync,
	mkdirSync,
	mkdtempSync,
	readFileSync,
	rmSync,
	symlinkSync,
	writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { detectApp } from '../dist/init/detect.js';
import {
	addAuthPagesPath,
	aphexOwnsLocalsAuth,
	blobId,
	buildUpgradePlan,
	isKnownVersion,
	dropVerifyEmailPath,
	moveLoginUrl,
	pointResetLinkAtAdmin,
	removeInvitationHook,
	renameLocalsAuth
} from '../dist/upgrade/plan.js';

const here = dirname(fileURLToPath(import.meta.url));
const template = join(here, '../../../templates/base');

/** A copy of the parts of templates/base the upgrade looks at. */
function oldApp(edit) {
	const dir = mkdtempSync(join(tmpdir(), 'aphex-upgrade-'));
	for (const path of [
		'package.json',
		'tsconfig.json',
		'vite.config.ts',
		'aphex.config.ts',
		'src'
	]) {
		cpSync(join(template, path), join(dir, path), { recursive: true });
	}
	edit?.(dir);
	return dir;
}

const actions = (plan) =>
	Object.fromEntries(plan.changes.map((change) => [change.path, change.action]));

test('blobId matches git', () => {
	// `git hash-object` of "hello\n".
	assert.equal(blobId(Buffer.from('hello\n')), 'ce013625030ba8dba906f756967f9e9ca394464a');
});

test('a shipped file is known, an edited one is not, CRLF counts as shipped', () => {
	const path = 'src/routes/login/+page.svelte';
	const content = readFileSync(join(template, path));
	assert.equal(isKnownVersion(path, content), true);
	assert.equal(isKnownVersion(path, Buffer.concat([content, Buffer.from('\n')])), false);
	assert.equal(isKnownVersion(path, Buffer.from(content.toString().replace(/\n/g, '\r\n'))), true);
	assert.equal(isKnownVersion('src/routes/nope.svelte', content), false);
});

test('the untouched template loses every route core serves', () => {
	const plan = buildUpgradePlan(detectApp(oldApp()));
	const a = actions(plan);
	assert.equal(a['src/routes/login/+page.svelte'], 'delete');
	assert.equal(a['src/routes/(protected)/admin/+layout.svelte'], 'delete');
	assert.equal(a['src/routes/god-mode/+page.svelte'], 'delete');
	assert.equal(a['src/routes/media/[id]/[filename]/+server.ts'], 'delete');
	assert.equal(a['src/lib/server/email/invitation-hook.ts'], 'delete');
	assert.equal(a['src/routes/admin/[...path]/+page.svelte'], 'create');
	assert.equal(a['src/lib/aphex.client.ts'], 'create');
	assert.equal(a['aphex.config.ts'], 'update');
	assert.equal(a['src/lib/server/auth/index.ts'], 'update');
	// The site and anything else the app wrote stay.
	assert.equal(a['src/routes/(site)/+page.svelte'], undefined);
	assert.equal(a['src/routes/mcp/+server.ts'], undefined);
	assert.deepEqual(plan.kept, []);

	const config = plan.changes.find((change) => change.path === 'aphex.config.ts').content;
	assert.match(config, /loginUrl: '\/admin\/login'/);
	assert.doesNotMatch(config, /registerInvitationEmailHook/);
});

test('an edited login page keeps every sign-in page and the old loginUrl', () => {
	const dir = oldApp((dir) => {
		const path = join(dir, 'src/routes/login/+page.svelte');
		writeFileSync(path, `${readFileSync(path, 'utf8')}\n<!-- ours -->\n`);
	});
	const plan = buildUpgradePlan(detectApp(dir));
	const a = actions(plan);
	assert.equal(a['src/routes/login/+page.svelte'], undefined);
	assert.equal(a['src/routes/reset-password/[token]/+page.svelte'], undefined);
	assert.deepEqual(
		plan.kept.map((kept) => [kept.unit.label, kept.edited.map((file) => file.path)]),
		[['sign-in pages', ['src/routes/login/+page.svelte']]]
	);
	// The sign-in pages still use these, so they stay.
	assert.equal(a['src/lib/auth-client.ts'], undefined);
	assert.equal(a['src/lib/components/PasswordInput.svelte'], undefined);
	// The rest still goes.
	assert.equal(a['src/routes/god-mode/+page.svelte'], 'delete');
	const config = plan.changes.find((change) => change.path === 'aphex.config.ts').content;
	assert.match(config, /loginUrl: '\/login'/);
	assert.equal(a['src/lib/server/auth/index.ts'], undefined);
});

test('a helper the app imports elsewhere stays', () => {
	const dir = oldApp((dir) => {
		mkdirSync(join(dir, 'src/routes/(site)/account'), { recursive: true });
		writeFileSync(
			join(dir, 'src/routes/(site)/account/+page.svelte'),
			'<script lang="ts">\n\timport { authClient } from \'$lib/auth-client\';\n</script>\n'
		);
	});
	const a = actions(buildUpgradePlan(detectApp(dir)));
	assert.equal(a['src/lib/auth-client.ts'], undefined);
	assert.equal(a['src/lib/stores/activeTab.svelte.ts'], 'delete');
});

test('an already upgraded app has nothing to do', () => {
	const dir = oldApp();
	for (const change of buildUpgradePlan(detectApp(dir)).changes) {
		const full = join(dir, change.path);
		if (change.action === 'delete') rmSync(full);
		if (change.action === 'create' || change.action === 'update') {
			mkdirSync(dirname(full), { recursive: true });
			writeFileSync(full, change.content);
		}
	}
	const again = buildUpgradePlan(detectApp(dir));
	assert.deepEqual(
		again.changes.map((change) => `${change.action} ${change.path}`),
		[]
	);
});

/** An app on the embedded admin, upgraded from the template. */
function upgradedApp() {
	const dir = oldApp();
	for (const change of buildUpgradePlan(detectApp(dir)).changes) {
		const full = join(dir, change.path);
		if (change.action === 'delete') rmSync(full);
		if (change.action === 'create' || change.action === 'update') {
			mkdirSync(dirname(full), { recursive: true });
			writeFileSync(full, change.content);
		}
	}
	return dir;
}

const earlyLayout = `<script lang="ts">
	import { Sidebar } from '@aphexcms/cms-core/client/ui';
	let { data, children } = $props();
</script>

<Sidebar data={{ branding: { title: 'InvoiceAU' } }}>{@render children()}</Sidebar>
`;

const earlyPage = `<script lang="ts">
	import { AphexStudio } from '@aphexcms/cms-core/client';
	import { aphexClient } from '$lib/aphex.client';
	import { activeTabState } from '$lib/stores/activeTab.svelte';

	let { data } = $props();
	function handleTabChange(value: string) {
		activeTabState.value = value;
	}
</script>

<AphexStudio {data} config={aphexClient} activeTab={activeTabState} {handleTabChange} />
`;

test('an early embedded app: its sidebar layout is offered for replacing, its page and title are fixed', () => {
	const dir = upgradedApp();
	writeFileSync(join(dir, 'src/routes/admin/+layout.svelte'), earlyLayout);
	writeFileSync(
		join(dir, 'src/routes/admin/+layout.server.ts'),
		'export const load = () => ({});\n'
	);
	writeFileSync(join(dir, 'src/routes/admin/[...path]/+page.svelte'), earlyPage);
	const client = join(dir, 'src/lib/aphex.client.ts');
	writeFileSync(
		client,
		readFileSync(client, 'utf8').replace(
			'adminAuthClient\n',
			"adminAuthClient,\n\ttitle: 'Aphex CMS'\n"
		)
	);

	const plan = buildUpgradePlan(detectApp(dir));
	assert.deepEqual(
		plan.kept.map((kept) => [kept.unit.label, kept.edited.map((file) => file.path).sort()]),
		[['admin layout', ['src/routes/admin/+layout.server.ts', 'src/routes/admin/+layout.svelte']]]
	);
	const byPath = Object.fromEntries(plan.changes.map((change) => [change.path, change]));
	const page = byPath['src/routes/admin/[...path]/+page.svelte'];
	assert.equal(page.action, 'update');
	assert.match(page.content, /^<AphexStudio \{data\} config=\{aphexClient\} \/>$/m);
	assert.doesNotMatch(page.content, /activeTab/);
	assert.equal(byPath['src/lib/aphex.client.ts'].action, 'update');
	assert.doesNotMatch(byPath['src/lib/aphex.client.ts'].content, /title/);
	assert.match(byPath['src/lib/aphex.client.ts'].content, /adminAuthClient\n\};/);

	const replaced = buildUpgradePlan(detectApp(dir), { replace: new Set(['admin layout']) });
	const a = actions(replaced);
	assert.equal(a['src/routes/admin/+layout.svelte'], 'delete');
	assert.equal(a['src/routes/admin/+layout.server.ts'], 'delete');
	assert.equal(a['src/routes/admin/[...path]/+page.svelte'], 'update');
});

test('a hand-written Better Auth adminAuthClient without signOut gives way to the packaged one', () => {
	const dir = upgradedApp();
	writeFileSync(
		join(dir, 'src/lib/auth-client.ts'),
		"import { createAuthClient } from 'better-auth/svelte';\nexport const authClient = createAuthClient();\n"
	);
	writeFileSync(
		join(dir, 'src/lib/admin-auth-client.ts'),
		"import { authClient } from './auth-client';\nexport const adminAuthClient = {\n\tsignIn: (input) => authClient.signIn.email(input)\n};\n"
	);
	const client = join(dir, 'src/lib/aphex.client.ts');
	writeFileSync(
		client,
		readFileSync(client, 'utf8').replace(
			"from '@aphexcms/auth/client';",
			"from '$lib/admin-auth-client';"
		)
	);
	const plan = buildUpgradePlan(detectApp(dir));
	const update = plan.changes.find((change) => change.path === 'src/lib/aphex.client.ts');
	assert.equal(update?.action, 'update');
	assert.match(update.content, /import \{ adminAuthClient \} from '@aphexcms\/auth\/client';/);
	assert.ok(plan.packages.includes('@aphexcms/auth'));

	// One that signs out is the app's own choice.
	writeFileSync(
		join(dir, 'src/lib/admin-auth-client.ts'),
		"import { authClient } from './auth-client';\nexport const adminAuthClient = {\n\tsignOut: () => authClient.signOut()\n};\n"
	);
	assert.equal(
		buildUpgradePlan(detectApp(dir)).changes.some(
			(change) => change.path === 'src/lib/aphex.client.ts'
		),
		false
	);
});

test('an admin layout of the app’s own, without Aphex’s sidebar, is left alone', () => {
	const dir = upgradedApp();
	writeFileSync(
		join(dir, 'src/routes/admin/+layout.svelte'),
		'<script lang="ts">\n\tlet { children } = $props();\n</script>\n\n<div class="admin">{@render children()}</div>\n'
	);
	const plan = buildUpgradePlan(detectApp(dir));
	assert.deepEqual(plan.kept, []);
	assert.deepEqual(plan.changes, []);
});

test('an app that builds Better Auth itself: reset link moves under /admin, verifyEmailPath goes', () => {
	const source = `sendResetPassword: async ({ user, token }) => {
	const resetUrl = \`\${baseUrl}/reset-password/\${token}\`;
},
emailVerification: {
	verifyEmailPath: '/verify-email',
	sendVerificationEmail: async () => {}
}
`;
	const reset = pointResetLinkAtAdmin(source);
	assert.equal(reset.kind, 'patched');
	assert.match(reset.code, /\$\{baseUrl\}\/admin\/reset-password\/\$\{token\}/);
	assert.equal(pointResetLinkAtAdmin(reset.code).kind, 'unchanged');
	const verify = dropVerifyEmailPath(source);
	assert.equal(verify.kind, 'patched');
	assert.doesNotMatch(verify.code, /verifyEmailPath/);
	assert.match(verify.code, /emailVerification: \{\n\tsendVerificationEmail/);
});

test('a package kept under src/ with its own node_modules and a dangling link is skipped', () => {
	const dir = oldApp((dir) => {
		const modules = join(dir, 'src/plugins/plato/node_modules/@aphexcms');
		mkdirSync(modules, { recursive: true });
		symlinkSync(join(dir, 'nowhere'), join(modules, 'cms-core'));
		writeFileSync(join(dir, 'src/plugins/plato/index.ts'), "export const plato = 'plato';\n");
	});
	const plan = buildUpgradePlan(detectApp(dir));
	assert.ok(plan.changes.length > 0);
});

test('removeInvitationHook drops the import and the api option', () => {
	const source = `import { a } from 'a';
import { registerInvitationEmailHook } from './src/lib/server/email/invitation-hook';

export default createCMSConfig({
	schemaTypes,

	// Wrap built-in handlers.
	api: (app) => {
		registerInvitationEmailHook(app);
	}
});
`;
	const result = removeInvitationHook(source);
	assert.equal(result.kind, 'patched');
	assert.equal(
		result.code,
		`import { a } from 'a';

export default createCMSConfig({
	schemaTypes
});
`
	);
});

test('removeInvitationHook keeps the rest of an api option', () => {
	const result = removeInvitationHook(`import { registerInvitationEmailHook } from './x';
export default createCMSConfig({
	api: (app) => {
		registerInvitationEmailHook(app);
		app.use(other);
	}
});
`);
	assert.equal(result.kind, 'patched');
	assert.match(result.code, /app\.use\(other\);/);
	assert.doesNotMatch(result.code, /registerInvitationEmailHook/);
});

test('moveLoginUrl and addAuthPagesPath', () => {
	assert.equal(
		moveLoginUrl("auth: { loginUrl: '/login' }").code,
		"auth: { loginUrl: '/admin/login' }"
	);
	assert.equal(moveLoginUrl('auth: aphexAuth({ secret })').kind, 'unchanged');
	assert.equal(moveLoginUrl("auth: { loginUrl: '/signin' }").kind, 'manual');

	const auth = addAuthPagesPath('createAphexAuth({\n\tsecret,\n});\n');
	assert.equal(
		auth.code,
		"createAphexAuth({\n\t// Core serves the password reset page under /admin.\n\tauthPagesPath: '/admin',\n\tsecret,\n});\n"
	);
	assert.equal(addAuthPagesPath('createAphexAuth(options)').kind, 'manual');
});

test('locals.auth is renamed only when app.d.ts says it is Aphex’s', () => {
	const aphex =
		"import type { Auth } from '@aphexcms/cms-core/server';\ninterface Locals { auth?: Auth }";
	assert.equal(aphexOwnsLocalsAuth(aphex), true);
	assert.equal(
		aphexOwnsLocalsAuth(
			"import type { Session } from '@auth/sveltekit';\ninterface Locals { auth: () => Session }"
		),
		false
	);
	assert.equal(
		renameLocalsAuth('const a = locals.auth; locals.authorize(); event.locals.auth?.type').code,
		'const a = locals.aphexAuth; locals.authorize(); event.locals.aphexAuth?.type'
	);
});

test('app.d.ts: adds only what Locals lacks, and no second import of a type', async () => {
	const { patchAppDts } = await import('../dist/init/patch.js');
	const source = `import type { CMSInstances, Auth } from '@aphexcms/cms-core/server';
declare global {
	namespace App {
		interface Locals {
			aphexCMS: CMSInstances;
			auth?: Auth;
		}
	}
}
export {};
`;
	const result = patchAppDts(source);
	assert.equal(result.kind, 'patched');
	assert.equal(
		result.code,
		`import '@aphexcms/cms-core/app-augment';
import type { CMSInstances, Auth } from '@aphexcms/cms-core/server';
declare global {
	namespace App {
		interface Locals {
			aphexAuth?: Auth;
			aphexCMS: CMSInstances;
			auth?: Auth;
		}
	}
}
export {};
`
	);
	assert.equal((result.code.match(/aphexCMS:/g) ?? []).length, 1);
});

test('vite config: adds aphex() without reprinting the file', async () => {
	const { appendToPlugins, patchViteConfig } = await import('../dist/init/patch.js');
	const source = `export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit(),
		{
			name: 'x', // a ] in a comment
			configureServer() {}
		}
	]
});
`;
	const result = patchViteConfig(source, false);
	assert.equal(result.kind, 'patched');
	assert.equal(
		result.code,
		`import { aphex } from '@aphexcms/cms-core/vite';\n${source.replace('\t\t}\n\t]', '\t\t},\n\t\taphex()\n\t]')}`
	);
	assert.equal(
		appendToPlugins('plugins: [sveltekit()]', 'aphex()'),
		'plugins: [sveltekit(), aphex()]'
	);
	assert.equal(appendToPlugins('plugins: []', 'aphex()'), 'plugins: [aphex()]');
	assert.equal(appendToPlugins('plugins: getPlugins()', 'aphex()'), undefined);
});

test('a kept folder says which lines are the person’s own, and can be replaced on request', async () => {
	const { describeEdit } = await import('../dist/upgrade/plan.js');
	const dir = oldApp((dir) => {
		const path = join(dir, 'src/routes/login/+page.svelte');
		const source = readFileSync(path, 'utf8').replace(
			'</svelte:head>',
			'\t<meta name="robots" content="noindex, nofollow" />\n</svelte:head>'
		);
		writeFileSync(path, source);
		writeFileSync(join(dir, 'src/routes/login/notes.md'), 'ours\n');
	});
	const plan = buildUpgradePlan(detectApp(dir));
	assert.deepEqual(plan.kept[0].edited, [
		{
			path: 'src/routes/login/+page.svelte',
			ownLines: ['\t<meta name="robots" content="noindex, nofollow" />'],
			added: false
		},
		{ path: 'src/routes/login/notes.md', ownLines: [], added: true }
	]);
	assert.deepEqual(describeEdit('src/routes/login/+page.svelte', 'import x;\n').ownLines, [
		'import x;'
	]);

	const replaced = buildUpgradePlan(detectApp(dir), { replace: new Set(['sign-in pages']) });
	assert.deepEqual(replaced.kept, []);
	const a = actions(replaced);
	assert.equal(a['src/routes/login/+page.svelte'], 'delete');
	assert.equal(a['src/routes/login/notes.md'], 'delete');
	assert.equal(a['src/lib/server/auth/index.ts'], 'update');
});

test('patched Aphex packages are found in package.json and pnpm-workspace.yaml', async () => {
	const { aphexPatches } = await import('../dist/upgrade/plan.js');
	const dir = mkdtempSync(join(tmpdir(), 'aphex-patches-'));
	writeFileSync(
		join(dir, 'package.json'),
		JSON.stringify({
			pnpm: {
				patchedDependencies: {
					'@aphexcms/cms-core@11.3.0': 'patches/@aphexcms__cms-core@11.3.0.patch',
					's3mini@1.0.1': 'patches/s3mini@1.0.1.patch'
				}
			}
		})
	);
	writeFileSync(
		join(dir, 'pnpm-workspace.yaml'),
		"packages:\n  - '.'\npatchedDependencies:\n  '@aphexcms/ui@0.8.7': patches/ui.patch\n  other@1.0.0: patches/other.patch\n"
	);
	assert.deepEqual(aphexPatches(dir), [
		{ dependency: '@aphexcms/cms-core@11.3.0', file: 'patches/@aphexcms__cms-core@11.3.0.patch' },
		{ dependency: '@aphexcms/ui@0.8.7', file: 'patches/ui.patch' }
	]);
});
