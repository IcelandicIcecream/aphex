import type { Component } from 'svelte';
import type { IconProps } from '@lucide/svelte';

// Sidebar data types - extensible interfaces for admin UI
export interface SidebarUser {
	id: string;
	email: string;
	name?: string;
	image?: string;
	role?: string;
}

export interface SidebarNavItem {
	href: string;
	label: string;
	icon?: Component<IconProps>;
	badge?: string | number;
	/**
	 * Open in a new tab instead of navigating the admin away. Use it for links
	 * that leave the studio (the live site), so the editor keeps their place —
	 * and never mark such an item active, since it isn't a studio location.
	 */
	newTab?: boolean;
}

/**
 * One labelled block of sidebar nav. Groups are the unit of hierarchy: an app
 * defines as many as it wants, in the order it wants them.
 */
export interface SidebarNavGroup {
	/**
	 * Stable id, used to target the group. A plugin admin tool with a matching
	 * `group` renders inside it instead of the default Tools group — so an app can
	 * file plugins under its own headings rather than a bucket labelled "Tools".
	 */
	id?: string;
	/** Heading above the group. Omit for an unlabelled block. */
	label?: string;
	items?: SidebarNavItem[];
	/**
	 * `'top'` (default) stacks in declared order. `'bottom'` pins the group to the
	 * bottom of the sidebar and demotes it a size — the utility tier, for links
	 * that leave the studio, help, version.
	 */
	placement?: 'top' | 'bottom';
}

export interface SidebarBranding {
	title?: string;
	logo?: string;
}

export interface SidebarOrganization {
	id: string;
	name: string;
	slug: string;
	role: string;
	isActive: boolean;
	metadata?: any;
}

export interface SidebarData {
	user: SidebarUser;
	branding?: SidebarBranding;
	/**
	 * Full control over the sidebar's hierarchy: any number of groups, labelled and
	 * ordered as the app likes. Takes precedence over the three shorthand fields
	 * below, which exist because most apps want exactly the default three tiers and
	 * shouldn't have to spell out a group to get them.
	 */
	navGroups?: SidebarNavGroup[];
	/** Shorthand — the primary tier: the content nav, where an editor works. */
	navItems?: SidebarNavItem[]; // Optional custom nav items (defaults to Content)
	/** Shorthand — the system tier: operational views (activity, logs). */
	systemNavItems?: SidebarNavItem[];
	/** Shorthand — the utility tier: bottom-pinned, demoted. Links off-site, help. */
	secondaryNavItems?: SidebarNavItem[];
	organizations?: SidebarOrganization[]; // User's organizations for organization switcher
	activeOrganization?: SidebarOrganization; // Currently active organization
	canCreateOrganization?: boolean; // Whether user can create orgs from admin panel
}
