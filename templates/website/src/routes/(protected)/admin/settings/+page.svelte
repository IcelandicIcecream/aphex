<script lang="ts">
	import * as Card from '@aphexcms/ui/shadcn/card';
	import type { PageData } from './$types';
	import OrganizationsSettings from './_components/OrganizationsSettings.svelte';
	import DeleteOrganizationSettings from './_components/DeleteOrganizationSettings.svelte';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>Aphex CMS - Organization Settings</title>
</svelte:head>

<div class="grid gap-5">
	{#if data.activeOrganization}
		<OrganizationsSettings activeOrganization={data.activeOrganization} />

		<!--
			Its own section, and last. A destructive action shouldn't share a visual
			group with the settings above it — the heading is the pause.
		-->
		<section class="mt-5 grid gap-4">
			<header>
				<h2 class="text-base font-semibold">Danger zone</h2>
				<p class="text-muted-foreground text-sm">Irreversible, and affects everyone here.</p>
			</header>

			<DeleteOrganizationSettings
				organization={data.activeOrganization}
				canDelete={data.user.organizationRole === 'owner'}
			/>
		</section>
	{:else}
		<Card.Root>
			<Card.Content class="py-12 text-center">
				<p class="text-muted-foreground text-lg">No active organization</p>
				<p class="text-muted-foreground mt-2 text-sm">You need to be added to an organization</p>
			</Card.Content>
		</Card.Root>
	{/if}
</div>
