// What core serves now (cms-core 12) that an app made from an older template has as its own
// files. Each unit is deleted whole or kept whole: half a route group (a layout gone,
// a page that reads its data kept) is worse than either.

export interface RouteUnit {
	/** What the person reads in the plan. */
	label: string;
	/** Folders under the app root. Every file inside belongs to the unit. */
	dirs: string[];
	/** Where core serves this now. */
	servedAt: string;
}

export const ROUTE_UNITS: RouteUnit[] = [
	{
		label: 'admin pages and layout',
		dirs: ['src/routes/(protected)/admin'],
		servedAt: '/admin'
	},
	{
		label: 'sign-in pages',
		dirs: [
			'src/routes/login',
			'src/routes/invite',
			'src/routes/invitations',
			'src/routes/reset-password',
			'src/routes/two-factor',
			'src/routes/verify-email'
		],
		servedAt: '/admin/login and the other account pages'
	},
	{ label: 'God Mode', dirs: ['src/routes/god-mode'], servedAt: '/admin/god-mode' },
	{ label: 'API catch-all', dirs: ['src/routes/api/[...slug]'], servedAt: '/api (by the hook)' },
	{
		label: 'instance settings API',
		dirs: ['src/routes/api/instance-settings'],
		servedAt: '/api/instance-settings'
	},
	{ label: 'invitations API', dirs: ['src/routes/api/invitations'], servedAt: '/api/invitations' },
	{
		label: 'API keys API',
		dirs: ['src/routes/api/settings/api-keys'],
		servedAt: '/api/settings/api-keys'
	},
	{
		// Before v0.3.0 each endpoint had its own re-export file.
		label: 'per-endpoint API routes',
		dirs: [
			'src/routes/api/assets',
			'src/routes/api/documents',
			'src/routes/api/organizations',
			'src/routes/api/roles',
			'src/routes/api/schemas',
			'src/routes/api/user'
		],
		servedAt: '/api (by the hook)'
	},
	{
		label: 'media route',
		dirs: ['src/routes/media/[id]/[filename]'],
		servedAt: '/media (by the hook)'
	}
];

/** The unit whose removal moves sign-in to core's pages. */
export const SIGN_IN_UNIT = 'sign-in pages';

/**
 * Helpers only the old routes used. Each goes once nothing left in the app imports it.
 * `invitation-hook.ts` sent the invitation email, which core now sends itself.
 */
export const HELPER_FILES = [
	'src/lib/auth-client.ts',
	'src/lib/admin-auth-client.ts',
	'src/lib/auth-redirect.ts',
	'src/lib/components/PasswordInput.svelte',
	'src/lib/stores/activeTab.svelte.ts',
	'src/lib/server/email/invitation-hook.ts',
	'src/lib/server/services/organization.ts'
];

/** Everything the known-files manifest covers, as git pathspecs. */
export const CORE_SERVED_PATHS = [...ROUTE_UNITS.flatMap((unit) => unit.dirs), ...HELPER_FILES];
