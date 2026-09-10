/**
 * A v4 UUID that also works outside a secure context.
 *
 * `crypto.randomUUID` is only defined on HTTPS or `localhost`. The dev server
 * runs `vite dev --host`, so opening the Network URL it prints
 * (`http://192.168.x.x:5173`) — from a phone, another machine, or through a
 * plain-HTTP tunnel — leaves it `undefined`, and every call site throws
 * `TypeError: crypto.randomUUID is not a function`.
 *
 * `crypto.getRandomValues` is *not* gated that way, so the fallback is still
 * cryptographically random; only the convenience wrapper is missing. The final
 * `Math.random` branch exists for non-browser contexts with no WebCrypto at all
 * and is **not** suitable for anything security-sensitive — use `node:crypto` on
 * the server, where `randomUUID` is always available.
 */
export function randomId(): string {
	if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
		return crypto.randomUUID();
	}

	if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
		const bytes = crypto.getRandomValues(new Uint8Array(16));
		// Stamp the version (4) and variant (10xx) nibbles as the spec requires.
		// Mapped rather than assigned by index so the bytes are read once, with no
		// possibly-undefined element access to assert away.
		const hex = Array.from(bytes, (byte, index) => {
			const value = index === 6 ? (byte & 0x0f) | 0x40 : index === 8 ? (byte & 0x3f) | 0x80 : byte;
			return value.toString(16).padStart(2, '0');
		}).join('');

		return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
	}

	return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
