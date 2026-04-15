import { mdsvex } from 'mdsvex';
import adapterAuto from '@sveltejs/adapter-auto';
import adapterNode from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: [vitePreprocess(), mdsvex()],
	kit: {
		adapter: process.env.ADAPTER === 'node' ? adapterNode() : adapterAuto(),
		alias: {
			'@lib': '../../packages/ui/src/lib',
			'@lib/*': '../../packages/ui/src/lib/*'
		}
	},
	extensions: ['.svelte', '.svx']
};

export default config;
