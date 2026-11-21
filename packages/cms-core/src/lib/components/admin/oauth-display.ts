/**
 * The host an app sends its answer to, which is the one part of a connecting app a
 * person can check: anyone can register an app called "Claude", but only Anthropic
 * receives codes at claude.ai. An app-specific scheme (`cursor://…`) shows as is.
 */
export function redirectHost(redirectUri: string): string {
	try {
		const url = new URL(redirectUri);
		return url.host || `${url.protocol}//`;
	} catch {
		return redirectUri;
	}
}
