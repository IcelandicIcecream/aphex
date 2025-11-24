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
			strict: true
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
			'@lucide/svelte/icons/panel-left',
			'@lucide/svelte/icons/minus',
			'@lucide/svelte/icons/circle',
			'@lucide/svelte/icons/chevron-right',
			'@lucide/svelte/icons/search'
		]
	}
});
