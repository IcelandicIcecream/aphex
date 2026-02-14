<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import * as AlertDialog from '@aphexcms/ui/shadcn/alert-dialog';
	import { Badge } from '@aphexcms/ui/shadcn/badge';
	import { ExternalLink } from '@lucide/svelte';
	import { organizations } from '@aphexcms/cms-core/client';

	type OrgItem = {
		id: string;
		name: string;
		slug: string;
		role: string;
		isActive: boolean;
		memberCount: number;
		ownerEmail?: string;
	};

	let { orgs = [] }: { orgs: OrgItem[] } = $props();

	let switchingOrgId = $state<string | null>(null);

	async function handleOrgClick(org: OrgItem) {
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
			<div class="flex items-center gap-4 p-4 transition-colors hover:bg-muted/50">
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
				</div>

				<!-- Actions -->
				<button
					class="text-muted-foreground hover:text-foreground rounded-md p-2 transition-colors hover:bg-muted"
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
