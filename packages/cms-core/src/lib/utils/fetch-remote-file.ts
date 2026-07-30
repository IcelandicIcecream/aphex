// Fetches a remote file for the `upload_asset` agent tool's `url` input. The caller (an LLM)
// can be steered by content it merely *read* (a document field, a scraped page) — an indirect
// prompt-injection vector — so this is a genuine SSRF surface, not just a convenience fetch.
//
// Every redirect hop re-resolves and re-checks the hostname; a naive "check the input URL once"
// implementation is bypassable by redirecting to a private address only after the first check
// passes. More importantly, the resolved IP is *pinned* for the actual connection via a custom
// `undici` dispatcher — resolving with `dns.lookup()` to validate, then handing the plain
// hostname to `fetch()` and letting it resolve again to connect, reopens the same hole via DNS
// rebinding (a short-TTL record that answers differently a few hundred ms apart): the address
// that gets validated and the address that gets connected to must be the exact same one.
import { lookup } from 'node:dns/promises';
import net from 'node:net';
import { Agent, fetch as undiciFetch, type Dispatcher } from 'undici';

export const MAX_REMOTE_FILE_BYTES = 10 * 1024 * 1024; // matches the API's global JSON body cap
const FETCH_TIMEOUT_MS = 10_000;
const MAX_REDIRECTS = 5;
const TRANSIENT_RETRY_DELAY_MS = 300;
const TRANSIENT_STATUSES = new Set([502, 503, 504]);

// A bare request with no headers reads as bot traffic to a lot of image CDNs (including
// Unsplash's), which will deprioritize or outright reject it — sending a normal-looking
// User-Agent/Accept pair alone clears up a meaningful share of otherwise-transient failures.
const REQUEST_HEADERS = {
	'User-Agent': 'AphexCMS-Agent-Fetch/1.0 (+asset upload tool)',
	Accept: 'image/*,*/*;q=0.8'
};

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

function isPrivateOrReservedIp(ip: string): boolean {
	if (net.isIPv4(ip)) {
		const octets = ip.split('.').map(Number);
		const a = octets[0] ?? -1;
		const b = octets[1] ?? -1;
		if (a === 10 || a === 127 || a === 0) return true;
		if (a === 169 && b === 254) return true; // link-local — includes cloud metadata endpoints
		if (a === 172 && b >= 16 && b <= 31) return true;
		if (a === 192 && b === 168) return true;
		if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
		if (a >= 224) return true; // multicast (224-239) + reserved/broadcast (240-255)
		return false;
	}
	if (net.isIPv6(ip)) {
		const lower = ip.toLowerCase();
		if (lower === '::1' || lower === '::') return true;
		if (lower.startsWith('fe80:') || lower.startsWith('fc') || lower.startsWith('fd')) return true;
		if (lower.startsWith('ff')) return true; // multicast
		if (lower.startsWith('::ffff:')) return isPrivateOrReservedIp(lower.slice(7));
		return false;
	}
	return true; // unrecognized address shape — fail closed
}

interface PinnedHost {
	address: string;
	family: 4 | 6;
}

async function resolvePinnedHost(hostname: string): Promise<PinnedHost> {
	if (hostname.toLowerCase() === 'localhost') {
		throw new Error('URL host is not allowed.');
	}
	const records = await lookup(hostname, { all: true });
	if (records.length === 0) throw new Error('Could not resolve host.');
	for (const { address } of records) {
		if (isPrivateOrReservedIp(address)) {
			throw new Error('URL resolves to a private/internal address, which is not allowed.');
		}
	}
	const chosen = records[0]!;
	return { address: chosen.address, family: chosen.family === 6 ? 6 : 4 };
}

/** A dispatcher whose DNS step is short-circuited to the one address we already validated —
 * whatever hostname undici asks it to resolve, it hands back this exact IP, so the socket that
 * actually opens is guaranteed to be the one that passed `isPrivateOrReservedIp`. The hostname
 * itself still flows through normally for the Host header and TLS SNI/cert validation. */
function pinnedDispatcher(host: PinnedHost): Dispatcher {
	return new Agent({
		connect: {
			lookup: (_hostname, options, callback) => {
				const result = { address: host.address, family: host.family };
				callback(null, options.all ? [result] : (result.address as never));
			}
		}
	});
}

export interface RemoteFile {
	buffer: Buffer;
	contentType: string | null;
}

/** Fetch a URL with SSRF guards: http(s)-only, private/link-local/multicast IPs blocked and the
 * validated address pinned for the actual connection (re-checked and re-pinned on every redirect
 * hop), a request timeout, and a streamed size cap (not just a Content-Length check, since that
 * header can lie). */
export async function fetchRemoteFile(url: string): Promise<RemoteFile> {
	let current = url;
	for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
		const parsed = new URL(current);
		if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
			throw new Error('Only http/https URLs are allowed.');
		}
		const pinnedHost = await resolvePinnedHost(parsed.hostname);

		let res: Awaited<ReturnType<typeof undiciFetch>> | undefined;
		// One retry, only for a transient upstream 5xx (502/503/504) — not for 4xx (a bad URL
		// won't fix itself) and not for a network-level exception (already a distinct failure
		// mode, handled by the catch below without a retry).
		for (let attempt = 0; attempt < 2; attempt++) {
			const controller = new AbortController();
			const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
			try {
				res = await undiciFetch(current, {
					redirect: 'manual',
					signal: controller.signal,
					dispatcher: pinnedDispatcher(pinnedHost),
					headers: REQUEST_HEADERS
				});
			} catch (err) {
				throw new Error(`Fetch failed: ${err instanceof Error ? err.message : 'network error'}`);
			} finally {
				clearTimeout(timeout);
			}
			if (attempt === 0 && TRANSIENT_STATUSES.has(res.status)) {
				await sleep(TRANSIENT_RETRY_DELAY_MS);
				continue;
			}
			break;
		}
		res = res!;

		if (res.status >= 300 && res.status < 400) {
			const location = res.headers.get('location');
			if (!location) throw new Error('Redirect response missing a Location header.');
			current = new URL(location, current).toString();
			continue;
		}
		if (!res.ok) {
			const transientNote = TRANSIENT_STATUSES.has(res.status)
				? ' (upstream temporarily unavailable, retried once)'
				: '';
			throw new Error(`Fetch failed with status ${res.status}.${transientNote}`);
		}

		const contentLength = res.headers.get('content-length');
		if (contentLength && Number(contentLength) > MAX_REMOTE_FILE_BYTES) {
			throw new Error(`File too large (max ${MAX_REMOTE_FILE_BYTES / (1024 * 1024)}MB).`);
		}
		if (!res.body) throw new Error('Response had no body.');

		const reader = res.body.getReader();
		const chunks: Uint8Array[] = [];
		let total = 0;
		for (;;) {
			const { done, value } = await reader.read();
			if (done) break;
			total += value.byteLength;
			if (total > MAX_REMOTE_FILE_BYTES) {
				await reader.cancel();
				throw new Error(`File too large (max ${MAX_REMOTE_FILE_BYTES / (1024 * 1024)}MB).`);
			}
			chunks.push(value);
		}
		return { buffer: Buffer.concat(chunks), contentType: res.headers.get('content-type') };
	}
	throw new Error('Too many redirects.');
}
