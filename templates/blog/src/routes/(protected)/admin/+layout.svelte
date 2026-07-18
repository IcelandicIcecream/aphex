<script lang="ts">
	import { Sidebar, ConfirmDialogHost, setPermissionsContext } from '@aphexcms/cms-core/client/ui';
	import type { AdminArea } from '@aphexcms/cms-core/client/ui';
	import type { SidebarData } from '@aphexcms/cms-core';
	import { plugins } from '$lib/plugins';
	import { authClient } from '$lib/auth-client';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { activeTabState } from '$lib/stores/activeTab.svelte';
	import { SvelteURLSearchParams } from 'svelte/reactivity';
	import { BookOpenText, House } from '@lucide/svelte';
	import { onMount } from 'svelte';
	import { fade } from 'svelte/transition';
	import type { LayoutData } from './$types';

	let { data, children }: { data: LayoutData; children: any } = $props();

	// The admin is a large interactive app: the server-rendered HTML paints
	// immediately, but nothing is clickable until the JS bundle hydrates (a few
	// seconds on mobile). Show a boot overlay until `onMount` fires — i.e. until the
	// page is actually interactive — so taps don't land on dead controls.
	let hydrated = $state(false);
	onMount(() => {
		hydrated = true;
	});

	// Prepare sidebar data
	const sidebarData = $derived({
		user: {
			id: data.auth.user.id,
			email: data.auth.user.email,
			name: data.auth.user.name,
			image: data.auth.user.image,
			role: data.auth.user.role
		},
		branding: {
			title: data.title
		},
		// Default nav items (can be customized per app)
		navItems: [
			{ href: '/admin', label: 'Studio', icon: House },
			{ href: '/blog', label: 'Blog', icon: BookOpenText }
		],
		organizations: data.organizations,
		activeOrganization: data.activeOrganization,
		canCreateOrganization: data.canCreateOrganization
	} satisfies SidebarData);

	// Publish capability context for every descendant route (AdminApp, settings
	// pages, etc). Sourced from the layout's rbac payload so capability edits
	// mid-session propagate on next page load. The role name is exposed too
	// for role-list checks (field-level access).
	setPermissionsContext(
		() => page.data.rbac?.capabilities ?? [],
		() => page.data.rbac?.role ?? null
	);

	// Get graphqlSettings from page data (child route)
	const enableGraphiQL = $derived(page.data.graphqlSettings?.enableGraphiQL ?? false);

	// Restore tab from URL param on load. Built-in views plus plugin areas
	// (`plugin:<id>`) are addressable, so a refresh keeps you on the same tab.
	const builtinViews = ['structure', 'vision', 'media'];
	function isValidView(v: string): v is AdminArea {
		return builtinViews.includes(v) || v.startsWith('plugin:');
	}

	$effect(() => {
		const viewParam = page.url.searchParams.get('view');
		activeTabState.value = viewParam && isValidView(viewParam) ? viewParam : 'structure';
	});

	// Handle tab change — update both state and URL
	function handleTabChange(value: string) {
		if (isValidView(value)) activeTabState.value = value;

		const params = new SvelteURLSearchParams(page.url.searchParams);
		if (value === 'structure') {
			params.delete('view');
		} else {
			params.set('view', value);
		}
		const query = params.toString();
		goto(`/admin${query ? `?${query}` : ''}`, { replaceState: true, keepFocus: true });
	}

	async function handleSignOut() {
		await authClient.signOut();
		goto(resolve('/login'));
	}
</script>

<svelte:head>
	{#if data?.faviconUrl}<link rel="icon" href={data.faviconUrl} />{/if}
</svelte:head>

{#if sidebarData}
	<Sidebar
		data={sidebarData}
		onSignOut={handleSignOut}
		{enableGraphiQL}
		activeTab={activeTabState}
		onTabChange={handleTabChange}
		{plugins}
	>
		{@render children()}
	</Sidebar>
{:else}
	<div>Loading...</div>
{/if}

<ConfirmDialogHost />
<!-- <PermissionsDebug /> -->

{#if !hydrated}
	<div
		class="bg-background fixed inset-0 z-[200] flex flex-col items-center justify-center gap-4"
		out:fade={{ duration: 200 }}
	>
		<div class="border-muted border-t-primary h-7 w-7 animate-spin rounded-full border-[3px]"></div>
		<p class="text-muted-foreground text-xs font-medium tracking-wide">Loading studio…</p>
	</div>
{/if}
