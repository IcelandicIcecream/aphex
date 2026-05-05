import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { aphex } from '@aphexcms/cms-core/vite';

export default defineConfig({
	plugins: [tailwindcss(), sveltekit(), aphex()],
	server: {
		// Monorepo-only: let Vite read source files outside apps/studio so it
		// can serve @aphexcms/* packages from packages/* during dev. Scaffolded
		// standalone apps don't need this.
		fs: {
			allow: ['../../']
		}
	}
});
