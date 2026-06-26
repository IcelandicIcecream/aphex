#!/usr/bin/env node
/**
 * Builds the `aphex` CLI bin into `dist/cli`.
 *
 * Replaces a full `tsc` pass over the whole package. `svelte-package` already
 * emits the library to the dist root, so `tsc` was only needed to produce the
 * CLI (`src/cli`) plus the `src/lib` subset it imports — but `tsc` type-checked
 * and emitted *all* of `src/lib` into an unused `dist/lib` tree (~7s, ~3MB of
 * duplicate output). esbuild bundles the CLI entry into a single self-contained
 * file in well under a second, so `dist/lib` is no longer needed at all.
 *
 * The CLI's runtime closure is tiny (field-validation utils + dayjs); every
 * bare import (esbuild, @clack/prompts, cac, dayjs, …) stays external and
 * resolves from node_modules at runtime, exactly as before. Type-checking now
 * lives solely in `pnpm check` (svelte-check), where it belongs for a build.
 */
import { build } from 'esbuild';
import { readFile, writeFile, chmod } from 'node:fs/promises';

const BIN = 'dist/cli/index.js';

// `index.ts` imports `./migrate` and `./generate-types`, so bundling the single
// entry inlines the whole CLI.
await build({
	entryPoints: ['src/cli/index.ts'],
	outfile: BIN,
	bundle: true,
	platform: 'node',
	format: 'esm',
	packages: 'external'
});

// The source keeps a `tsx` shebang so `aphex` runs straight from `.ts` in dev;
// the bundled artifact is plain JS, so it runs on bare `node` (no tsx needed at
// install time). Normalise the preserved shebang to node.
let code = await readFile(BIN, 'utf8');
code = code.replace(/^#![^\n]*\n/, '');
code = `#!/usr/bin/env node\n${code}`;
await writeFile(BIN, code);
await chmod(BIN, 0o755);

console.log('✓ Built CLI bin: dist/cli/index.js');
