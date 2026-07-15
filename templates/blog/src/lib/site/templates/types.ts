import type { Snippet } from 'svelte';

export interface SiteLink {
	label?: string;
	url?: string;
	newTab?: boolean;
}

export interface SiteShellProps {
	children?: Snippet;
	siteTitle: string;
	tagline: string;
	nav: SiteLink[];
	social: SiteLink[];
	logoUrl: string | null;
	logoHeight: number;
	footerLogoHeight: number;
	year: number;
}
