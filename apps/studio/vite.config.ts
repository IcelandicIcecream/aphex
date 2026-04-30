import { createRequire } from 'node:module';
import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

const require = createRequire(import.meta.url);
const dayjsEsm = require.resolve('dayjs/esm/index.js');
const dayjsEsmPluginDir = dayjsEsm.replace(/\/index\.js$/, '/plugin');

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit(),
		{
			name: 'schema-reload',
			configureServer(server) {
				const { watcher, ws } = server;

				// Trigger a full CMS re-init when a schema or the CMS config changes.
				// Listening to add/change/unlink covers editors that do atomic saves
				// (rename-over-write) — chokidar reports those as unlink+add, so
				// `change`-only misses them and the old schema stays cached.
				function isReloadTarget(file: string): boolean {
					const normalized = file.replace(/\\/g, '/');
					return (
						(normalized.includes('/schemaTypes/') && normalized.endsWith('.ts')) ||
						normalized.endsWith('/aphex.config.ts')
					);
				}

				function invalidateSchemaGraph(file: string) {
					console.log(`🔄 CMS schema reload: ${file}`);

					// Changed file itself
					const changedMod = server.moduleGraph.getModulesByFile(file);
					changedMod?.forEach((mod) => server.moduleGraph.invalidateModule(mod));

					// aphex.config.ts + anything that imports it
					const configPath = server.config.root + '/aphex.config.ts';
					const configMods = server.moduleGraph.getModulesByFile(configPath);
					configMods?.forEach((mod) => {
						server.moduleGraph.invalidateModule(mod);
						mod.importers.forEach((importer) => server.moduleGraph.invalidateModule(importer));
					});

					// schemaTypes barrel
					const indexPath = server.config.root + '/src/lib/schemaTypes/index.ts';
					const indexMods = server.moduleGraph.getModulesByFile(indexPath);
					indexMods?.forEach((mod) => {
						server.moduleGraph.invalidateModule(mod);
						mod.importers.forEach((importer) => server.moduleGraph.invalidateModule(importer));
					});

					// Flag the server-side CMS hook to rebuild cmsInstances on next req
					(global as any).__aphexSchemasDirty = true;

					// Full reload so the browser picks up fresh schemas on the client too
					ws.send({ type: 'full-reload' });
				}

				for (const event of ['change', 'add', 'unlink'] as const) {
					watcher.on(event, (file) => {
						if (isReloadTarget(file)) invalidateSchemaGraph(file);
					});
				}
			}
		}
	],
	resolve: {
		// dayjs 1.x ships a UMD main (`dayjs.min.js`) with no `exports` map or
		// `module` field. When imports originate inside an excluded package
		// (e.g. `@aphexcms/cms-core` via `optimizeDeps.exclude`), Vite serves the
		// raw UMD file — which has no ESM `default` export — and the browser
		// blows up with "does not provide an export named 'default'". Redirect
		// to dayjs's proper ESM build so those imports work regardless of which
		// package they come from.
		alias: [
			{ find: /^dayjs$/, replacement: dayjsEsm },
			{ find: /^dayjs\/plugin\/([^/]+?)(\.js)?$/, replacement: `${dayjsEsmPluginDir}/$1/index.js` }
		]
	},
	server: {
		fs: {
			allow: ['../../']
		},
		watch: {
			ignored: ['!**/node_modules/@aphexcms/cms-core/**', '!**/node_modules/@aphexcms/ui/**']
		}
	},
	ssr: {
		// `@aphexcms/cms-core` and `@aphexcms/ui` re-export `.svelte` components
		// through their entry barrels — Vite must bundle them for SSR. If they
		// are externalized, Node's native ESM loader tries to resolve the raw
		// `.svelte` files directly and throws ERR_UNKNOWN_FILE_EXTENSION (the
		// `svelte` export condition is only honored by Vite, not by Node).
		noExternal: ['@aphexcms/ui', '@aphexcms/cms-core'],
		external: ['sharp', 'graphql', 'graphql-yoga']
	},
	optimizeDeps: {
		// Exclude Aphex Svelte packages from esbuild pre-bundling — esbuild does
		// not know how to handle `.svelte` files, and the dist barrels re-export
		// real Svelte component files. Vite-plugin-svelte handles them at
		// transform time instead.
		exclude: ['sharp', '@aphexcms/ui', '@aphexcms/cms-core'],
		include: [
			'tailwind-variants',
			'tailwind-merge',
			'@internationalized/date',
			'bits-ui',
			'dayjs',
			'dayjs/plugin/customParseFormat',
			'dayjs/plugin/utc',
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
			// Transitive deps from @aphexcms/cms-core that Vite discovers at runtime
			'@aphexcms/cms-core > @dnd-kit/helpers',
			'@aphexcms/cms-core > @dnd-kit/svelte',
			'@aphexcms/cms-core > @dnd-kit/svelte/sortable',
			'@aphexcms/cms-core > dayjs',
			'@aphexcms/cms-core > dayjs/plugin/customParseFormat',
			'@aphexcms/cms-core > dayjs/plugin/utc'
		]
	}
});
