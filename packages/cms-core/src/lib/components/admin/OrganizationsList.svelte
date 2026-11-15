<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { Badge } from '@aphexcms/ui/shadcn/badge';
	import { Switch } from '@aphexcms/ui/shadcn/switch';
	import { ExternalLink } from '@lucide/svelte';
	import { toast } from 'svelte-sonner';
	import { organizations } from '../../api/organizations';
	import type { AdminGodModeFeatures, AdminOrganizationListItem } from '../../admin/view-data';

	let {
		orgs = [],
		features = null
	}: {
		orgs: AdminOrganizationListItem[];
		/** God Mode's per-organization feature switches; none elsewhere. */
		features?: AdminGodModeFeatures | null;
	} = $props();

	let switchingOrgId = $state<string | null>(null);

	// Seeded from the load, then owned here so a failed save can put a switch back.
	let granted = $state<Record<string, string[]>>({});
	let savingFeature = $state<string | null>(null);
	$effect(() => {
		granted = structuredClone(features?.granted ?? {});
	});

	async function toggleFeature(orgId: string, featureId: string, on: boolean) {
		const previous = granted[orgId] ?? [];
		const next = on
			? [...new Set([...previous, featureId])]
			: previous.filter((id) => id !== featureId);
		granted[orgId] = next;
		savingFeature = `${orgId}:${featureId}`;
		try {
			const result = await organizations.setCapabilities(orgId, { capabilities: next });
			if (!result.success || !result.data) throw new Error(result.error ?? 'Could not save');
			granted[orgId] = result.data.capabilities;
		} catch (error) {
			granted[orgId] = previous;
			toast.error(error instanceof Error ? error.message : 'Could not save');
		} finally {
			savingFeature = null;
		}
	}

	async function handleOrgClick(org: AdminOrganizationListItem) {
		if (switchingOrgId) return;

		if (org.isActive) {
			goto('/admin');
			return;
		}

		switchingOrgId = org.id;
		try {
			const result = await organizations.switch({ organizationId: org.id });

			if (!result.success) {
				throw new Error(result.error || 'Failed to switch organization');
			}

			await invalidateAll();
			goto('/admin');
		} catch (err) {
			console.error('Failed to switch organization:', err);
		} finally {
			switchingOrgId = null;
		}
	}

	function getInitials(name: string): string {
		return name
			.split(' ')
			.map((word) => word[0])
			.join('')
			.toUpperCase()
			.slice(0, 2);
	}
</script>

{#if orgs.length === 0}
	<p class="text-muted-foreground text-sm">No organizations yet</p>
{:else}
	<div class="divide-y rounded-lg border">
		{#each orgs as org (org.id)}
			<div class="hover:bg-muted/50 flex items-center gap-4 p-4 transition-colors">
				<!-- Avatar -->
				<div
					class="bg-sidebar-primary text-sidebar-primary-foreground flex size-10 shrink-0 items-center justify-center rounded-lg text-sm font-semibold"
				>
					{getInitials(org.name)}
				</div>

				<!-- Info -->
				<div class="min-w-0 flex-1">
					<div class="flex items-baseline gap-2">
						<span class="font-medium">{org.name}</span>
						<span class="text-muted-foreground">/</span>
						<span class="text-muted-foreground text-sm">[{org.slug}]</span>
						{#if org.isActive}
							<Badge variant="default" class="text-xs">Active</Badge>
						{/if}
					</div>
					<div class="text-muted-foreground text-sm">
						{#if org.ownerEmail}
							Owned by: {org.ownerEmail}
						{/if}
					</div>
					<div class="text-muted-foreground text-sm">
						Total members: {org.memberCount}
					</div>
					{#if features && features.available.length > 0}
						<div class="mt-2 flex flex-wrap gap-x-5 gap-y-2" role="group" aria-label="Features">
							{#each features.available as feature (feature.id)}
								{@const id = `feature-${org.id}-${feature.id}`}
								<label for={id} class="flex items-center gap-2 text-sm" title={feature.description}>
									<Switch
										{id}
										checked={(granted[org.id] ?? []).includes(feature.id)}
										onCheckedChange={(on) => toggleFeature(org.id, feature.id, on)}
										disabled={savingFeature === `${org.id}:${feature.id}`}
									/>
									{feature.title}
								</label>
							{/each}
						</div>
					{/if}
				</div>

				<!-- Actions -->
				<button
					class="text-muted-foreground hover:text-foreground hover:bg-muted rounded-md p-2 transition-colors"
					onclick={() => handleOrgClick(org)}
					disabled={switchingOrgId !== null}
					title={org.isActive ? 'Go to dashboard' : 'Switch to this organization'}
				>
					<ExternalLink class="size-4" />
				</button>
			</div>
		{/each}
	</div>
{/if}
