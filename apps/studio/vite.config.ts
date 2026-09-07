import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import { aphex } from '@aphexcms/cms-core/vite';

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
	 *
	 * Anchored to this file rather than `process.cwd()`: a task runner invoking the
	 * dev script from the repo root would otherwise look for `.env` there and find
	 * nothing, with the same silent 403 as the bug this fixes.
	 */
	const root = fileURLToPath(new URL('.', import.meta.url));
	const env = { ...loadEnv(mode, root, ''), ...process.env };

	return {
		plugins: [sveltekit(), tailwindcss(), aphex()],
		optimizeDeps: {
			// Individual icon entrypoints are discovered incrementally by the admin.
			// Re-optimizing them during HMR deletes hashes the browser is still loading.
			exclude: ['@lucide/svelte']
		},
		server: {
			// Monorepo-only: let Vite read source files outside apps/studio so it
			// can serve @aphexcms/* packages from packages/* during dev. Scaffolded
			// standalone apps don't need this.
			fs: {
				allow: ['../../']
			},
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
