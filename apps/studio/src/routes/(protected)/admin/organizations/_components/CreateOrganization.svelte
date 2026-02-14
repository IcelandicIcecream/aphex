<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { Button } from '@aphexcms/ui/shadcn/button';
	import { Input } from '@aphexcms/ui/shadcn/input';
	import { Label } from '@aphexcms/ui/shadcn/label';
	import * as Dialog from '@aphexcms/ui/shadcn/dialog';
	import { organizations } from '@aphexcms/cms-core/client';

	let open = $state(false);
	let name = $state('');
	let slug = $state('');
	let isSubmitting = $state(false);
	let error = $state<string | null>(null);

	function generateSlug(text: string): string {
		return text
			.toLowerCase()
			.trim()
			.replace(/[^\w\s-]/g, '')
			.replace(/[\s_-]+/g, '-')
			.replace(/^-+|-+$/g, '');
	}

	function handleNameInput(event: Event) {
		const target = event.target as HTMLInputElement;
		name = target.value;
		if (!slug || slug === generateSlug(name.slice(0, -1))) {
			slug = generateSlug(name);
		}
	}

	function handleSlugInput(event: Event) {
		const target = event.target as HTMLInputElement;
		slug = target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
	}

	function resetForm() {
		name = '';
		slug = '';
		error = null;
	}

	async function handleSubmit(event: Event) {
		event.preventDefault();
		error = null;

		if (!name.trim() || !slug.trim()) {
			error = 'Name and slug are required';
			return;
		}

		isSubmitting = true;
		try {
			const result = await organizations.create({
				name: name.trim(),
				slug: slug.trim()
			});

			if (!result.success || !result.data) {
				throw new Error('Failed to create organization');
			}

			resetForm();
			open = false;
			await invalidateAll();
			await goto(`/admin?orgId=${result.data.id}`);
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to create organization';
		} finally {
			isSubmitting = false;
		}
	}
</script>

<Dialog.Root bind:open onOpenChange={(v) => !v && resetForm()}>
	<Dialog.Trigger>
		{#snippet child({ props })}
			<Button {...props}>Create Organization</Button>
		{/snippet}
	</Dialog.Trigger>
	<Dialog.Content class="sm:max-w-[480px]">
		<Dialog.Header>
			<Dialog.Title>Create Organization</Dialog.Title>
			<Dialog.Description>Create a new organization for your instance</Dialog.Description>
		</Dialog.Header>
		<form onsubmit={handleSubmit} class="grid gap-4 py-4">
			<div>
				<Label for="org-name">Organization name</Label>
				<Input
					id="org-name"
					value={name}
					oninput={handleNameInput}
					placeholder="My Organization"
					disabled={isSubmitting}
					class="mt-1"
				/>
			</div>
			<div>
				<Label for="org-slug">Slug</Label>
				<div class="mt-1 flex gap-2">
					<Input
						id="org-slug"
						value={slug}
						oninput={handleSlugInput}
						placeholder="my-organization"
						disabled={isSubmitting}
						class="flex-1"
					/>
					<Button
						type="button"
						variant="outline"
						size="sm"
						onclick={() => (slug = generateSlug(name))}
						disabled={!name.trim() || isSubmitting}
					>
						Generate
					</Button>
				</div>
				<p class="text-muted-foreground mt-1 text-xs">
					Lowercase letters, numbers, and hyphens only.
				</p>
			</div>
			{#if error}
				<p class="text-destructive text-sm">{error}</p>
			{/if}
			<Dialog.Footer>
				<Button type="button" variant="outline" onclick={() => (open = false)} disabled={isSubmitting}>
					Cancel
				</Button>
				<Button type="submit" disabled={isSubmitting || !name.trim()}>
					{isSubmitting ? 'Creating...' : 'Create'}
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>
