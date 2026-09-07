import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig, loadEnv } from 'vite';
import { aphex } from '@aphexcms/cms-core/vite';
import { existsSync } from 'node:fs';

/*
 * Is this copy of the template running inside the Aphex monorepo?
 *
 * There, `@aphexcms/*` are `workspace:*` links resolving to source under
 * ../../packages, and Vite's dev server refuses to serve files outside the
 * project root — so it needs `fs.allow` widened to the repo root. A scaffolded
 * project installs those same packages from npm into its own node_modules and
 * needs nothing widened; leaving the option in would only grant its dev server
 * read access to two directories above the project, which on a developer's
 * machine is their whole workspace.
 *
 * Detected rather than stripped at sync time because this file is mirrored to
 * the standalone template repos verbatim — one file that behaves correctly in
 * both places beats two that drift.
 */
const inAphexMonorepo = existsSync(new URL('../../pnpm-workspace.yaml', import.meta.url));

export default defineConfig(({ mode }) => {
	/*
	 * Read `.env` here explicitly.
	 *
	 * SvelteKit loads `.env` into `process.env` for `$env/*`, but that happens
	 * *after* this config is evaluated — so `process.env.DEV_ALLOWED_HOSTS` is
	 * undefined at this point even when the variable is sitting in `.env`. The
	 * symptom is a tunnel that returns 403 from Vite's host check while the
	 * variable looks correctly set, which is a miserable thing to debug.
	 *
	 * The third argument is the prefix filter; `''` means "load everything", not
	 * just `VITE_`-prefixed names.
	 */
	const env = { ...loadEnv(mode, process.cwd(), ''), ...process.env };

	return {
		plugins: [sveltekit(), tailwindcss(), aphex()],
		optimizeDeps: {
			// Individual icon entrypoints are discovered incrementally by the admin.
			// Re-optimizing them during HMR deletes hashes the browser is still loading.
			exclude: ['@lucide/svelte']
		},
		server: {
			...(inAphexMonorepo ? { fs: { allow: ['../../'] } } : {}),
			// Extra Host headers the dev server will answer to, as a comma-separated
			// list — for tunnelling localhost to a public URL (cloudflared, ngrok) to
			// test webhooks or a phone. Env-driven rather than hardcoded: a tunnel
			// hostname is per-developer and per-session, and this file is synced into
			// the templates, so a literal here ships someone's dead tunnel to everyone.
			allowedHosts: (env.DEV_ALLOWED_HOSTS || '')
				.split(',')
				.map((host) => host.trim())
				.filter(Boolean)
		}
	};
});
