<script lang="ts">
	import { Button } from '@aphexcms/ui/shadcn/button';
	import { Input } from '@aphexcms/ui/shadcn/input';
	import { Label } from '@aphexcms/ui/shadcn/label';
	import { Badge } from '@aphexcms/ui/shadcn/badge';
	import * as Card from '@aphexcms/ui/shadcn/card';
	import * as Avatar from '@aphexcms/ui/shadcn/avatar';
	import { invalidateAll } from '$app/navigation';
	import type { CMSUser } from '@aphexcms/cms-core';
	import { assets, user as userApi } from '@aphexcms/cms-core/client/ui';
	import { Lock, Upload } from '@lucide/svelte';
	import { toast } from 'svelte-sonner';

	type Props = {
		user: CMSUser;
	};

	let { user }: Props = $props();

	/**
	 * Mirrors the server's limit in `updateUserRequest` so the field stops taking
	 * input rather than failing on save. The server bound is the real one — this
	 * is only here so you find out before the round-trip.
	 */
	const NAME_MAX_LENGTH = 80;

	let userName = $state('');
	let userImage = $state('');
	let isUpdating = $state(false);
	let isUploadingImage = $state(false);
	let isRemovingImage = $state(false);
	let isDraggingImage = $state(false);
	let imageDragDepth = 0;
	let imageInput: HTMLInputElement | null = $state(null);

	$effect(() => {
		userName = user.name || '';
		userImage = user.image || '';
	});

	/** Initials so an empty avatar reads as "no picture yet" rather than as a broken one. */
	const initials = $derived(
		(userName.trim() || user.email)
			.split(/[\s@._-]+/)
			.filter(Boolean)
			.slice(0, 2)
			.map((part) => part[0]?.toUpperCase() ?? '')
			.join('')
	);

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

	/**
	 * Avatars are stored as the CDN path `/media/<id>/<filename>` rather than the
	 * storage adapter's direct URL. Two reasons: the asset id stays recoverable
	 * from the profile field, which is what makes replace and remove able to
	 * clean up after themselves instead of orphaning images in object storage;
	 * and reads go through the asset route, so tightening access later is a
	 * change there rather than a migration of every stored URL.
	 */
	function avatarPath(asset: { id: string; originalFilename: string }): string {
		return `/media/${asset.id}/${encodeURIComponent(asset.originalFilename)}`;
	}

	async function uploadProfileImage(file: File) {
		if (!file.type.startsWith('image/')) {
			toast.error('Please choose an image file');
			return;
		}

		const previous = userImage;

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
			if (!upload.success || !upload.data) {
				throw new Error(upload.error || upload.message || 'Failed to upload avatar');
			}

			userImage = avatarPath(upload.data);
			// The server reaps the avatar this replaces, so there's nothing to clean up
			// here on success. On failure the *new* asset is the orphan — the profile
			// never moved, so the server has no idea it exists.
			const result = await userApi.updateProfile({ image: userImage });
			if (!result.success) {
				await assets.delete(upload.data.id).catch(() => {});
				userImage = previous;
				throw new Error(result.error || result.message || 'Failed to save avatar');
			}

			toast.success('Avatar updated');
			await invalidateAll();
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Failed to upload avatar');
		} finally {
			isUploadingImage = false;
			if (imageInput) imageInput.value = '';
		}
	}

	async function removeProfileImage() {
		if (!userImage) return;

		isRemovingImage = true;
		try {
			const result = await userApi.updateProfile({ image: null });
			if (!result.success) {
				throw new Error(result.error || result.message || 'Failed to remove avatar');
			}

			userImage = '';
			toast.success('Avatar removed');
			await invalidateAll();
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Failed to remove avatar');
		} finally {
			isRemovingImage = false;
		}
	}

	function handleImageDragEnter(event: DragEvent) {
		event.preventDefault();
		if (isUploadingImage || isRemovingImage || isUpdating) return;
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
			<!--
				Avatar left, fields stacked right. The picture and the name are one
				answer to "who am I here", so they sit on one row; the avatar's own
				controls live under it rather than beside the fields, where they read
				as actions on whatever they were nearest to.
			-->
			<div class="flex flex-col gap-6 sm:flex-row sm:items-start">
				<div class="flex w-[130px] shrink-0 flex-col gap-2">
					<button
						type="button"
						class="border-border bg-muted/30 group relative flex h-[130px] w-[130px] shrink-0 items-center justify-center overflow-hidden rounded-xl border transition-colors {isDraggingImage
							? 'border-primary bg-primary/10'
							: 'hover:bg-muted/50'}"
						onclick={() => imageInput?.click()}
						ondragenter={handleImageDragEnter}
						ondragover={handleImageDragOver}
						ondragleave={handleImageDragLeave}
						ondrop={handleImageDrop}
						disabled={isUploadingImage || isRemovingImage || isUpdating}
						aria-label={userImage ? 'Replace avatar' : 'Upload avatar'}
					>
						<Avatar.Root class="h-full w-full rounded-xl">
							{#if userImage}
								<Avatar.Image src={userImage} alt={user.name || user.email} class="object-cover" />
							{/if}
							<Avatar.Fallback
								class="bg-muted text-muted-foreground rounded-xl text-2xl font-medium"
							>
								{initials}
							</Avatar.Fallback>
						</Avatar.Root>
						<div
							class="absolute inset-0 flex items-center justify-center bg-black/45 text-xs font-medium text-white opacity-0 transition-opacity group-hover:opacity-100"
						>
							<span class="flex flex-col items-center gap-1.5">
								<Upload class="h-4 w-4" />
								{userImage ? 'Replace' : 'Upload'}
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

					<Button
						type="button"
						variant="outline"
						size="sm"
						class="w-full"
						onclick={() => imageInput?.click()}
						disabled={isUploadingImage || isRemovingImage || isUpdating}
					>
						<Upload class="mr-2 h-3.5 w-3.5" />
						{isUploadingImage ? 'Uploading…' : userImage ? 'Replace' : 'Upload'}
					</Button>
					{#if userImage}
						<Button
							type="button"
							variant="ghost"
							size="sm"
							class="text-muted-foreground hover:text-destructive w-full"
							onclick={removeProfileImage}
							disabled={isUploadingImage || isRemovingImage || isUpdating}
						>
							{isRemovingImage ? 'Removing…' : 'Remove'}
						</Button>
					{/if}
				</div>

				<!--
					No name/email heading beside the avatar: both are editable fields in
					this column, and showing them twice made the card look like it was
					reporting two things when it was reporting one thing twice.
				-->
				<div class="max-w-sm min-w-0 flex-1 space-y-4">
					<div>
						<Label for="user-name">Display Name</Label>
						<Input
							id="user-name"
							bind:value={userName}
							placeholder="Your name"
							maxlength={NAME_MAX_LENGTH}
							class="mt-2"
						/>
					</div>
					<div>
						<Label for="user-email">Email</Label>
						<div class="relative mt-2">
							<Input id="user-email" type="email" value={user.email} disabled class="pr-9" />
							<Lock
								class="text-muted-foreground absolute top-1/2 right-3 h-3.5 w-3.5 -translate-y-1/2"
							/>
						</div>
						<p class="text-muted-foreground mt-1.5 text-xs">
							Managed by your authentication provider
						</p>
					</div>
					<p class="text-muted-foreground text-xs">
						Drag an image onto the avatar, or choose a file. JPG, PNG, WebP, or GIF. Max 5MB.
					</p>
				</div>
			</div>
		</Card.Content>
		<Card.Footer class="flex justify-end border-t px-6 py-4">
			<Button onclick={updateProfile} disabled={isUpdating}>
				{isUpdating ? 'Saving...' : 'Save changes'}
			</Button>
		</Card.Footer>
	</Card.Root>
</div>
