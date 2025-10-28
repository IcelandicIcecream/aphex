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
				watcher.on('change', (file) => {
					if (file.includes('/schemaTypes/') && file.endsWith('.ts')) {
						console.log('🔄 Schema file changed:', file);
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
			ignored: ['!**/node_modules/@aphex/cms-core/**', '!**/node_modules/@aphex/graphql-plugin/**']
		}
	},
	ssr: {
		noExternal: ['@aphex/cms-core', '@aphex/ui'],
		external: ['sharp']
	},
	optimizeDeps: {
		exclude: ['sharp']
	}
});
