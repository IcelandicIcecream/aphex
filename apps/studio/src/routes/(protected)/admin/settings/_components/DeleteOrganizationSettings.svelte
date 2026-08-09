<script lang="ts">
	import { Button } from '@aphexcms/ui/shadcn/button';
	import { Label } from '@aphexcms/ui/shadcn/label';
	import { Input } from '@aphexcms/ui/shadcn/input';
	import * as Card from '@aphexcms/ui/shadcn/card';
	import * as Dialog from '@aphexcms/ui/shadcn/dialog';
	import { toast } from 'svelte-sonner';
	import { goto, invalidateAll } from '$app/navigation';
	import { organizations } from '@aphexcms/cms-core/client/ui';
	import type { Organization } from '@aphexcms/cms-core';

	type Props = {
		organization: Organization & { members: unknown[] };
		/** Only owners may delete; the server enforces this too. */
		canDelete: boolean;
	};

	let { organization, canDelete }: Props = $props();

	let open = $state(false);
	let confirmation = $state('');
	let isDeleting = $state(false);

	const memberCount = $derived(organization.members.length);
	const confirmed = $derived(confirmation.trim() === organization.name);

	function onOpenChange(next: boolean) {
		if (isDeleting) return;
		open = next;
		if (!next) confirmation = '';
	}

	async function deleteOrganization() {
		if (!confirmed || isDeleting) return;

		isDeleting = true;
		try {
			const result = await organizations.remove(organization.id);
			if (!result.success) {
				throw new Error(result.error || result.message || 'Could not delete this workspace');
			}

			// The server moves everyone still signed in onto another workspace, or clears
			// their active one. Reload from the server rather than patching local state —
			// which workspace you land in is its decision, not something to guess at here.
			await invalidateAll();
			await goto('/admin');
			toast.success(`${organization.name} was deleted`);
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Could not delete this workspace');
			isDeleting = false;
		}
	}
</script>

<Card.Root class="border-destructive/40">
	<Card.Content class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
		<div class="space-y-1">
			<p class="text-sm font-medium">Delete workspace</p>
			<p class="text-muted-foreground max-w-prose text-sm">
				Permanently deletes <span class="font-medium">{organization.name}</span> along with every document,
				uploaded file, role and invitation in it. This can't be undone.
			</p>
			{#if !canDelete}
				<p class="text-muted-foreground text-sm">Only owners can delete a workspace.</p>
			{/if}
		</div>

		<Button
			variant="destructive"
			class="shrink-0"
			disabled={!canDelete}
			onclick={() => (open = true)}
		>
			Delete workspace
		</Button>
	</Card.Content>
</Card.Root>

<Dialog.Root {open} {onOpenChange}>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>Delete {organization.name}?</Dialog.Title>
			<Dialog.Description>
				Every document, uploaded file, role and invitation in this workspace is erased, and
				{memberCount === 1 ? 'its member is' : `all ${memberCount} members are`} removed. This is permanent.
			</Dialog.Description>
		</Dialog.Header>

		<div class="grid gap-2 py-2">
			<Label for="delete-org-confirmation">
				Type <span class="font-mono font-medium">{organization.name}</span> to confirm
			</Label>
			<Input
				id="delete-org-confirmation"
				bind:value={confirmation}
				autocomplete="off"
				disabled={isDeleting}
			/>
		</div>

		<Dialog.Footer>
			<Button variant="outline" onclick={() => onOpenChange(false)} disabled={isDeleting}>
				Cancel
			</Button>
			<Button
				variant="destructive"
				onclick={deleteOrganization}
				disabled={!confirmed || isDeleting}
			>
				{isDeleting ? 'Deleting…' : 'Delete workspace'}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
