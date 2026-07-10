<script lang="ts">
	import { Button } from '@aphexcms/ui/shadcn/button';
	import { Input } from '@aphexcms/ui/shadcn/input';
	import { Label } from '@aphexcms/ui/shadcn/label';
	import { Badge } from '@aphexcms/ui/shadcn/badge';
	import { Switch } from '@aphexcms/ui/shadcn/switch';
	import * as Card from '@aphexcms/ui/shadcn/card';
	import { invalidateAll } from '$app/navigation';
	import type { CMSUser, UserSessionPreferences } from '@aphexcms/cms-core';
	import { assets, user as userApi } from '@aphexcms/cms-core/client';
	import { Building2, Lock, Upload } from '@lucide/svelte';
	import { toast } from 'svelte-sonner';

	type Props = {
		user: CMSUser;
		userPreferences?: UserSessionPreferences | null;
		hasChildOrganizations?: boolean;
	};

	let { user, userPreferences = null, hasChildOrganizations = false }: Props = $props();

	let userName = $state('');
	let userImage = $state('');
	let isUpdating = $state(false);
	let isUploadingImage = $state(false);
	let isDraggingImage = $state(false);
	let imageDragDepth = 0;
	let includeChildOrganizations = $state(false);
	let isUpdatingPreferences = $state(false);
	let imageInput: HTMLInputElement | null = $state(null);

	$effect(() => {
		userName = user.name || '';
		userImage = user.image || '';
		includeChildOrganizations = userPreferences?.includeChildOrganizations ?? false;
	});

	function getRoleBadgeVariant(role: string): 'default' | 'secondary' | 'outline' | 'destructive' {
		switch (role) {
			case 'super_admin':
				return 'default';
			case 'admin':
				return 'secondary';
			default:
				return 'outline';
		}
	}

	function formatRole(role: string): string {
		return role.replace(/_/g, ' ');
	}

	async function updateProfile() {
		if (!userName.trim()) {
			toast.error('Please enter your name');
			return;
		}

		isUpdating = true;
		try {
			const result = await userApi.updateProfile({
				name: userName.trim(),
				image: userImage || null
			});

			if (!result.success) {
				throw new Error(result.error || result.message || 'Failed to update profile');
			}

			toast.success('Profile updated successfully');
			await invalidateAll();
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Failed to update profile');
		} finally {
			isUpdating = false;
		}
	}

	async function updatePreferences(prefs: Partial<UserSessionPreferences>) {
		isUpdatingPreferences = true;
		try {
			const result = await userApi.updatePreferences(prefs);

			if (!result.success) {
				throw new Error(result.error || result.message || 'Failed to update preferences');
			}
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Failed to update preferences');
			// Revert on error
			if (prefs.includeChildOrganizations !== undefined) {
				includeChildOrganizations = !prefs.includeChildOrganizations;
			}
		} finally {
			isUpdatingPreferences = false;
		}
	}

	async function uploadProfileImage(file: File) {
		if (!file.type.startsWith('image/')) {
			toast.error('Please choose an image file');
			return;
		}

		isUploadingImage = true;
		try {
			const formData = new FormData();
			formData.append('file', file);
			formData.append('title', `${user.name || user.email} avatar`);
			formData.append('fieldPath', 'user.image');
			formData.append('system', 'true');
			formData.append('usage', 'user-avatar');
			formData.append(
				'allowedMimeTypes',
				JSON.stringify(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
			);
			formData.append('maxSize', String(5 * 1024 * 1024));

			const upload = await assets.upload(formData);
			if (!upload.success || !upload.data?.url) {
				throw new Error(upload.error || upload.message || 'Failed to upload avatar');
			}

			userImage = upload.data.url;
			const result = await userApi.updateProfile({ image: userImage });
			if (!result.success) {
				throw new Error(result.error || result.message || 'Failed to save avatar');
			}

			toast.success('Avatar updated successfully');
			await invalidateAll();
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Failed to upload avatar');
		} finally {
			isUploadingImage = false;
			if (imageInput) imageInput.value = '';
		}
	}

	function handleImageDragEnter(event: DragEvent) {
		event.preventDefault();
		if (isUploadingImage || isUpdating) return;
		imageDragDepth += 1;
		isDraggingImage = true;
	}

	function handleImageDragOver(event: DragEvent) {
		event.preventDefault();
	}

	function handleImageDragLeave(event: DragEvent) {
		event.preventDefault();
		imageDragDepth = Math.max(0, imageDragDepth - 1);
		if (imageDragDepth === 0) isDraggingImage = false;
	}

	function handleImageDrop(event: DragEvent) {
		event.preventDefault();
		imageDragDepth = 0;
		isDraggingImage = false;
		const file = event.dataTransfer?.files?.[0];
		if (file) uploadProfileImage(file);
	}
</script>

<div class="space-y-6">
	<!-- Profile Information -->
	<Card.Root>
		<Card.Header class="flex flex-row items-start justify-between gap-4">
			<div class="space-y-1.5">
				<Card.Title>Identity</Card.Title>
				<Card.Description>Your public profile inside this workspace.</Card.Description>
			</div>
			<Badge
				variant={getRoleBadgeVariant(user.role)}
				class="shrink-0 px-2.5 py-1 text-xs font-medium capitalize"
			>
				{formatRole(user.role)}
			</Badge>
		</Card.Header>

		<Card.Content>
			<div class="space-y-4">
				<div>
					<div class="flex flex-col gap-4 sm:flex-row sm:items-center">
						<button
							type="button"
							class="border-border bg-muted/30 group relative flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-xl border transition-colors sm:h-[130px] sm:w-[130px] {isDraggingImage
								? 'border-primary bg-primary/10'
								: 'hover:bg-muted/50'}"
							onclick={() => imageInput?.click()}
							ondragenter={handleImageDragEnter}
							ondragover={handleImageDragOver}
							ondragleave={handleImageDragLeave}
							ondrop={handleImageDrop}
							disabled={isUploadingImage || isUpdating}
							aria-label="Upload avatar"
						>
							{#if userImage}
								<img
									src={userImage}
									alt={user.name || user.email}
									class="h-full w-full object-cover"
								/>
							{:else}
								<div class="bg-muted h-full w-full"></div>
							{/if}
							<div
								class="absolute inset-0 flex items-center justify-center bg-black/45 text-xs font-medium text-white opacity-0 transition-opacity group-hover:opacity-100"
							>
								<span class="flex flex-col items-center gap-1.5">
									<Upload class="h-4 w-4" />
									Upload icon
								</span>
							</div>
							{#if isDraggingImage || isUploadingImage}
								<div
									class="bg-background/80 absolute inset-0 flex items-center justify-center text-xs font-medium"
								>
									{isUploadingImage ? 'Uploading...' : 'Drop image'}
								</div>
							{/if}
						</button>
						<div class="min-w-0 flex-1 space-y-3">
							<div>
								<h2 class="truncate text-lg font-semibold">{userName || user.email}</h2>
								<p class="text-muted-foreground mt-0.5 truncate text-sm">{user.email}</p>
							</div>
							<input
								bind:this={imageInput}
								type="file"
								accept="image/*"
								class="hidden"
								onchange={(event) => {
									const file = (event.currentTarget as HTMLInputElement).files?.[0];
									if (file) uploadProfileImage(file);
								}}
							/>
							<div class="flex flex-wrap gap-2">
								<Button
									type="button"
									variant="outline"
									onclick={() => imageInput?.click()}
									disabled={isUploadingImage || isUpdating}
								>
									<Upload class="mr-2 h-4 w-4" />
									{isUploadingImage ? 'Uploading...' : 'Upload avatar'}
								</Button>
								{#if userImage}
									<Button
										type="button"
										variant="ghost"
										onclick={() => (userImage = '')}
										disabled={isUploadingImage || isUpdating}
									>
										Remove
									</Button>
								{/if}
							</div>
							<p class="text-muted-foreground text-xs">
								Drag an image here, or choose a file. JPG, PNG, WebP, or GIF. Max 5MB.
							</p>
						</div>
					</div>
				</div>
				<div>
					<Label for="user-name">Display Name</Label>
					<Input id="user-name" bind:value={userName} placeholder="Your name" class="mt-2" />
				</div>
				<div>
					<Label for="user-email">Email</Label>
					<div class="relative mt-1">
						<Input id="user-email" type="email" value={user.email} disabled class="pr-9" />
						<Lock
							class="text-muted-foreground absolute top-1/2 right-3 h-3.5 w-3.5 -translate-y-1/2"
						/>
					</div>
					<p class="text-muted-foreground mt-1 text-xs">Managed by your authentication provider</p>
				</div>
			</div>
		</Card.Content>
		<Card.Footer class="flex justify-end border-t px-6 py-4">
			<Button onclick={updateProfile} disabled={isUpdating}>
				{isUpdating ? 'Saving...' : 'Save changes'}
			</Button>
		</Card.Footer>
	</Card.Root>

	<!-- Preferences -->
	{#if hasChildOrganizations}
		<Card.Root>
			<Card.Header>
				<Card.Title>Content Preferences</Card.Title>
				<Card.Description
					>Control how organization content appears in your workspace.</Card.Description
				>
			</Card.Header>
			<Card.Content>
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-3">
						<Building2 class="text-muted-foreground h-5 w-5" />
						<div>
							<Label class="text-base font-medium">Include child organizations</Label>
							<p class="text-muted-foreground text-sm">
								Show documents from child organizations in your content lists
							</p>
						</div>
					</div>
					<Switch
						checked={includeChildOrganizations}
						disabled={isUpdatingPreferences}
						onCheckedChange={(checked) => {
							includeChildOrganizations = checked;
							updatePreferences({ includeChildOrganizations: checked });
						}}
					/>
				</div>
			</Card.Content>
		</Card.Root>
	{/if}
</div>
