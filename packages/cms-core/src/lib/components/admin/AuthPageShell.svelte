<script lang="ts">
	/**
	 * The frame around the signed-out account pages: login, invitation links, password
	 * reset and the two-factor challenge. Per-tenant branding applies to all of them, so
	 * a page opened from an email looks like the login it leads to.
	 */
	import type { Snippet } from 'svelte';
	import type { LoginBranding } from '../../types/auth';

	let {
		branding,
		title,
		children
	}: { branding: LoginBranding | null; title: string; children: Snippet } = $props();

	const brandTitle = $derived(branding?.title ?? title);
	// Any CSS color the host returns becomes the page's `--primary`, so buttons and
	// links pick up the tenant's color with no stylesheet per tenant.
	const style = $derived(branding?.accentColor ? `--primary: ${branding.accentColor};` : undefined);
</script>

<div class="bg-muted/40 flex min-h-screen items-center justify-center px-4 py-12" {style}>
	<div class="w-full max-w-md">
		{#if branding?.logoUrl}
			<div class="mb-6 flex justify-center">
				<img src={branding.logoUrl} alt={brandTitle} class="max-h-16 w-auto object-contain" />
			</div>
		{/if}
		{@render children()}
		<p class="text-muted-foreground mt-6 text-center text-xs">{brandTitle}</p>
	</div>
</div>
