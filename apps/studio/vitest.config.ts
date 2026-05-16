import { defineConfig } from 'vitest/config';
import { sveltekit } from '@sveltejs/kit/vite';

export default defineConfig({
	plugins: [sveltekit()],
	test: {
		include: ['tests/**/*.{test,spec}.{js,ts}'],
		globals: true,
		environment: 'node',
		setupFiles: ['tests/setup.ts'],
		globalSetup: ['tests/teardown.ts']
	},
	resolve: {
		alias: {
			$lib: '/src/lib'
		}
	}
});
