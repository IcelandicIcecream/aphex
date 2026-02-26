<script lang="ts">
	import { Button } from '@aphexcms/ui/shadcn/button';
	import { Input } from '@aphexcms/ui/shadcn/input';
	import { Label } from '@aphexcms/ui/shadcn/label';
	import { Badge } from '@aphexcms/ui/shadcn/badge';
	import { Switch } from '@aphexcms/ui/shadcn/switch';
	import * as Card from '@aphexcms/ui/shadcn/card';
	import * as Avatar from '@aphexcms/ui/shadcn/avatar';
	import { Separator } from '@aphexcms/ui/shadcn/separator';
	import { invalidateAll } from '$app/navigation';
	import type { CMSUser, UserSessionPreferences } from '@aphexcms/cms-core';
	import { user as userApi } from '@aphexcms/cms-core/client';
	import { Building2, Lock } from '@lucide/svelte';
	import { toast } from 'svelte-sonner';

	type Props = {
		user: CMSUser;
		userPreferences?: UserSessionPreferences | null;
		hasChildOrganizations?: boolean;
	};

	let { user, userPreferences = null, hasChildOrganizations = false }: Props = $props();

	let userName = $state(user.name || '');
	let isUpdating = $state(false);
	let includeChildOrganizations = $state(userPreferences?.includeChildOrganizations ?? false);
	let isUpdatingPreferences = $state(false);

	const userInitials = $derived(
		user.name
			? user.name
					.split(' ')
					.map((w) => w[0])
					.join('')
					.toUpperCase()
					.slice(0, 2)
			: user.email[0].toUpperCase()
	);

	function getRoleBadgeVariant(
		role: string
	): 'default' | 'secondary' | 'outline' | 'destructive' {
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
			const result = await userApi.updateProfile({ name: userName.trim() });

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
</script>

<div class="space-y-6">
	<!-- Profile Information -->
	<Card.Root>
		<Card.Header>
			<div class="flex items-center gap-4">
				<Avatar.Root class="h-14 w-14 text-lg">
					{#if user.image}
						<Avatar.Image src={user.image} alt={user.name || user.email} />
					{/if}
					<Avatar.Fallback>{userInitials}</Avatar.Fallback>
				</Avatar.Root>
				<div class="min-w-0 flex-1">
					<div class="flex items-center gap-2">
						<Card.Title class="text-lg">{user.name || user.email}</Card.Title>
						<Badge variant={getRoleBadgeVariant(user.role)} class="capitalize">
							{formatRole(user.role)}
						</Badge>
					</div>
					<p class="text-muted-foreground mt-0.5 text-sm">{user.email}</p>
				</div>
			</div>
		</Card.Header>

		<Card.Content>
			<Separator class="mb-4" />

			<div class="space-y-4">
				<div>
					<Label for="user-name">Display Name</Label>
					<Input id="user-name" bind:value={userName} placeholder="Your name" class="mt-2" />
				</div>
				<div>
					<Label for="user-email">Email</Label>
					<div class="relative mt-1">
						<Input
							id="user-email"
							type="email"
							value={user.email}
							disabled
							class="pr-9"
						/>
						<Lock
							class="text-muted-foreground absolute top-1/2 right-3 h-3.5 w-3.5 -translate-y-1/2"
						/>
					</div>
					<p class="text-muted-foreground mt-1 text-xs">
						Managed by your authentication provider
					</p>
				</div>
			</div>
		</Card.Content>
		<Card.Footer class="border-t px-6 py-4">
			<Button onclick={updateProfile} disabled={isUpdating}>
				{isUpdating ? 'Saving...' : 'Save Changes'}
			</Button>
		</Card.Footer>
	</Card.Root>

	<!-- Preferences -->
	{#if hasChildOrganizations}
		<Card.Root>
			<Card.Header>
				<Card.Title>Content Preferences</Card.Title>
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
