import { defineConfig, type Plugin } from 'vitest/config';
import { loadEnv } from 'vite';
import { sveltekit } from '@sveltejs/kit/vite';

/**
 * `$env/dynamic/private` is only dynamic at runtime *in a server*: the SvelteKit
 * plugin bakes the values into the virtual module when the Vite config is
 * resolved, in the main process. Under Vitest that snapshot is taken before any
 * worker exists, so a per-fork `process.env` assignment in `tests/setup.ts` is
 * invisible to the app code that reads it — which is how every fork ended up
 * opening the *same* PGlite data dir and corrupting its indexes.
 *
 * In tests, make it genuinely dynamic: the live `process.env` of whichever fork
 * is asking, layered over the `.env` files the SvelteKit plugin would have read
 * (the main process never loads those itself — `tests/setup.ts` runs dotenv in
 * the workers only, so dropping them breaks `globalSetup`/teardown).
 */
function liveDynamicEnv(): Plugin {
	const id = '$env/dynamic/private';
	const resolved = '\0aphex-test:dynamic-private-env';
	// '' = every key, not just the public prefix; this module is the private one.
	const fromFiles = loadEnv('test', process.cwd(), '');
	return {
		name: 'aphex-test-live-dynamic-env',
		enforce: 'pre',
		resolveId: (source) => (source === id ? resolved : null),
		load: (loadId) =>
			loadId === resolved
				? `const files = ${JSON.stringify(fromFiles)};
export const env = new Proxy({}, {
	get: (_, key) => (typeof key === 'string' ? process.env[key] ?? files[key] : undefined),
	has: (_, key) => typeof key === 'string' && (key in process.env || key in files),
	ownKeys: () => [...new Set([...Object.keys(files), ...Object.keys(process.env)])],
	getOwnPropertyDescriptor: () => ({ enumerable: true, configurable: true })
});`
				: null
	};
}

export default defineConfig({
	plugins: [liveDynamicEnv(), sveltekit()],
	test: {
		include: ['tests/**/*.{test,spec}.{js,ts}'],
		globals: true,
		environment: 'node',
		setupFiles: ['tests/setup.ts'],
		globalSetup: ['tests/teardown.ts'],
		// The sqlite adapter loads `drizzle-kit/api` at runtime to run migrations.
		// It ships as one big prebundled .mjs that Vitest's SSR transform rewrites
		// into invalid JS (`__vite_ssr_import_22__.default:` → "Unexpected token ':'").
		// Load it natively instead of transforming it.
		server: { deps: { external: ['drizzle-kit'] } },
		// Every fork builds its own copy of the module graph *and*, on the embedded
		// drivers, its own PGlite — an in-process Postgres. Unbounded, Vitest sizes
		// the pool to the core count, so a 16-core machine starts sixteen of them
		// and the run gets OOM-killed (exit 137) rather than failing a test.
		//
		// Four is enough to keep the suite parallel without letting memory scale
		// with the developer's core count. Raise it with APHEX_TEST_MAX_FORKS on a
		// machine with headroom.
		pool: 'forks',
		poolOptions: {
			forks: {
				maxForks: Number(process.env.APHEX_TEST_MAX_FORKS) || 4
			}
		}
	},
	resolve: {
		alias: {
			$lib: '/src/lib'
		}
	}
});
