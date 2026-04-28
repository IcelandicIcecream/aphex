const SINGLETON_NAMESPACE = '6f4d2c3b-7a51-4e62-9b1d-aphexsingleton';

/**
 * 64-bit FNV-1a over a UTF-8 string, returned as 16 hex chars. Synchronous
 * and isomorphic — no Node `crypto` import, so it can ride along into the
 * client bundle via the schema-utils barrel without breaking Vite SSR.
 */
function fnv1a64(input: string): string {
	let h = 0xcbf29ce484222325n;
	const prime = 0x100000001b3n;
	const mask = 0xffffffffffffffffn;
	for (let i = 0; i < input.length; i++) {
		h ^= BigInt(input.charCodeAt(i));
		h = (h * prime) & mask;
	}
	return h.toString(16).padStart(16, '0');
}

/**
 * Deterministic UUID-shaped id for a singleton schema. Same schema name
 * always resolves to the same id, so the singleton document survives across
 * deploys and never collides with random-uuid docs of the same type that may
 * exist from before the schema was flipped to singleton. The hash is not
 * cryptographic — collision space is the schema-names set within an
 * organization, which is small enough that FNV-1a is more than sufficient.
 */
export function singletonId(schemaName: string): string {
	const a = fnv1a64(`${SINGLETON_NAMESPACE}:a:${schemaName}`);
	const b = fnv1a64(`${SINGLETON_NAMESPACE}:b:${schemaName}`);
	const hex = (a + b).slice(0, 32);
	return [
		hex.slice(0, 8),
		hex.slice(8, 12),
		`5${hex.slice(13, 16)}`,
		`${((parseInt(hex.slice(16, 18), 16) & 0x3f) | 0x80).toString(16).padStart(2, '0')}${hex.slice(18, 20)}`,
		hex.slice(20, 32)
	].join('-');
}
