<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { Badge } from '@aphexcms/ui/shadcn/badge';
	import { Switch } from '@aphexcms/ui/shadcn/switch';
	import { ArrowRight, ExternalLink, Trash2 } from '@lucide/svelte';
	import { toast } from 'svelte-sonner';
	import ConfirmDelete from './ConfirmDelete.svelte';
	import { organizations } from '../../api/organizations';

	import { formatDate } from '../../utils/dates';
	import type { AdminGodModeFeatures, AdminOrganizationListItem } from '../../admin/view-data';

	let {
		orgs = [],
		features = null,
		canDelete = false
	}: {
		orgs: AdminOrganizationListItem[];
		/** God Mode's per-organization feature switches; none elsewhere. */
		features?: AdminGodModeFeatures | null;
		/** God Mode: every row can be deleted. */
		canDelete?: boolean;
	} = $props();

	let deleting = $state<AdminOrganizationListItem | null>(null);
	let confirmOpen = $state(false);

	async function remove() {
		if (!deleting) return;
		const { id, name } = deleting;
		const result = await organizations.remove(id);
		if (!result.success) throw new Error(result.message || result.error || 'Could not delete it');
		toast.success(`${name} was deleted`);
		await invalidateAll();
	}

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
			toast.error(err instanceof Error ? err.message : 'Failed to switch organization');
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
	{#if features && features.available.length > 0}
		<!-- What each switch below does, said once rather than on hover only. -->
		<dl class="bg-muted/40 mb-3 grid gap-x-6 gap-y-1 rounded-lg border p-3 text-sm sm:grid-cols-2">
			{#each features.available as feature (feature.id)}
				<div>
					<dt class="inline font-medium">{feature.title}</dt>
					{#if feature.description}
						<dd class="text-muted-foreground inline">: {feature.description}</dd>
					{/if}
				</div>
			{/each}
		</dl>
	{/if}
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
						Total members: {org.memberCount}{#if org.createdAt}
							· Made {formatDate(org.createdAt, {
								day: 'numeric',
								month: 'short',
								year: 'numeric'
							})}{/if}
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

				<!-- Actions: look at its public site (when the app says where), or switch to it (members only) -->
				<div class="flex shrink-0 items-center gap-1">
					{#if org.siteUrl}
						<a
							href={org.siteUrl}
							target="_blank"
							rel="noopener noreferrer"
							class="text-muted-foreground hover:text-foreground hover:bg-muted flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm transition-colors"
							title="Open its public site in a new tab"
						>
							<ExternalLink class="size-4" />
							View site
						</a>
					{/if}
					{#if org.isMember}
						<button
							class="text-muted-foreground hover:text-foreground hover:bg-muted rounded-md p-2 transition-colors"
							onclick={() => handleOrgClick(org)}
							disabled={switchingOrgId !== null}
							title={org.isActive ? 'Go to dashboard' : 'Switch to this organization'}
							aria-label={org.isActive ? 'Go to dashboard' : `Switch to ${org.name}`}
						>
							<ArrowRight class="size-4" />
						</button>
					{/if}
					{#if canDelete}
						<button
							class="text-muted-foreground hover:text-destructive hover:bg-muted rounded-md p-2 transition-colors"
							onclick={() => {
								deleting = org;
								confirmOpen = true;
							}}
							title="Delete this organization"
							aria-label="Delete {org.name}"
						>
							<Trash2 class="size-4" />
						</button>
					{/if}
				</div>
			</div>
		{/each}
	</div>
{/if}

{#if deleting}
	<ConfirmDelete
		bind:open={confirmOpen}
		title="Delete {deleting.name}?"
		phrase={deleting.name}
		action="Delete organization"
		onConfirm={remove}
	>
		Every document, uploaded file, role and invitation in it is erased, and
		{deleting.memberCount === 1 ? 'its member is' : `all ${deleting.memberCount} members are`} removed.
		Their accounts stay. This is permanent.
	</ConfirmDelete>
{/if}
