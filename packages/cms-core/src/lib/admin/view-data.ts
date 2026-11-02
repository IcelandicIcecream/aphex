import type { UserSessionPreferences, OrganizationTeam } from '../types/organization';

/**
 * The data `createAdminLoad` produces for each admin route, discriminated by
 * `view`. `AphexStudio` switches on `view` to pick the component to mount.
 *
 * This lives in a plain (Svelte-free, import-light) module so both the server
 * load helper and the client shell can share the type without dragging server
 * code into the client type graph.
 */
export interface AdminDashboardData {
	view: 'dashboard';
	documentTypes: Array<{ name: string; title: string; description?: string }>;
	schemaError: { message: string } | null;
	graphqlSettings: { endpoint: string; enableGraphiQL: boolean } | null;
	isReadOnly: boolean;
	userPreferences: UserSessionPreferences | null;
}

export interface AdminActivityData {
	view: 'activity';
}

/** Union of every admin view's SSR payload. Grows as settings views fold in. */
export type AdminViewData = AdminDashboardData | AdminActivityData;
