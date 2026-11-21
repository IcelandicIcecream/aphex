// What core serves now (cms-core 12) that an app made from an older template has as its own
// files. Each unit is deleted whole or kept whole: half a route group (a layout gone,
// a page that reads its data kept) is worse than either.

export interface RouteUnit {
	/** What the person reads in the plan. */
	label: string;
	/** Folders or files under the app root. Every file inside a folder belongs to the unit. */
	paths: string[];
	/** Where core serves this now. */
	servedAt: string;
	/**
	 * Only a unit when one of its files matches. For paths that also hold routes of the
	 * app's own, so only the ones doing what core does now are offered for deletion.
	 */
	marker?: RegExp;
	/** What keeping it means, when that's worse than the app's route winning over core's. */
	keptMeans?: string;
}

export const ROUTE_UNITS: RouteUnit[] = [
	{
		// Early embedded apps drew the sidebar in their own admin layout. AphexStudio draws
		// it now, so that layout gives a second sidebar around core's.
		label: 'admin layout',
		paths: [
			'src/routes/admin/+layout.svelte',
			'src/routes/admin/+layout.server.ts',
			'src/routes/admin/+layout.ts'
		],
		servedAt: 'the admin sidebar, inside AphexStudio',
		marker: /\bSidebar\b[^;]*from\s*['"]@aphexcms\/cms-core\/client/,
		keptMeans: 'Kept, the admin shows two sidebars: yours and the one AphexStudio draws.'
	},
	{
		label: 'admin pages and layout',
		paths: ['src/routes/(protected)/admin'],
		servedAt: '/admin'
	},
	{
		label: 'sign-in pages',
		paths: [
			'src/routes/login',
			'src/routes/invite',
			'src/routes/invitations',
			'src/routes/reset-password',
			'src/routes/two-factor',
			'src/routes/verify-email'
		],
		servedAt: '/admin/login and the other account pages'
	},
	{ label: 'God Mode', paths: ['src/routes/god-mode'], servedAt: '/admin/god-mode' },
	{ label: 'API catch-all', paths: ['src/routes/api/[...slug]'], servedAt: '/api (by the hook)' },
	{
		label: 'instance settings API',
		paths: ['src/routes/api/instance-settings'],
		servedAt: '/api/instance-settings'
	},
	{ label: 'invitations API', paths: ['src/routes/api/invitations'], servedAt: '/api/invitations' },
	{
		label: 'API keys API',
		paths: ['src/routes/api/settings/api-keys'],
		servedAt: '/api/settings/api-keys'
	},
	{
		// Before v0.3.0 each endpoint had its own re-export file.
		label: 'per-endpoint API routes',
		paths: [
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
		paths: ['src/routes/media/[id]/[filename]'],
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
export const CORE_SERVED_PATHS = [...ROUTE_UNITS.flatMap((unit) => unit.paths), ...HELPER_FILES];
