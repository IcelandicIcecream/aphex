/**
 * Guards the one process-global that `fetch-remote-file` touches.
 *
 * Node's built-in fetch and the userland `undici` package share
 * `globalThis[Symbol.for('undici.globalDispatcher.1')]`, and whoever writes it
 * first owns every fetch in the process. If `undici` wins, Node routes through
 * it and its stricter header validation rejects an explicit `content-length` —
 * which the S3 client sets on every PUT. The symptom lands nowhere near the
 * cause: uploads to R2/S3 fail with "invalid content-length header", and only in
 * production, because `vite dev` loads the module late enough that Node usually
 * wins the race anyway.
 *
 * This has to run in a *fresh* process. Inside the vitest worker the race is
 * already over — the harness has used fetch long before any test body runs, so
 * an in-process assertion passes whether or not the fix is there (verified: it
 * stayed green with the fix removed). Spawning `node` is what makes it a real
 * regression guard, and it costs one process spawn.
 *
 * Node runs the .ts source directly via type-stripping; the module imports only
 * `node:dns`, `node:net` and `undici`, so there's no Vite/SvelteKit involvement.
 */
import { describe, it, expect } from 'vitest';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';

const execFileAsync = promisify(execFile);

const MODULE_PATH = resolve(
	dirname(fileURLToPath(import.meta.url)),
	'../../../packages/cms-core/src/lib/utils/fetch-remote-file.ts'
);

// Actually *call* the fetcher, which is what pulls `undici` in — importing the
// module no longer does (the import is lazy, which is half the fix). The URL is
// rejected by the SSRF guard, but only after undici has loaded, which is the
// state we care about. Then check an explicit content-length still gets out: a
// malformed request throws before opening a socket, so ECONNREFUSED is success.
const PROBE = `
const { fetchRemoteFile } = await import(${JSON.stringify(MODULE_PATH)});
await fetchRemoteFile('http://127.0.0.1/blocked').catch(() => {});
const body = Buffer.from('hello world', 'utf8');
try {
	await fetch('http://127.0.0.1:9999/probe', {
		method: 'PUT',
		headers: { 'content-length': String(body.byteLength) },
		body
	});
	console.log('CONNECTED');
} catch (error) {
	console.log(error.cause?.message ?? error.message);
}
`;

describe('undici global dispatcher', () => {
	it('fetching a remote file leaves explicit content-length working', async () => {
		const { stdout } = await execFileAsync(process.execPath, ['--input-type=module', '-e', PROBE], {
			cwd: resolve(dirname(fileURLToPath(import.meta.url)), '../../../packages/cms-core')
		});

		// Not "invalid content-length header" — that means undici took the global
		// dispatcher and every S3 upload in the process is dead.
		expect(stdout.trim()).toContain('ECONNREFUSED');
	}, 60000);
});
