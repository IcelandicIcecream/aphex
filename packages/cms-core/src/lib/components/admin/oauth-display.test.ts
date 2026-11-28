import { describe, expect, it } from 'vitest';
import { redirectHost } from './oauth-display';

describe('redirectHost', () => {
	it('shows a web app by its host', () => {
		expect(redirectHost('https://claude.ai/api/mcp/auth_callback')).toBe('claude.ai');
	});

	it('names a local app instead of showing localhost and a port', () => {
		expect(redirectHost('http://localhost:51861/callback')).toBe('the app on this computer');
		expect(redirectHost('http://127.0.0.1:8080/cb')).toBe('the app on this computer');
		expect(redirectHost('http://[::1]:9000/cb')).toBe('the app on this computer');
	});

	it('shows an app scheme by its host, or the scheme when it has none', () => {
		expect(redirectHost('cursor://anysphere.cursor-mcp/oauth')).toBe('anysphere.cursor-mcp');
		expect(redirectHost('myapp:callback')).toBe('myapp://');
	});
});
