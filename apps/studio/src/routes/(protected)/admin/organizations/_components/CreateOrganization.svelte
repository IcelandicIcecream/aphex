<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { Button } from '@aphex/ui/shadcn/button';
	import { Input } from '@aphex/ui/shadcn/input';
	import { Label } from '@aphex/ui/shadcn/label';
	import * as Card from '@aphex/ui/shadcn/card';

	let name = $state('');
	let slug = $state('');
	let isSubmitting = $state(false);
	let error = $state<string | null>(null);

	// Auto-generate slug from name
	function generateSlug(text: string): string {
		return text
			.toLowerCase()
			.trim()
			.replace(/[^\w\s-]/g, '')
			.replace(/[\s_-]+/g, '-')
			.replace(/^-+|-+$/g, '');
	}

	function handleNameChange(event: Event) {
		const target = event.target as HTMLInputElement;
		name = target.value;

		if (!slug || slug === generateSlug(name.slice(0, -1))) {
			slug = generateSlug(name);
		}
	}

	function handleSlugChange(event: Event) {
		const target = event.target as HTMLInputElement;
		slug = generateSlug(target.value);
	}

	async function handleSubmit(event: Event) {
		event.preventDefault();
		error = null;

		if (!name.trim()) {
			error = 'Organization name is required';
			return;
		}

		if (!slug.trim()) {
			error = 'Organization slug is required';
			return;
		}

		if (slug.length < 3) {
			error = 'Slug must be at least 3 characters long';
			return;
		}

		isSubmitting = true;

		try {
			const response = await fetch('/api/organizations', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					name: name.trim(),
					slug: slug.trim()
				})
			});

			const result = await response.json();

			if (!response.ok || !result.success) {
				throw new Error(result.message || result.error || 'Failed to create organization');
			}

			// Backend already switched to the new org, so redirect with orgId
			const newOrgId = result.data.id;

			// Invalidate all data to refetch with new organization context
			await invalidateAll();

			await goto(`/admin?orgId=${newOrgId}`);
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to create organization';
		} finally {
			isSubmitting = false;
		}
	}

	function handleCancel() {
		goto('/admin/organizations');
	}
</script>

<Card.Root>
	<Card.Header>
		<Card.Title>Organization Details</Card.Title>
		<Card.Description>
			Enter the basic information for your new organization
		</Card.Description>
	</Card.Header>

	<Card.Content>
		<form onsubmit={handleSubmit} class="space-y-6">
			<!-- Organization Name -->
			<div class="space-y-2">
				<Label for="name">
					Organization Name <span class="text-destructive">*</span>
				</Label>
				<Input
					id="name"
					type="text"
					placeholder="Acme Corporation"
					value={name}
					oninput={handleNameChange}
					disabled={isSubmitting}
					required
				/>
				<p class="text-muted-foreground text-sm">
					The display name for your organization
				</p>
			</div>

			<!-- Organization Slug -->
			<div class="space-y-2">
				<Label for="slug">
					Slug <span class="text-destructive">*</span>
				</Label>
				<Input
					id="slug"
					type="text"
					placeholder="acme-corporation"
					value={slug}
					oninput={handleSlugChange}
					disabled={isSubmitting}
					required
					pattern="[a-z0-9-]+"
				/>
				<p class="text-muted-foreground text-sm">
					A unique identifier for your organization (lowercase letters, numbers, and hyphens
					only)
				</p>
				{#if slug}
					<p class="text-muted-foreground text-sm">
						Preview: <code class="bg-muted rounded px-1.5 py-0.5">{slug}</code>
					</p>
				{/if}
			</div>

			<!-- Error Message -->
			{#if error}
				<div
					class="bg-destructive/10 text-destructive border-destructive/20 rounded-lg border p-4"
				>
					<p class="font-medium">Error</p>
					<p class="text-sm">{error}</p>
				</div>
			{/if}

			<!-- Actions -->
			<div class="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
				<Button
					type="button"
					variant="outline"
					onclick={handleCancel}
					disabled={isSubmitting}
					class="w-full sm:w-auto"
				>
					Cancel
				</Button>
				<Button
					type="submit"
					disabled={isSubmitting || !name.trim() || !slug.trim()}
					class="w-full sm:w-auto"
				>
					{#if isSubmitting}
						Creating...
					{:else}
						Create Organization
					{/if}
				</Button>
			</div>
		</form>
	</Card.Content>
</Card.Root>
