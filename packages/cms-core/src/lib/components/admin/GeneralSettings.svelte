<script lang="ts">
	/**
	 * General organization settings view: identity panel + danger zone. Core-owned;
	 * the embedded `/admin/settings` catch-all SSR's the org record, member count,
	 * and whether the current user may delete it.
	 */
	import * as Card from '@aphexcms/ui/shadcn/card';
	import type { Organization } from '../../types/organization';
	import OrganizationSettings from './OrganizationSettings.svelte';
	import DeleteOrganizationSettings from './DeleteOrganizationSettings.svelte';

	interface Props {
		organization: Organization | null;
		memberCount: number;
		canDelete: boolean;
	}

	let { organization, memberCount, canDelete }: Props = $props();
</script>

<div class="grid gap-5">
	{#if organization}
		<OrganizationSettings activeOrganization={organization} {memberCount} />

		<!--
			Its own section, and last. A destructive action shouldn't share a visual
			group with the settings above it — the heading is the pause.
		-->
		<section class="mt-5 grid gap-4">
			<header>
				<h2 class="text-base font-semibold">Danger zone</h2>
				<p class="text-muted-foreground text-sm">Irreversible, and affects everyone here.</p>
			</header>

			<DeleteOrganizationSettings {organization} {memberCount} {canDelete} />
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
