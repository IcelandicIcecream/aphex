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
	]
});
