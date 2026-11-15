import { mdsvex } from 'mdsvex';
import adapterAuto from '@sveltejs/adapter-auto';
import adapterNode from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: [vitePreprocess(), mdsvex()],
	kit: {
		adapter: process.env.ADAPTER === 'node' ? adapterNode() : adapterAuto(),
		// Aphex's hook runs this check instead, the same rule minus the OAuth endpoints
		// that Claude, ChatGPT and other MCP clients call from their servers (a form POST
		// with no Origin, which SvelteKit's own check refuses). Not an opening: see
		// `server/csrf.ts` in @aphexcms/cms-core, and `csrf.trustedOrigins` in aphex.config.ts.
		csrf: { trustedOrigins: ['*'] },
		alias: {
			'@lib': '../../packages/ui/src/lib',
			'@lib/*': '../../packages/ui/src/lib/*'
		}
	},
	extensions: ['.svelte', '.svx']
};

export default config;
