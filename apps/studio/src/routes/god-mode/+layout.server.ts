import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	const auth = locals.auth;

	if (!auth || auth.type !== 'session') {
		throw redirect(302, '/login');
	}

	if (auth.user.role !== 'super_admin') {
		return {
			unauthorized: true,
			user: {
				id: auth.user.id,
				email: auth.user.email,
				name: auth.user.name,
				role: auth.user.role
			}
		};
	}

	return {
		unauthorized: false,
		user: {
			id: auth.user.id,
			email: auth.user.email,
			name: auth.user.name,
			role: auth.user.role
		}
	};
};
