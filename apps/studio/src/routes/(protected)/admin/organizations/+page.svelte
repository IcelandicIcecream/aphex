<script lang="ts">
	import { page } from '$app/state';
	import CreateOrganization from './_components/CreateOrganization.svelte';
	import OrganizationsList from './_components/OrganizationsList.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const userRole = $derived(page.data?.sidebarData?.user?.role);
	const isSuperAdmin = $derived(userRole === 'super_admin');
</script>

<svelte:head>
	<title>Aphex CMS - Organizations</title>
</svelte:head>

<div class="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
	<div class="mx-auto flex w-full max-w-6xl items-center justify-between">
		<div>
			<h1 class="text-3xl font-semibold">Organizations</h1>
			<p class="text-muted-foreground">Manage your organizations</p>
		</div>
		{#if isSuperAdmin}
			<CreateOrganization />
		{/if}
	</div>

	<div class="mx-auto grid w-full max-w-6xl gap-6">
		<OrganizationsList orgs={data.organizations} />
	</div>
</div>
