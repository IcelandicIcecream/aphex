import { defineConfig } from 'tsup';

export default defineConfig({
	entry: ['src/index.ts', 'src/schema.ts'],
	format: ['esm'],
	dts: true,
	clean: true,
	sourcemap: false,
	// This ensures watch mode picks up all changes
	onSuccess: async () => {
		console.log('✓ Build complete');
	}
});
