<script lang="ts">
	import { onMount } from 'svelte';
	import { goto, invalidateAll } from '$app/navigation';
	import * as Card from '@aphexcms/ui/shadcn/card';
	import * as AlertDialog from '@aphexcms/ui/shadcn/alert-dialog';
	import { Button } from '@aphexcms/ui/shadcn/button';
	import { Badge } from '@aphexcms/ui/shadcn/badge';
	import { Trash2 } from '@lucide/svelte';
	import { organizations, type OrganizationListItem } from '@aphexcms/cms-core/client';

	let orgList = $state<OrganizationListItem[]>([]);
	let error = $state<string | null>(null);
	let isLoading = $state(true);
	let deletingOrgId = $state<string | null>(null);
	let switchingOrgId = $state<string | null>(null);
	let orgToDelete = $state<OrganizationListItem | null>(null);

	onMount(async () => {
		await loadOrganizations();
	});

	async function loadOrganizations() {
		try {
			isLoading = true;
			const result = await organizations.list();

			if (!result.success || !result.data) {
				throw new Error('Failed to fetch organizations');
			}

			orgList = result.data;
		} catch (err) {
			error = err instanceof Error ? err.message : 'An unknown error occurred';
		} finally {
			isLoading = false;
		}
	}

	async function handleDeleteOrganization(org: OrganizationListItem) {
		if (deletingOrgId) return;

		deletingOrgId = org.id;
		try {
			const result = await organizations.remove(org.id);

			if (!result.success) {
				throw new Error(result.error || 'Failed to delete organization');
			}

			await loadOrganizations();
			await invalidateAll();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to delete organization';
		} finally {
			deletingOrgId = null;
			orgToDelete = null;
		}
	}

	async function handleOrgClick(org: OrganizationListItem) {
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
			error = err instanceof Error ? err.message : 'Failed to switch organization';
		} finally {
			switchingOrgId = null;
		}
	}
</script>

<Card.Root>
	<Card.Header>
		<Card.Title>Organizations</Card.Title>
		<Card.Description>All organizations in this instance</Card.Description>
	</Card.Header>
	<Card.Content>
		{#if isLoading}
			<p class="text-muted-foreground text-sm">Loading...</p>
		{:else if error}
			<div class="bg-destructive/10 text-destructive border-destructive/20 rounded-lg border p-4">
				<p class="text-sm">{error}</p>
			</div>
		{:else if orgList.length === 0}
			<p class="text-muted-foreground text-sm">No organizations yet</p>
		{:else}
			<div class="space-y-3">
				{#each orgList as org (org.id)}
					<div
						class="hover:bg-muted/50 flex items-center justify-between gap-4 rounded-lg border p-4 transition-colors"
					>
						<button
							class="flex min-w-0 flex-1 flex-col gap-2 text-left sm:flex-row sm:items-center sm:justify-between"
							onclick={() => handleOrgClick(org)}
							disabled={switchingOrgId !== null}
						>
							<div class="min-w-0">
								<p class="truncate font-medium">{org.name}</p>
								<p class="text-muted-foreground truncate text-sm">/{org.slug}</p>
							</div>
							<div class="flex items-center gap-2">
								{#if org.role}
									<Badge variant="outline" class="capitalize">{org.role}</Badge>
								{/if}
								{#if org.isActive}
									<Badge variant="default">Active</Badge>
								{/if}
								<span class="text-muted-foreground hidden text-sm sm:inline">&rarr;</span>
							</div>
						</button>
						{#if org.role === 'owner'}
							<Button
								variant="ghost"
								size="icon"
								onclick={(e) => {
									e.stopPropagation();
									orgToDelete = org;
								}}
								disabled={deletingOrgId === org.id}
								class="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8 shrink-0"
							>
								<Trash2 class="h-4 w-4" />
							</Button>
						{/if}
					</div>
				{/each}
			</div>
		{/if}
	</Card.Content>
</Card.Root>

<!-- Delete Confirmation Dialog -->
<AlertDialog.Root open={orgToDelete !== null} onOpenChange={(open) => !open && (orgToDelete = null)}>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title>Delete Organization</AlertDialog.Title>
			<AlertDialog.Description>
				Are you sure you want to delete <strong>{orgToDelete?.name}</strong>? This action cannot be
				undone. All members will be removed and all pending invitations will be cancelled.
			</AlertDialog.Description>
		</AlertDialog.Header>
		<AlertDialog.Footer>
			<AlertDialog.Cancel onclick={() => (orgToDelete = null)}>Cancel</AlertDialog.Cancel>
			<AlertDialog.Action
				onclick={() => orgToDelete && handleDeleteOrganization(orgToDelete)}
				class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
			>
				Delete Organization
			</AlertDialog.Action>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>
