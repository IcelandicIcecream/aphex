<script lang="ts">
	import { Button } from '@aphexcms/ui/shadcn/button';
	import { Input } from '@aphexcms/ui/shadcn/input';
	import { Label } from '@aphexcms/ui/shadcn/label';
	import * as Card from '@aphexcms/ui/shadcn/card';
	import { invalidateAll } from '$app/navigation';
	import type { Organization } from '@aphexcms/cms-core';
	import { organizations } from '@aphexcms/cms-core/client';

	type Props = {
		activeOrganization: Organization & { members: any[] };
		currentUserId: string;
	};

	let { activeOrganization, currentUserId }: Props = $props();

	let editOrgName = $state(activeOrganization.name);
	let editOrgSlug = $state(activeOrganization.slug);
	let isUpdatingOrg = $state(false);
	let error = $state<string | null>(null);

	function generateSlug(text: string): string {
		return text
			.toLowerCase()
			.trim()
			.replace(/[^\w\s-]/g, '')
			.replace(/[\s_-]+/g, '-')
			.replace(/^-+|-+$/g, '');
	}

	function handleSlugInput(event: Event) {
		const target = event.target as HTMLInputElement;
		editOrgSlug = target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
	}

	async function updateOrganization() {
		if (!editOrgName.trim() || !editOrgSlug.trim()) {
			error = 'Please enter both organization name and slug';
			return;
		}

		isUpdatingOrg = true;
		error = null;
		try {
			const result = await organizations.update(activeOrganization.id, {
				name: editOrgName.trim(),
				slug: editOrgSlug.trim()
			});

			if (!result.success) {
				throw new Error(result.error || 'Failed to update organization');
			}

			await invalidateAll();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to update organization';
		} finally {
			isUpdatingOrg = false;
		}
	}
</script>

<Card.Root>
	<Card.Header>
		<Card.Title>Organization</Card.Title>
		<Card.Description>Manage your organization name and slug</Card.Description>
	</Card.Header>
	<Card.Content>
		<div class="grid gap-4">
			<div>
				<Label for="org-name">Organization Name</Label>
				<Input id="org-name" bind:value={editOrgName} placeholder="Acme Inc" class="mt-1" />
			</div>
			<div>
				<Label for="org-slug">Slug</Label>
				<div class="mt-1 flex gap-2">
					<Input
						id="org-slug"
						value={editOrgSlug}
						oninput={handleSlugInput}
						placeholder="acme-inc"
						class="flex-1"
					/>
					<Button
						variant="outline"
						size="sm"
						onclick={() => (editOrgSlug = generateSlug(editOrgName))}
						disabled={!editOrgName.trim()}
					>
						Generate
					</Button>
				</div>
				<p class="text-muted-foreground mt-1 text-xs">
					Used in URLs. Lowercase letters, numbers, and hyphens only.
				</p>
			</div>
			{#if error}
				<p class="text-destructive text-sm">{error}</p>
			{/if}
		</div>
	</Card.Content>
	<Card.Footer class="border-t px-6 py-4">
		<Button onclick={updateOrganization} disabled={isUpdatingOrg}>
			{isUpdatingOrg ? 'Saving...' : 'Save'}
		</Button>
	</Card.Footer>
</Card.Root>
