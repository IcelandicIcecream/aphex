import assert from 'node:assert/strict';
import test from 'node:test';

import { withGeneratedAuthSecret } from '../dist/env.js';

/** The shape current templates ship: the key is present, the value is empty. */
const CURRENT = `# comment\nAUTH_SECRET=\nAPHEX_SQLITE_URL=file:./local.db\n`;

/** The shape older published templates ship: a placeholder value. */
const LEGACY = `BETTER_AUTH_SECRET=your-secret-key-here-change-in-production\nBETTER_AUTH_URL=http://localhost:5173\n`;

function secretFor(body, key) {
	const match = body.match(new RegExp(`^${key}=(.*)$`, 'm'));
	return match?.[1] ?? null;
}

test('fills an empty AUTH_SECRET', () => {
	const secret = secretFor(withGeneratedAuthSecret(CURRENT), 'AUTH_SECRET');
	assert.match(secret, /^[A-Za-z0-9_-]{40,}$/);
});

test('replaces the legacy placeholder value', () => {
	const secret = secretFor(withGeneratedAuthSecret(LEGACY), 'BETTER_AUTH_SECRET');
	assert.match(secret, /^[A-Za-z0-9_-]{40,}$/);
});

test('leaves a value someone already set alone', () => {
	const body = 'AUTH_SECRET=an-existing-real-secret-value\n';
	assert.equal(withGeneratedAuthSecret(body), body);
});

test('generates a different secret each time', () => {
	const a = secretFor(withGeneratedAuthSecret(CURRENT), 'AUTH_SECRET');
	const b = secretFor(withGeneratedAuthSecret(CURRENT), 'AUTH_SECRET');
	assert.notEqual(a, b);
});

test('touches nothing else in the file', () => {
	const out = withGeneratedAuthSecret(CURRENT);
	assert.ok(out.includes('# comment'));
	assert.ok(out.includes('APHEX_SQLITE_URL=file:./local.db'));
});

test('handles a file with no secret key at all', () => {
	const body = 'APHEX_SQLITE_URL=file:./local.db\n';
	assert.equal(withGeneratedAuthSecret(body), body);
});
