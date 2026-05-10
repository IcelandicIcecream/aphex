import { createRequire } from 'node:module';
import type { Plugin, ViteDevServer } from 'vite';

export interface AphexHMROptions {
	/**
	 * Path segment that identifies schema files (matched against the file path).
	 * Defaults to `/schemaTypes/`.
	 */
	schemaDir?: string;
	/**
	 * Filename of the CMS config (matched as a suffix on the changed path).
	 * Defaults to `aphex.config.ts`.
	 */
	configFile?: string;
	/**
	 * Debounce window in ms before reacting to a schema change.
	 * Editors that do atomic saves fire multiple chokidar events in quick
	 * succession; debouncing collapses them into a single reload.
	 * Defaults to 150.
	 */
	debounceMs?: number;
	/**
	 * How to refresh the CMS engine on schema change.
	 * - `'swap'` (default): re-load `aphex.config.ts` via Vite's SSR loader and
	 *   hand it to cms-core's HMR setter. The Vite dev server keeps running;
	 *   only the engine's config is replaced. ~10x faster than restart.
	 * - `'restart'`: tear down and rebuild the Vite dev server. Slower but
	 *   guarantees every server module re-evaluates from scratch.
	 */
	mode?: 'swap' | 'restart';
}

export interface AphexOptions {
	/** HMR plugin options. Pass `false` to disable schema HMR. */
	hmr?: AphexHMROptions | false;
	/** Disable the dayjs ESM alias redirect. */
	dayjs?: boolean;
	/** Disable the SSR noExternal/external defaults for cms-core/ui packages. */
	ssr?: boolean;
	/** Disable the optimizeDeps include/exclude defaults. */
	optimizeDeps?: boolean;
	/** Disable the watch unfilter for in-monorepo Aphex package edits. */
	watch?: boolean;
}

const require = createRequire(import.meta.url);

/**
 * Watches the CMS config and schema files in dev. When any of them change,
 * the plugin re-loads `aphex.config.ts` via Vite's SSR loader (so the fresh
 * module re-runs the schema imports) and hands the new config to cms-core's
 * `__notifyAphexConfigChanged()` setter — the engine then re-initializes on
 * the next request without restarting the Vite dev server.
 *
 * Why this works without races:
 * - `server.ssrLoadModule` is Vite's official re-eval path, no cache-bust hacks
 * - The plugin and the running SvelteKit hook share the same cms-core module
 *   instance through Vite's module graph, so the setter mutates the same
 *   `activeConfig` the hook reads on each request
 * - A single mutation point (`__notifyAphexConfigChanged`) replaces the old
 *   global dirty-flag protocol; no two-step set-then-read race window
 *
 * Falls back to `server.restart()` automatically if the swap throws (e.g.
 * the user introduced a syntax error in their schema). `mode: 'restart'`
 * forces the slower-but-most-correct path on every change.
 */
