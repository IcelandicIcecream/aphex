import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

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
