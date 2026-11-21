import { describe, expect, it } from 'vitest';
import { refuseCrossSiteForm } from '../src/lib/server/csrf';

const url = new URL('https://app.example.com/api/auth/sign-in/email');
const form = (headers: Record<string, string> = {}, method = 'POST') =>
	new Request(url, {
		method,
		headers: { 'content-type': 'application/x-www-form-urlencoded', ...headers },
		body: method === 'GET' ? undefined : 'a=1'
	});

describe('refuseCrossSiteForm, as SvelteKit checks', () => {
	it('refuses a form post from another origin, or with none', () => {
		expect(refuseCrossSiteForm(form({ origin: 'https://evil.example' }), url)?.status).toBe(403);
		expect(refuseCrossSiteForm(form(), url)?.status).toBe(403);
	});

	it('lets same-origin forms, JSON and reads through', () => {
		expect(refuseCrossSiteForm(form({ origin: 'https://app.example.com' }), url)).toBeNull();
		const json = new Request(url, {
			method: 'POST',
			headers: { 'content-type': 'application/json', origin: 'https://evil.example' },
			body: '{}'
		});
		expect(refuseCrossSiteForm(json, url)).toBeNull();
		expect(refuseCrossSiteForm(new Request(url), url)).toBeNull();
	});

	it('honours trusted origins', () => {
		const request = form({ origin: 'https://checkout.stripe.com' });
		expect(
			refuseCrossSiteForm(request, url, { trustedOrigins: ['https://checkout.stripe.com'] })
		).toBeNull();
	});

	it("lets a client's server reach the OAuth token endpoint, and nothing else", () => {
		const token = new URL('https://app.example.com/api/auth/oauth2/token');
		const exemptPaths = ['/api/auth/oauth2/token'];
		const exchange = new Request(token, {
			method: 'POST',
			headers: { 'content-type': 'application/x-www-form-urlencoded' },
			body: 'grant_type=authorization_code'
		});
		expect(refuseCrossSiteForm(exchange, token, { exemptPaths })).toBeNull();
		expect(refuseCrossSiteForm(form(), url, { exemptPaths })?.status).toBe(403);
	});
});