export function aphexHMR(options: AphexHMROptions = {}): Plugin {
	const schemaDir = options.schemaDir ?? '/schemaTypes/';
	const configFile = options.configFile ?? 'aphex.config.ts';
	const debounceMs = options.debounceMs ?? 150;
	const mode = options.mode ?? 'swap';

	return {
		name: 'aphex:hmr',
		configureServer(server: ViteDevServer) {
			const { watcher, ws } = server;

			function isReloadTarget(file: string): boolean {
				const normalized = file.replace(/\\/g, '/');
				return (
					(normalized.includes(schemaDir) && normalized.endsWith('.ts')) ||
					normalized.endsWith(`/${configFile}`)
				);
			}

			async function swapSchemas(file: string): Promise<void> {
				const start = Date.now();
				const configPath = `${server.config.root}/${configFile}`;

				// Invalidate the changed file + the config + the schemaTypes barrel
				// so ssrLoadModule re-evaluates with the new disk contents.
				for (const path of [file, configPath]) {
					const mods = server.moduleGraph.getModulesByFile(path);
					mods?.forEach((mod) => server.moduleGraph.invalidateModule(mod));
				}

				const configMod = await server.ssrLoadModule(configPath);
				const freshConfig = configMod.default;
				if (!freshConfig) {
					throw new Error(`${configFile} did not export a default config`);
				}

				const cmsCore = await server.ssrLoadModule('@aphexcms/cms-core/server');
				if (typeof cmsCore.__notifyAphexConfigChanged !== 'function') {
					throw new Error(
						'cms-core does not expose __notifyAphexConfigChanged — upgrade @aphexcms/cms-core'
					);
				}

				cmsCore.__notifyAphexConfigChanged(freshConfig);
				ws.send({ type: 'full-reload' });
				console.log(`🔄 CMS schemas hot-swapped (${Date.now() - start}ms): ${file}`);
			}

			let pending: NodeJS.Timeout | null = null;
			let lastFile = '';

			function scheduleReload(file: string) {
				lastFile = file;
				if (pending) clearTimeout(pending);
				pending = setTimeout(async () => {
					pending = null;
					if (mode === 'restart') {
						console.log(`🔄 CMS schema change → restarting dev server: ${lastFile}`);
						server.restart().catch((err) => {
							console.error('[aphex] dev server restart failed:', err);
						});
						return;
					}
					try {
						await swapSchemas(lastFile);
					} catch (err) {
						console.error('[aphex] hot-swap failed, falling back to restart:', err);
						server.restart().catch((err) => {
							console.error('[aphex] dev server restart failed:', err);
						});
					}
				}, debounceMs);
			}

			for (const event of ['change', 'add', 'unlink'] as const) {
				watcher.on(event, (file) => {
					if (isReloadTarget(file)) scheduleReload(file);
				});
			}
		}
	};
}

/**
 * Redirects `dayjs` and `dayjs/plugin/*` imports to dayjs's ESM build.
 *
 * dayjs 1.x ships a UMD `main` (`dayjs.min.js`) with no `exports` map or
 * `module` field. When imports originate inside a package excluded from
 * Vite's pre-bundling (e.g. `@aphexcms/cms-core`), Vite serves the raw UMD
 * — which has no ESM `default` export — and the browser blows up with
 * "does not provide an export named 'default'". This alias guarantees every
 * dayjs import resolves to the proper ESM build.
 */
function aphexDayjsAlias(): Plugin {
	return {
		name: 'aphex:dayjs-alias',
		config() {
			const dayjsEsm = require.resolve('dayjs/esm/index.js');
			const dayjsEsmPluginDir = dayjsEsm
				.replace(/\\index\.js$/, '\\plugin')
				.replace(/\/index\.js$/, '/plugin');
			return {
				resolve: {
					alias: [
						{ find: /^dayjs$/, replacement: dayjsEsm },
						{
							find: /^dayjs\/plugin\/([^/]+?)(\.js)?$/,
							replacement: `${dayjsEsmPluginDir}/$1/index.js`
						}
					]
				}
			};
		}
	};
}

/**
 * SSR config: cms-core and ui packages re-export `.svelte` components through
 * their entry barrels — Vite must bundle them for SSR. If they are externalised,
 * Node's native ESM loader tries to resolve the raw `.svelte` files directly
 * and throws ERR_UNKNOWN_FILE_EXTENSION (the `svelte` export condition is only
 * honoured by Vite, not by Node).
 *
 * sharp/graphql/graphql-yoga are native or large CJS deps that should stay
 * external — bundling them breaks Node's native bindings or balloons the SSR
 * bundle.
 */
function aphexSSR(): Plugin {
	return {
		name: 'aphex:ssr',
		config() {
			return {
				ssr: {
					noExternal: ['@aphexcms/ui', '@aphexcms/cms-core'],
					external: ['sharp', 'graphql', 'graphql-yoga']
				}
			};
		}
	};
}

/**
 * optimizeDeps tuning: exclude the Aphex Svelte packages from esbuild
 * pre-bundling (esbuild can't transform `.svelte` files; vite-plugin-svelte
 * handles them at transform time instead), and pre-bundle their transitive
 * deps that Vite would otherwise discover lazily at runtime — which causes
 * full-page reloads when the user first navigates to a route that triggers
 * a new dep.
 */
