<script lang="ts">
	import { Button } from '@aphexcms/ui/shadcn/button';
	import { Input } from '@aphexcms/ui/shadcn/input';
	import { Label } from '@aphexcms/ui/shadcn/label';
	import * as Card from '@aphexcms/ui/shadcn/card';
	import * as Avatar from '@aphexcms/ui/shadcn/avatar';
	import { Separator } from '@aphexcms/ui/shadcn/separator';
	import { invalidateAll } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import { Copy, Users } from '@lucide/svelte';
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

	// Sync local state when the active organization changes (e.g. org switch)
	$effect(() => {
		editOrgName = activeOrganization.name;
		editOrgSlug = activeOrganization.slug;
		error = null;
	});

	const orgInitials = $derived(
		activeOrganization.name
			.split(' ')
			.map((w) => w[0])
			.join('')
			.toUpperCase()
			.slice(0, 2)
	);

	const formattedDate = $derived(
		new Date(activeOrganization.createdAt).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		})
	);

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

	function copyToClipboard(text: string) {
		navigator.clipboard.writeText(text);
		toast.success('Copied to clipboard!');
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

			toast.success('Organization updated successfully');
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
		<div class="flex items-center gap-4">
			<Avatar.Root class="h-12 w-12 text-lg">
				{#if activeOrganization.metadata?.logo}
					<Avatar.Image src={activeOrganization.metadata.logo} alt={activeOrganization.name} />
				{/if}
				<Avatar.Fallback>{orgInitials}</Avatar.Fallback>
			</Avatar.Root>
			<div class="min-w-0 flex-1">
				<Card.Title class="text-lg">{activeOrganization.name}</Card.Title>
				<div class="text-muted-foreground mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
					<span class="flex items-center gap-1">
						<Users class="h-3 w-3" />
						{activeOrganization.members.length} member{activeOrganization.members.length !== 1
							? 's'
							: ''}
					</span>
					<span>Created {formattedDate}</span>
				</div>
			</div>
		</div>
	</Card.Header>

	<Card.Content>
		<!-- Org ID -->
		<div class="mb-4">
			<Label class="text-muted-foreground text-xs">Organization ID</Label>
			<div class="mt-1 flex items-center gap-2">
				<code
					class="bg-muted text-muted-foreground flex-1 truncate rounded-md px-3 py-1.5 font-mono text-xs"
				>
					{activeOrganization.id}
				</code>
				<Button
					variant="ghost"
					size="icon"
					class="h-7 w-7 shrink-0"
					onclick={() => copyToClipboard(activeOrganization.id)}
				>
					<Copy class="h-3.5 w-3.5" />
				</Button>
			</div>
		</div>

		<Separator class="mb-4" />

		<div class="grid gap-4">
			<div>
				<Label for="org-name">Organization Name</Label>
				<Input id="org-name" bind:value={editOrgName} placeholder="Acme Inc" class="mt-2" />
			</div>
			<div>
				<Label for="org-slug">Slug</Label>
				<div class="mt-2 flex gap-2">
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
				<p class="text-muted-foreground mt-1.5 font-mono text-xs">
					/{editOrgSlug || 'your-slug'}
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
