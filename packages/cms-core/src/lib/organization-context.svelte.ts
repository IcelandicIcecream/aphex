// The organization the studio is acting in, for any component inside it: plugin tools,
// field components, document actions, block previews. On a tenant's URL it's that
// tenant, because the server moved the session there before the page loaded.

import { getContext, setContext } from 'svelte';
import type { Organization } from './types/organization';
import type { SidebarOrganization } from './types/sidebar';

const KEY = Symbol.for('aphex.organization');

export interface ActiveOrganization {
	id: string;
	name: string;
	slug: string;
	/** The signed-in user's role in it. */
	role: string;
	/**
	 * What the organization stores about itself: logo, theme, website. Its own admins
	 * can edit this, so never decide what it's entitled to from it. Use
	 * `organizationCapabilities` in the server config for that.
	 */
	metadata: Organization['metadata'];
}

export interface OrganizationContext {
	/** `null` outside the studio's signed-in views, such as on the login page. */
	readonly current: ActiveOrganization | null;
}

/** Set by `<AphexStudio>` from its server data. */
export function setOrganizationContext(
	getOrganization: () => SidebarOrganization | null
): OrganizationContext {
	const ctx: OrganizationContext = {
		get current() {
			const organization = getOrganization();
			if (!organization) return null;
			return {
				id: organization.id,
				name: organization.name,
				slug: organization.slug,
				role: organization.role,
				metadata: organization.metadata ?? null
			};
		}
	};
	setContext(KEY, ctx);
	return ctx;
}

/**
 * The organization the studio is acting in, reactive.
 *
 * @example
 * ```svelte
 * <script>
 *   import { useOrganization } from '@aphexcms/cms-core/client';
 *   const organization = useOrganization();
 * </script>
 *
 * <p>Invoices for {organization.current?.name}</p>
 * ```
 */
export function useOrganization(): OrganizationContext {
	return getContext<OrganizationContext | undefined>(KEY) ?? { current: null };
}
