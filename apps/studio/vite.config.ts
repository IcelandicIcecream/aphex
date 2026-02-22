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
				const { ws, watcher } = server;
				watcher.on('change', async (file) => {
					if (file.includes('/schemaTypes/') && file.endsWith('.ts')) {
						console.log('🔄 Schema file changed:', file);

						// Set a global flag that the hooks can check
						(global as any).__aphexSchemasDirty = true;

						// Trigger browser reload to pick up new schemas
						ws.send({
							type: 'full-reload'
						});
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
				'!**/node_modules/@aphexcms/graphql-plugin/**',
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
			'@aphexcms/cms-core > dayjs/plugin/utc',
			'@aphexcms/cms-core > devalue',
			'@aphexcms/cms-core > esm-env'
		]
	}
});
