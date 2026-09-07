import { mdsvex } from 'mdsvex';
import adapterAuto from '@sveltejs/adapter-auto';
import adapterNode from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { existsSync } from 'node:fs';

/*
 * Is this copy of the template running inside the Aphex monorepo?
 *
 * There, `@aphexcms/ui` resolves to workspace *source*, whose components import
 * each other through that package's own `@lib` alias — so a consumer has to
 * declare it or nothing renders. A scaffolded project installs `@aphexcms/ui`
 * from npm and gets `dist`, where `svelte-package` has already rewritten `@lib`
 * to relative paths; there the alias resolves to `../../packages/ui/src/lib`,
 * two directories above the project, which does not exist.
 *
 * Detected rather than stripped at sync time because this file is mirrored to
 * the standalone template repos verbatim — one file that behaves correctly in
 * both places beats two that drift. Same reasoning as `server.fs.allow` in
 * vite.config.ts.
 */
const inAphexMonorepo = existsSync(new URL('../../pnpm-workspace.yaml', import.meta.url));

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: [vitePreprocess(), mdsvex()],
	kit: {
		adapter: process.env.ADAPTER === 'node' ? adapterNode() : adapterAuto(),
		...(inAphexMonorepo
			? {
					alias: {
						'@lib': '../../packages/ui/src/lib',
						'@lib/*': '../../packages/ui/src/lib/*'
					}
				}
			: {})
	},
	extensions: ['.svelte', '.svx']
};

export default config;
