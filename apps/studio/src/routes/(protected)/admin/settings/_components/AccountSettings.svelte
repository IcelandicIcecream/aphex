<script lang="ts">
	import { Button } from '@aphexcms/ui/shadcn/button';
	import { Input } from '@aphexcms/ui/shadcn/input';
	import { Label } from '@aphexcms/ui/shadcn/label';
	import { Switch } from '@aphexcms/ui/shadcn/switch';
	import { invalidateAll } from '$app/navigation';
	import type { CMSUser, UserSessionPreferences } from '@aphexcms/cms-core';
	import { Building2 } from 'lucide-svelte';

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

	async function updateProfile() {
		if (!userName.trim()) {
			alert('Please enter your name');
			return;
		}

		isUpdating = true;
		try {
			const response = await fetch('/api/user', {
				method: 'PATCH',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					name: userName.trim()
				})
			});

			const data = await response.json();

			if (!response.ok || !data.success) {
				throw new Error(data.error || data.message || 'Failed to update profile');
			}

			await invalidateAll();
		} catch (error) {
			alert(error instanceof Error ? error.message : 'Failed to update profile');
		} finally {
			isUpdating = false;
		}
	}

	async function updatePreferences(prefs: Partial<UserSessionPreferences>) {
		isUpdatingPreferences = true;
		try {
			const response = await fetch('/api/user/cms-preference', {
				method: 'PATCH',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(prefs)
			});

			const data = await response.json();

			if (!response.ok || !data.success) {
				throw new Error(data.error || data.message || 'Failed to update preferences');
			}
		} catch (error) {
			alert(error instanceof Error ? error.message : 'Failed to update preferences');
			// Revert on error
			if (prefs.includeChildOrganizations !== undefined) {
				includeChildOrganizations = !prefs.includeChildOrganizations;
			}
		} finally {
			isUpdatingPreferences = false;
		}
	}
</script>

<div class="mb-6">
	<h2 class="text-xl font-semibold">Account Settings</h2>
	<p class="text-muted-foreground mt-1 text-sm">Manage your profile and preferences</p>
</div>

<div class="space-y-6">
	<!-- Profile Information -->
	<div class="rounded-lg border p-6">
		<h3 class="mb-4 text-lg font-semibold">Profile Information</h3>
		<div class="space-y-4">
			<div>
				<Label for="user-name">Name</Label>
				<Input id="user-name" bind:value={userName} placeholder="Your name" class="mt-1" />
			</div>
			<div>
				<Label for="user-email">Email</Label>
				<Input id="user-email" type="email" value={user.email} disabled class="mt-1" />
				<p class="text-muted-foreground mt-1 text-xs">Email cannot be changed</p>
			</div>
			<div>
				<Label>Role</Label>
				<Input type="text" value={user.role} disabled class="mt-1 capitalize" />
				<p class="text-muted-foreground mt-1 text-xs">Your system-wide role</p>
			</div>
			<div class="flex justify-end">
				<Button onclick={updateProfile} disabled={isUpdating}>
					{isUpdating ? 'Updating...' : 'Save Changes'}
				</Button>
			</div>
		</div>
	</div>

	<!-- Preferences -->
	{#if hasChildOrganizations}
		<div class="rounded-lg border p-6">
			<h3 class="mb-4 text-lg font-semibold">Content Preferences</h3>
			<div class="space-y-4">
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
			</div>
		</div>
	{/if}
</div>
