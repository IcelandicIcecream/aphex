import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from '../(protected)/admin/$types';
import { authOptions } from '$lib/server/auth/auth.config';

export const load: PageServerLoad = async ({ locals, request }) => {
	const { aphexCMS } = locals;

	const session = await aphexCMS.auth?.getSession(request, aphexCMS.databaseAdapter);
	// If user is already authenticated, redirect to admin
	if (session?.session) {
		throw redirect(302, '/admin');
	}

	// Drives the post-signup step: when verification is off, sign-up auto-signs the
	// user in, so the page redirects to /admin instead of asking them to check email.
	return { requireEmailVerification: authOptions.requireEmailVerification };
};
