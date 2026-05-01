import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { aphex } from '@aphexcms/cms-core/vite';

export default defineConfig({
	plugins: [tailwindcss(), sveltekit(), aphex()]
});
