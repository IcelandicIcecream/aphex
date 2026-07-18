<script lang="ts">
	import { Button } from '@aphexcms/ui/shadcn/button';
	import { Input } from '@aphexcms/ui/shadcn/input';
	import { Label } from '@aphexcms/ui/shadcn/label';
	import * as Card from '@aphexcms/ui/shadcn/card';
	import * as Avatar from '@aphexcms/ui/shadcn/avatar';
	import * as Alert from '@aphexcms/ui/shadcn/alert';
	import { invalidateAll } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import { CalendarDays, Copy, Upload, Users } from '@lucide/svelte';
	import type { Organization } from '@aphexcms/cms-core';
	import { assets, organizations } from '@aphexcms/cms-core/client/ui';

	type Props = {
		activeOrganization: Organization & { members: any[] };
	};

	let { activeOrganization }: Props = $props();

	let editOrgName = $state('');
	let editOrgSlug = $state('');
	let editOrgLogo = $state('');
	let isUpdatingOrg = $state(false);
	let isUploadingLogo = $state(false);
	let isDraggingLogo = $state(false);
	let logoDragDepth = 0;
	let error = $state<string | null>(null);
	let logoInput: HTMLInputElement | null = $state(null);

	// Sync local state when the active organization changes (e.g. org switch)
	$effect(() => {
		editOrgName = activeOrganization.name;
		editOrgSlug = activeOrganization.slug;
		error = null;
		editOrgLogo = activeOrganization.metadata?.logo || '';
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
		toast.success('Copied to clipboard');
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
				slug: editOrgSlug.trim(),
				metadata: {
					...(activeOrganization.metadata ?? {}),
					logo: editOrgLogo || undefined
				}
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

	async function uploadOrganizationLogo(file: File) {
		if (!file.type.startsWith('image/')) {
			toast.error('Please choose an image file');
			return;
		}

		isUploadingLogo = true;
		try {
			const formData = new FormData();
			formData.append('file', file);
			formData.append('title', `${activeOrganization.name} logo`);
			formData.append('fieldPath', 'organization.metadata.logo');
			formData.append('system', 'true');
			formData.append('usage', 'organization-logo');
			formData.append(
				'allowedMimeTypes',
				JSON.stringify(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'])
			);
			formData.append('maxSize', String(5 * 1024 * 1024));

			const upload = await assets.upload(formData);
			if (!upload.success || !upload.data?.url) {
				throw new Error(upload.error || upload.message || 'Failed to upload organization icon');
			}

			editOrgLogo = upload.data.url;
			const result = await organizations.update(activeOrganization.id, {
				metadata: {
					...(activeOrganization.metadata ?? {}),
					logo: editOrgLogo
				}
			});

			if (!result.success) {
				throw new Error(result.error || 'Failed to save organization icon');
			}

			toast.success('Organization icon updated successfully');
			await invalidateAll();
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Failed to upload organization icon');
		} finally {
			isUploadingLogo = false;
			if (logoInput) logoInput.value = '';
		}
	}

	function handleLogoDragEnter(event: DragEvent) {
		event.preventDefault();
		if (isUploadingLogo || isUpdatingOrg) return;
		logoDragDepth += 1;
		isDraggingLogo = true;
	}

	function handleLogoDragOver(event: DragEvent) {
		event.preventDefault();
	}

	function handleLogoDragLeave(event: DragEvent) {
		event.preventDefault();
		logoDragDepth = Math.max(0, logoDragDepth - 1);
		if (logoDragDepth === 0) isDraggingLogo = false;
	}

	function handleLogoDrop(event: DragEvent) {
		event.preventDefault();
		logoDragDepth = 0;
		isDraggingLogo = false;
		const file = event.dataTransfer?.files?.[0];
		if (file) uploadOrganizationLogo(file);
	}
</script>

<Card.Root>
	<Card.Header>
		<Card.Title>Identity</Card.Title>
		<Card.Description>Shown to members and in API responses.</Card.Description>
	</Card.Header>

	<Card.Content>
		<div class="grid gap-6 lg:grid-cols-[150px_1fr]">
			<div class="flex flex-col gap-3">
				<button
					type="button"
					class="border-border bg-muted/30 group relative flex h-28 w-28 items-center justify-center overflow-hidden rounded-xl border transition-colors sm:h-[130px] sm:w-[130px] {isDraggingLogo
						? 'border-primary bg-primary/10'
						: 'hover:bg-muted/50'}"
					onclick={() => logoInput?.click()}
					ondragenter={handleLogoDragEnter}
					ondragover={handleLogoDragOver}
					ondragleave={handleLogoDragLeave}
					ondrop={handleLogoDrop}
					disabled={isUploadingLogo || isUpdatingOrg}
					aria-label="Upload organization icon"
				>
					<Avatar.Root class="h-full w-full rounded-xl">
						{#if editOrgLogo}
							<Avatar.Image src={editOrgLogo} alt={activeOrganization.name} class="object-cover" />
						{/if}
						<Avatar.Fallback class="bg-transparent text-3xl font-semibold">
							{orgInitials}
						</Avatar.Fallback>
					</Avatar.Root>
					<div
						class="absolute inset-0 flex items-center justify-center bg-black/45 text-xs font-medium text-white opacity-0 transition-opacity group-hover:opacity-100"
					>
						<span class="flex flex-col items-center gap-1.5">
							<Upload class="h-4 w-4" />
							Replace icon
						</span>
					</div>
					{#if isDraggingLogo || isUploadingLogo}
						<div
							class="bg-background/80 absolute inset-0 flex items-center justify-center text-xs font-medium"
						>
							{isUploadingLogo ? 'Uploading...' : 'Drop image'}
						</div>
					{/if}
				</button>
				<div class="flex flex-wrap gap-2">
					<input
						bind:this={logoInput}
						type="file"
						accept="image/*"
						class="hidden"
						onchange={(event) => {
							const file = (event.currentTarget as HTMLInputElement).files?.[0];
							if (file) uploadOrganizationLogo(file);
						}}
					/>
					<Button
						type="button"
						variant="outline"
						size="sm"
						onclick={() => logoInput?.click()}
						disabled={isUploadingLogo || isUpdatingOrg}
					>
						<Upload class="mr-1.5 h-3.5 w-3.5" />
						{isUploadingLogo ? 'Uploading...' : 'Replace'}
					</Button>
					{#if editOrgLogo}
						<Button
							type="button"
							variant="ghost"
							size="sm"
							onclick={() => (editOrgLogo = '')}
							disabled={isUploadingLogo || isUpdatingOrg}
						>
							Remove
						</Button>
					{/if}
				</div>
				<p class="text-muted-foreground max-w-[150px] text-xs leading-5">
					JPG, PNG, WebP, GIF, or SVG. Max 5MB.
				</p>
			</div>

			<div class="grid content-start gap-4 md:grid-cols-2">
				<div>
					<Label for="org-name">Display Name</Label>
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
				</div>
				<div>
					<Label for="org-id">Organization ID</Label>
					<div class="mt-2 flex gap-2">
						<Input
							id="org-id"
							value={activeOrganization.id}
							disabled
							class="min-w-0 flex-1 font-mono"
						/>
						<Button
							variant="outline"
							size="icon"
							type="button"
							class="shrink-0"
							onclick={() => copyToClipboard(activeOrganization.id)}
						>
							<Copy class="h-4 w-4" />
						</Button>
					</div>
				</div>
				<div>
					<Label>Created</Label>
					<div
						class="border-input bg-muted/30 text-muted-foreground mt-2 flex h-10 items-center gap-2 rounded-md border px-3 text-sm"
					>
						<CalendarDays class="h-4 w-4" />
						{formattedDate}
					</div>
				</div>
				<div class="text-muted-foreground flex items-center gap-2 text-sm md:col-span-2">
					<Users class="h-4 w-4" />
					<span>
						{activeOrganization.members.length} member{activeOrganization.members.length !== 1
							? 's'
							: ''}
					</span>
				</div>
				{#if error}
					<Alert.Root variant="destructive" class="md:col-span-2">
						<Alert.Description>{error}</Alert.Description>
					</Alert.Root>
				{/if}
			</div>
		</div>
	</Card.Content>
	<Card.Footer class="flex justify-end gap-2 border-t px-6 py-4">
		<Button
			variant="outline"
			onclick={() => {
				editOrgName = activeOrganization.name;
				editOrgSlug = activeOrganization.slug;
				editOrgLogo = activeOrganization.metadata?.logo || '';
				error = null;
			}}
			disabled={isUpdatingOrg || isUploadingLogo}
		>
			Discard
		</Button>
		<Button onclick={updateOrganization} disabled={isUpdatingOrg}>
			{isUpdatingOrg ? 'Saving...' : 'Save changes'}
		</Button>
	</Card.Footer>
</Card.Root>
