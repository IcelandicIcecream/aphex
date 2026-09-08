import { describe, expect, it } from 'vitest';
import { postSignUpDestination } from '$lib/auth-redirect';

describe('post-sign-up destination', () => {
	it('sends the bootstrap owner to the admin', () => {
		expect(postSignUpDestination(true)).toBe('/admin');
	});

	it('sends later accounts to their pending invitations', () => {
		expect(postSignUpDestination(false)).toBe('/invitations');
	});
});