function aphexOptimizeDeps(): Plugin {
	return {
		name: 'aphex:optimize-deps',
		config() {
			return {
				optimizeDeps: {
					exclude: ['sharp', '@aphexcms/ui', '@aphexcms/cms-core'],
					include: [
						'tailwind-variants',
						'tailwind-merge',
						'@internationalized/date',
						'bits-ui',
						'dayjs',
						'dayjs/plugin/customParseFormat',
						'dayjs/plugin/customParseFormat.js',
						'dayjs/plugin/utc',
						'dayjs/plugin/utc.js',
						'@lucide/svelte',
						'@lucide/svelte/icons/panel-left',
						'@lucide/svelte/icons/minus',
						'@lucide/svelte/icons/circle',
						'@lucide/svelte/icons/chevron-right',
						'@lucide/svelte/icons/search',
						'@lucide/svelte/icons/bot',
						'@lucide/svelte/icons/calendar',
						'@lucide/svelte/icons/check',
						'@lucide/svelte/icons/chevron-down',
						'@lucide/svelte/icons/chevron-left',
						'@lucide/svelte/icons/chevron-up',
						'@lucide/svelte/icons/chevrons-up-down',
						'@lucide/svelte/icons/circle-check',
						'@lucide/svelte/icons/info',
						'@lucide/svelte/icons/loader-2',
						'@lucide/svelte/icons/octagon-x',
						'@lucide/svelte/icons/plus',
						'@lucide/svelte/icons/triangle-alert',
						'@lucide/svelte/icons/x',
						'better-auth/client/plugins',
						'better-auth/svelte',
						'mode-watcher',
						'svelte-sonner',
						'@aphexcms/cms-core > @dnd-kit/helpers',
						'@aphexcms/cms-core > @dnd-kit/svelte',
						'@aphexcms/cms-core > @dnd-kit/svelte/sortable',
						'@aphexcms/cms-core > dayjs',
						'@aphexcms/cms-core > dayjs/plugin/customParseFormat',
						'@aphexcms/cms-core > dayjs/plugin/customParseFormat.js',
						'@aphexcms/cms-core > dayjs/plugin/utc',
						'@aphexcms/cms-core > dayjs/plugin/utc.js'
					]
				}
			};
		}
	};
}

/**
 * Vite's default watcher ignores `node_modules`. In a workspace setup where
 * Aphex packages are linked from `node_modules/@aphexcms/*`, edits to those
 * source files won't trigger HMR unless we explicitly un-ignore them.
 */
function aphexWatchUnfilter(): Plugin {
	return {
		name: 'aphex:watch-unfilter',
		config() {
			return {
				server: {
					watch: {
						ignored: [
							'!**/node_modules/@aphexcms/cms-core/**',
							'!**/node_modules/@aphexcms/ui/**'
						]
					}
				}
			};
		}
	};
}

/**
 * One-stop Vite plugin for AphexCMS apps. Bundles:
 *
 * - schema HMR (restart-on-change)
 * - dayjs ESM alias redirect
 * - SSR noExternal/external defaults for cms-core/ui packages
 * - optimizeDeps tuning so first-render isn't slowed by lazy dep discovery
 * - watcher un-ignore for in-monorepo Aphex package edits
 *
 * Each piece can be opted out individually. Returns an array of plugins so
 * Vite can attach each one separately and keep diagnostics readable.
 *
 * Usage:
 *
 * ```ts
 * // vite.config.ts
 * import { aphex } from '@aphexcms/cms-core/vite';
 *
 * export default defineConfig({
 *   plugins: [tailwindcss(), sveltekit(), aphex()]
 * });
 * ```
 */
export function aphex(options: AphexOptions = {}): Plugin[] {
	const plugins: Plugin[] = [];

	if (options.hmr !== false) {
		plugins.push(aphexHMR(options.hmr ?? {}));
	}
	if (options.dayjs !== false) {
		plugins.push(aphexDayjsAlias());
	}
	if (options.ssr !== false) {
		plugins.push(aphexSSR());
	}
	if (options.optimizeDeps !== false) {
		plugins.push(aphexOptimizeDeps());
	}
	if (options.watch !== false) {
		plugins.push(aphexWatchUnfilter());
	}

	return plugins;
}
