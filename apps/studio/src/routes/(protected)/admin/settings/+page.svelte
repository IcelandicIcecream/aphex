<script lang="ts">
	import * as Card from '@aphexcms/ui/shadcn/card';
	import type { PageData } from './$types';
	import OrganizationsSettings from './_components/OrganizationsSettings.svelte';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>Aphex CMS - Organization Settings</title>
</svelte:head>

<div class="grid gap-6">
	<div class="hidden sm:block">
		<h2 class="text-xl font-semibold">General</h2>
		<p class="text-muted-foreground text-sm">Manage your organization settings and preferences.</p>
	</div>

	{#if data.activeOrganization}
		<OrganizationsSettings
			activeOrganization={data.activeOrganization}
			currentUserId={data.user.id}
		/>
	{:else}
		<Card.Root>
			<Card.Content class="py-12 text-center">
				<p class="text-muted-foreground text-lg">No active organization</p>
				<p class="text-muted-foreground mt-2 text-sm">You need to be added to an organization</p>
			</Card.Content>
		</Card.Root>
	{/if}
</div>
