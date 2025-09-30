import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit(),
		{
			name: 'schema-reload',
			configureServer(server) {
				const { ws, watcher } = server;
				watcher.on('change', file => {
					if (file.includes('/schemaTypes/') && file.endsWith('.ts')) {
						console.log('🔄 Schema file changed:', file);
						ws.send({
							type: 'full-reload',
						});
					}
				});
			},
		}
	],
	resolve: {
		alias: {
			'@aphex/cms-core/server': path.resolve('./packages/cms-core/src/server'),
			'@aphex/cms-core/client': path.resolve('./packages/cms-core/src/client'),
			'@aphex/cms-core': path.resolve('./packages/cms-core/src'),
			'$lib': path.resolve('./src/lib')
		}
	},
	server: {
		fs: {
			allow: ['.']
		}
	},
	ssr: {
		noExternal: ['@aphex/cms-core'],
		external: ['sharp']
	},
	optimizeDeps: {
		exclude: ['sharp']
	}
});
