import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit(),
		{
			name: 'schema-reload',
			configureServer(server) {
				const { watcher, ws } = server;
				watcher.on('change', async (file) => {
					if (file.includes('/schemaTypes/') && file.endsWith('.ts')) {
						console.log('🔄 Schema file changed, invalidating modules...');

						// Invalidate only the changed file and the config module chain
						const changedMod = server.moduleGraph.getModulesByFile(file);
						if (changedMod) {
							changedMod.forEach((mod) => server.moduleGraph.invalidateModule(mod));
						}

						// Invalidate aphex.config.ts and its importers
						const configPath = server.config.root + '/aphex.config.ts';
						const configMods = server.moduleGraph.getModulesByFile(configPath);
						if (configMods) {
							configMods.forEach((mod) => {
								server.moduleGraph.invalidateModule(mod);
								// Also invalidate anything that imports the config
								mod.importers.forEach((importer) =>
									server.moduleGraph.invalidateModule(importer)
								);
							});
						}

						// Invalidate the schemaTypes index
						const indexPath = server.config.root + '/src/lib/schemaTypes/index.ts';
						const indexMods = server.moduleGraph.getModulesByFile(indexPath);
						if (indexMods) {
							indexMods.forEach((mod) => {
								server.moduleGraph.invalidateModule(mod);
								mod.importers.forEach((importer) =>
									server.moduleGraph.invalidateModule(importer)
								);
							});
						}

						// Reset the CMS singleton so it re-initializes with fresh config
						(global as any).__aphexSchemasDirty = true;

						// Tell the browser to do a full page reload
						ws.send({ type: 'full-reload' });
					}
				});
			}
		}
	],
	server: {
		fs: {
			allow: ['../../']
		},
		watch: {
			ignored: [
				'!**/node_modules/@aphexcms/cms-core/**',
				'!**/node_modules/@aphexcms/ui/**'
			]
		}
	},
	ssr: {
		noExternal: ['@aphexcms/ui'],
		external: ['sharp', 'graphql', 'graphql-yoga']
	},
	optimizeDeps: {
		exclude: ['sharp', '@aphexcms/ui'],
		include: [
			'tailwind-variants',
			'tailwind-merge',
			'@internationalized/date',
			'bits-ui',
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
