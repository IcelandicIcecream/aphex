// security/secret-crypto.ts
//
// Authenticated symmetric encryption for plugin secrets (the one genuinely-new
// brick of the settings/secrets feature — see references/plugin-settings-and-secrets-scope.md).
//
// SERVER ONLY: imports `node:crypto`. Never import this from client/admin code — a
// decrypted secret must never reach the browser. It's kept out of the cms-core client
// barrel deliberately.
//
// Design (mirrors the good ideas from Better Auth's `symmetricEncrypt`, without the
// dependency — cms-core stays auth-provider-agnostic):
//   - AES-256-GCM: authenticated (AEAD), so tampering is detected on decrypt.
//   - Random 96-bit IV per encryption (never reused).
//   - Versioned envelope `v1:<iv>:<tag>:<ciphertext>` (all base64). The version prefix
//     is what makes key rotation possible later: add `v2`, decrypt either, re-encrypt
//     on next write — no data migration.
//   - Key derived via SHA-256 so any-length configured secret becomes a valid 32-byte key.

import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

const VERSION = 'v1';
const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12; // 96-bit nonce, the GCM standard.

/** Derive a 32-byte AES key from an arbitrary-length configured secret. */
function deriveKey(secret: string): Buffer {
	return createHash('sha256').update(secret, 'utf8').digest();
}

/**
 * Encrypt a plaintext string into a self-describing envelope
 * `v1:<iv>:<authTag>:<ciphertext>` (base64 segments). Safe to store as an ordinary
 * string in the settings blob.
 */
export function encryptSecret(plaintext: string, secret: string): string {
	const key = deriveKey(secret);
	const iv = randomBytes(IV_BYTES);
	const cipher = createCipheriv(ALGORITHM, key, iv);
	const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
	const authTag = cipher.getAuthTag();
	return [
		VERSION,
		iv.toString('base64'),
		authTag.toString('base64'),
		ciphertext.toString('base64')
	].join(':');
}

/**
 * Decrypt an envelope produced by {@link encryptSecret}. Throws if the envelope is
 * malformed, the version is unknown, or authentication fails (wrong key / tampering).
 */
export function decryptSecret(envelope: string, secret: string): string {
	const parts = envelope.split(':');
	const [version, ivB64, tagB64, ctB64] = parts;
	if (parts.length !== 4 || version !== VERSION || !ivB64 || !tagB64 || !ctB64) {
		throw new Error('Malformed or unsupported secret envelope');
	}
	const key = deriveKey(secret);
	const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(ivB64, 'base64'));
	decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
	const plaintext = Buffer.concat([
		decipher.update(Buffer.from(ctB64, 'base64')),
		decipher.final()
	]);
	return plaintext.toString('utf8');
}

/**
 * Whether a stored value looks like one of our encryption envelopes. Lets the service
 * tell "already-encrypted ciphertext" from "a value that still needs encrypting"
 * without trying to decrypt.
 */
export function isEncryptedSecret(value: unknown): value is string {
	return typeof value === 'string' && value.startsWith(`${VERSION}:`);
}
