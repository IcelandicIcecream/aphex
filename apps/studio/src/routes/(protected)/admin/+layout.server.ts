import type { LayoutServerLoad } from './$types';
import type { SidebarData } from '@aphex/cms-core';
import cmsConfig from '../../../../aphex.config';

export const load: LayoutServerLoad = async ({ locals }) => {
	// User is guaranteed to exist here because /admin is protected by auth hook
	const auth = locals.auth;

	console.log('AUTH: ', auth);
	if (!auth || auth.type !== 'session') {
		throw new Error('No session found');
	}

	// Prepare sidebar data
	const sidebarData: SidebarData = {
		user: {
			id: auth.user.id,
			email: auth.user.email,
			name: auth.user.name,
			image: auth.user.image,
			role: auth.user.role
		},
		branding: {
			title: cmsConfig.customization?.branding?.title || 'Aphex CMS'
		},
		// Default nav items (can be customized per app)
		navItems: [
			{ href: '/admin', label: 'Content' }
			// Apps can add more: Settings, Media, etc.
		]
	};

	return {
		sidebarData
	};
};
