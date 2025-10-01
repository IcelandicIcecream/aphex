import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { resolve } from 'path';

export default defineConfig({
  plugins: [
    svelte({
      compilerOptions: {
        generate: 'dom'
      }
    })
  ],
  build: {
    lib: {
      entry: {
        index: resolve(__dirname, 'src/index.ts'),
        components: resolve(__dirname, 'src/components/index.ts'),
        routes: resolve(__dirname, 'src/routes/index.ts'),
        types: resolve(__dirname, 'src/types.ts')
      },
      formats: ['es']
    },
    rollupOptions: {
      external: [
        'svelte',
        '@sveltejs/kit',
        'drizzle-orm',
        'postgres',
        'sharp'
      ],
      output: {
        preserveModules: true,
        preserveModulesRoot: 'src'
      }
    },
    target: 'node18'
  },
  resolve: {
    alias: {
      '$lib': resolve('./src/lib'),
      '$app': resolve(__dirname, '../../src/app'),
      '$env': resolve(__dirname, '../../src/env')
    }
  }
});
