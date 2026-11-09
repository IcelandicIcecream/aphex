<script lang="ts">
	import { page } from '$app/state';
	import type { AdminOrganizationsData } from '../../admin/view-data';
	import CreateOrganization from './CreateOrganization.svelte';
	import OrganizationsList from './OrganizationsList.svelte';

	let { data, canCreate }: { data: AdminOrganizationsData; canCreate: boolean } = $props();
</script>

<svelte:head>
	<title>Organizations</title>
</svelte:head>

<div class="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
	<div class="mx-auto flex w-full max-w-6xl items-center justify-between">
		<div>
			<h1 class="text-3xl font-semibold">Organizations</h1>
			<p class="text-muted-foreground">Manage your organizations</p>
		</div>
		{#if canCreate}
			<CreateOrganization
				startOpen={page.url.searchParams.get('action') === 'create'}
				parentOption={data.parentOption}
			/>
		{/if}
	</div>

	<div class="mx-auto grid w-full max-w-6xl gap-6">
		<OrganizationsList orgs={data.organizations} />
	</div>
</div>
