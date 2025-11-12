<script lang="ts">
	import { onMount } from 'svelte';
	import { invalidateAll } from '$app/navigation';
	import * as Card from '@aphexcms/ui/shadcn/card';
	import * as AlertDialog from '@aphexcms/ui/shadcn/alert-dialog';
	import { Button } from '@aphexcms/ui/shadcn/button';
	import { Trash2 } from 'lucide-svelte';
	import type { Organization } from '$lib/schemaTypes/organization';

	let organizations = $state<Organization[]>([]);
	let error = $state<string | null>(null);
	let isLoading = $state(true);
	let deletingOrgId = $state<string | null>(null);
	let orgToDelete = $state<Organization | null>(null);

	onMount(async () => {
		await loadOrganizations();
	});

	async function loadOrganizations() {
		try {
			isLoading = true;
			const response = await fetch('/api/organizations');
			const result = await response.json();

			if (!response.ok || !result.success) {
				throw new Error(result.message || 'Failed to fetch organizations');
			}

			organizations = result.data;
		} catch (err) {
			error = err instanceof Error ? err.message : 'An unknown error occurred';
		} finally {
			isLoading = false;
		}
	}

	async function handleDeleteOrganization(org: Organization) {
		if (deletingOrgId) return; // Prevent multiple simultaneous deletions

		deletingOrgId = org.id;
		try {
			const response = await fetch(`/api/organizations/${org.id}`, {
				method: 'DELETE'
			});

			const result = await response.json();

			if (!response.ok || !result.success) {
				throw new Error(result.error || 'Failed to delete organization');
			}

			// Reload organizations and invalidate all data
			await loadOrganizations();
			await invalidateAll();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to delete organization';
			console.error('Delete organization error:', err);
		} finally {
			deletingOrgId = null;
			orgToDelete = null;
		}
	}

	function openDeleteDialog(org: Organization) {
		orgToDelete = org;
	}

	function closeDeleteDialog() {
		orgToDelete = null;
	}
</script>

<Card.Root>
	<Card.Header>
		<Card.Title>Your Organizations</Card.Title>
		<Card.Description>A list of all the organizations you are a member of.</Card.Description>
	</Card.Header>
	<Card.Content>
		{#if isLoading}
			<p class="text-muted-foreground py-8 text-center">Loading organizations...</p>
		{:else if error}
			<div class="bg-destructive/10 text-destructive border-destructive/20 rounded-lg border p-4">
				<p class="font-medium">Error</p>
				<p class="text-sm">{error}</p>
			</div>
		{:else if organizations.length === 0}
			<p class="text-muted-foreground py-8 text-center">
				You are not a member of any organizations yet.
			</p>
		{:else}
			<ul class="divide-border divide-y">
				{#each organizations as org, index (index)}
					<li class="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
						<div class="flex grow items-center justify-between">
							<div class="flex flex-col">
								<span class="font-medium">{org.name}</span>
								<span class="text-muted-foreground text-sm">{org.slug}</span>
							</div>

							<div class="flex items-center gap-2 sm:hidden">
								{#if org.role === 'owner'}
									<Button
										variant="ghost"
										size="icon"
										onclick={() => openDeleteDialog(org)}
										disabled={deletingOrgId === org.id}
										class="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8"
									>
										<Trash2 class="h-4 w-4" />
									</Button>
								{/if}
							</div>
						</div>

						<div class="flex items-center justify-between">
							<div class="flex items-center gap-2">
								<span class="text-muted-foreground text-sm capitalize">{org.role}</span>
								{#if org.isActive}
									<span
										class="bg-primary/10 text-primary inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold"
									>
										Active
									</span>
								{/if}
							</div>

							<div class="hidden items-center gap-2 sm:flex">
								{#if org.role === 'owner'}
									<Button
										variant="ghost"
										size="icon"
										onclick={() => openDeleteDialog(org)}
										disabled={deletingOrgId === org.id}
										class="text-destructive hover:text-destructive hover:bg-destructive/10"
									>
										<Trash2 class="h-4 w-4" />
									</Button>
								{/if}
							</div>
						</div>
					</li>
				{/each}
			</ul>
		{/if}
	</Card.Content>
</Card.Root>

<!-- Delete Confirmation Dialog -->
<AlertDialog.Root open={orgToDelete !== null} onOpenChange={(open) => !open && closeDeleteDialog()}>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title>Delete Organization</AlertDialog.Title>
			<AlertDialog.Description>
				Are you sure you want to delete <strong>{orgToDelete?.name}</strong>? This action cannot be
				undone. All members will be removed and all pending invitations will be cancelled.
			</AlertDialog.Description>
		</AlertDialog.Header>
		<AlertDialog.Footer>
			<AlertDialog.Cancel onclick={closeDeleteDialog}>Cancel</AlertDialog.Cancel>
			<AlertDialog.Action
				onclick={() => orgToDelete && handleDeleteOrganization(orgToDelete)}
				class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
			>
				Delete Organization
			</AlertDialog.Action>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>
