const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

/**
 * The host an app sends its answer to, which is the one part of a connecting app a
 * person can check: anyone can register an app called "Claude", but only Anthropic
 * receives codes at claude.ai. An app-specific scheme (`cursor://…`) shows as is.
 *
 * A desktop or command-line app (Claude Code, an IDE) has no web address, so it
 * listens on this computer at a random port (RFC 8252). "localhost:51861" reads as
 * something broken to an owner, and the port means nothing to them, so a loopback
 * address is named for what it is: the answer stays on their own machine.
 */
export function redirectHost(redirectUri: string): string {
	try {
		const url = new URL(redirectUri);
		if (LOOPBACK_HOSTS.has(url.hostname)) return 'the app on this computer';
		return url.host || `${url.protocol}//`;
	} catch {
		return redirectUri;
	}
}
