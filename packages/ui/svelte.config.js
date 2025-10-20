import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),
	kit: {
		alias: {
			'@lib': './src/lib',
			'@lib/*': './src/lib/*'
		}
	}
};

export default config;
