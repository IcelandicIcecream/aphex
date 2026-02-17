<script lang="ts">
	import { Button } from '@aphexcms/ui/shadcn/button';
	import { Input } from '@aphexcms/ui/shadcn/input';
	import { Label } from '@aphexcms/ui/shadcn/label';
	import {
		Dialog,
		DialogContent,
		DialogDescription,
		DialogFooter,
		DialogHeader,
		DialogTitle,
		DialogTrigger
	} from '@aphexcms/ui/shadcn/dialog';
	import * as Select from '@aphexcms/ui/shadcn/select';
	import { apiKeys as apiKeysApi } from '@aphexcms/cms-core/client';
	import { invalidateAll } from '$app/navigation';
	import { toast } from 'svelte-sonner';

	type ApiKey = {
		id: string;
		name: string | null;
		permissions: ('read' | 'write')[];
		createdAt: Date | null;
		lastRequest: Date | null;
		expiresAt: Date | null;
	};

	type Props = {
		apiKeys: ApiKey[];
		organizationRole?: string | null;
	};

	let { apiKeys, organizationRole }: Props = $props();

	// Only admins, editors, and owners can manage API keys
	// Viewers should have read-only access
	const canManageApiKeys = $derived(
		organizationRole === 'owner' || organizationRole === 'admin' || organizationRole === 'editor'
	);

	let createDialogOpen = $state(false);
	let newKeyName = $state('');
	let newKeyPermissions = $state<('read' | 'write')[]>(['read']);
	let newKeyExpiresValue = $state('365');
	let newKeyExpiresInDays = $state<number | undefined>(365);
	let createdKey = $state<{ key: string; name: string } | null>(null);
	let isCreating = $state(false);

	const expirationOptions = [
		{ value: '30', label: '30 days' },
		{ value: '90', label: '90 days' },
		{ value: '365', label: '1 year' },
		{ value: 'never', label: 'Never' }
	];

	const expirationTriggerContent = $derived(
		expirationOptions.find((opt) => opt.value === newKeyExpiresValue)?.label ?? '1 year'
	);

	async function createApiKey() {
		if (!newKeyName.trim()) {
			toast.error('Please enter a key name');
			return;
		}

		isCreating = true;
		try {
			const result = await apiKeysApi.create({
				name: newKeyName.trim(),
				permissions: newKeyPermissions,
				expiresInDays: newKeyExpiresInDays
			});

			if (!result.success || !result.data) {
				throw new Error(result.error || 'Failed to create API key');
			}

			createdKey = { key: result.data.key, name: result.data.name ?? newKeyName };

			// Reset form
			newKeyName = '';
			newKeyPermissions = ['read'];
			newKeyExpiresValue = '365';
			newKeyExpiresInDays = 365;

			// Refresh the list
			await invalidateAll();
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Failed to create API key');
		} finally {
			isCreating = false;
		}
	}

	async function deleteApiKey(id: string, name: string) {
		if (!confirm(`Are you sure you want to delete "${name}"? This action cannot be undone.`)) {
			return;
		}

		try {
			const result = await apiKeysApi.remove(id);

			if (!result.success) {
				throw new Error(result.error || 'Failed to delete API key');
			}

			await invalidateAll();
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Failed to delete API key');
		}
	}

	function copyToClipboard(text: string) {
		navigator.clipboard.writeText(text);
		toast.success('Copied to clipboard!');
	}

	function formatDate(date: Date | null | undefined) {
		if (!date) return 'Never';
		return new Date(date).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	}

	function togglePermission(permission: 'read' | 'write') {
		if (newKeyPermissions.includes(permission)) {
			newKeyPermissions = newKeyPermissions.filter((p) => p !== permission);
		} else {
			newKeyPermissions = [...newKeyPermissions, permission];
		}
	}
</script>

<div class="mb-6 flex items-center justify-between">
	<div class="px-2.5">
		<h2 class="text-xl font-semibold">API Keys</h2>
		<p class="text-muted-foreground mt-1 text-sm">
			API keys allow programmatic access to your CMS content
		</p>
	</div>
	{#if canManageApiKeys}
		<Dialog bind:open={createDialogOpen}>
			<DialogTrigger>
				{#snippet child({ props })}
					<Button {...props}>Create API Key</Button>
				{/snippet}
			</DialogTrigger>
			<DialogContent class="sm:max-w-[500px]">
				{#if createdKey}
					<DialogHeader>
						<DialogTitle>API Key Created</DialogTitle>
						<DialogDescription>
							Save this key securely - you won't be able to see it again
						</DialogDescription>
					</DialogHeader>
					<div class="space-y-4 py-4">
						<div>
							<Label>Key Name</Label>
							<p class="mt-1 text-sm font-medium">{createdKey.name}</p>
						</div>
						<div>
							<Label>API Key</Label>
							<div class="mt-1 flex gap-2">
								<Input value={createdKey.key} readonly class="font-mono text-xs" />
								<Button
									size="sm"
									variant="outline"
									onclick={() => copyToClipboard(createdKey!.key)}
								>
									Copy
								</Button>
							</div>
						</div>
					</div>
					<DialogFooter>
						<Button
							onclick={() => {
								createdKey = null;
								createDialogOpen = false;
							}}
						>
							Done
						</Button>
					</DialogFooter>
				{:else}
					<DialogHeader>
						<DialogTitle>Create API Key</DialogTitle>
						<DialogDescription>Generate a new API key for programmatic access</DialogDescription>
					</DialogHeader>
					<div class="space-y-4 py-4">
						<div>
							<Label for="key-name">Key Name</Label>
							<Input
								id="key-name"
								bind:value={newKeyName}
								placeholder="Production API Key"
								class="mt-1"
							/>
							<p class="text-muted-foreground mt-1 text-xs">
								A descriptive name to identify this key
							</p>
						</div>

						<div>
							<Label>Permissions</Label>
							<div class="mt-2 flex gap-2">
								<Button
									variant={newKeyPermissions.includes('read') ? 'default' : 'outline'}
									size="sm"
									onclick={() => togglePermission('read')}
								>
									Read
								</Button>
								<Button
									variant={newKeyPermissions.includes('write') ? 'default' : 'outline'}
									size="sm"
									onclick={() => togglePermission('write')}
								>
									Write
								</Button>
							</div>
							<p class="text-muted-foreground mt-1 text-xs">
								Read: GET requests | Write: POST, PUT, DELETE requests
							</p>
						</div>

						<div>
							<Label for="expires">Expires In</Label>
							<Select.Root
								type="single"
								name="expiration"
								bind:value={newKeyExpiresValue}
								onValueChange={(value) => {
									if (value) {
										newKeyExpiresInDays = value === 'never' ? undefined : parseInt(value);
									}
								}}
							>
								<Select.Trigger class="mt-1 w-[180px]">
									{expirationTriggerContent}
								</Select.Trigger>
								<Select.Content>
									<Select.Group>
										{#each expirationOptions as option (option.value)}
											<Select.Item value={option.value} label={option.label}>
												{option.label}
											</Select.Item>
										{/each}
									</Select.Group>
								</Select.Content>
							</Select.Root>
						</div>
					</div>
					<DialogFooter>
						<Button
							variant="outline"
							onclick={() => (createDialogOpen = false)}
							disabled={isCreating}
						>
							Cancel
						</Button>
						<Button onclick={createApiKey} disabled={isCreating}>
							{isCreating ? 'Creating...' : 'Create Key'}
						</Button>
					</DialogFooter>
				{/if}
			</DialogContent>
		</Dialog>
	{/if}
</div>

{#if apiKeys.length === 0}
	<div class="text-muted-foreground py-12 text-center">
		<p class="text-lg">No API keys yet</p>
		<p class="mt-2 text-sm">Create your first API key to access the CMS data programmatically</p>
	</div>
{:else}
	<div class="space-y-3">
		{#each apiKeys as apiKey (apiKey.id)}
			<div class="flex items-center justify-between rounded-lg border p-4">
				<div class="flex-1">
					<div class="flex items-center gap-3">
						<h3 class="font-medium">{apiKey.name}</h3>
						<div class="flex gap-1">
							{#each apiKey.permissions as permission}
								<span class="bg-primary/10 text-primary rounded-full px-2 py-0.5 text-xs">
									{permission}
								</span>
							{/each}
						</div>
					</div>
					<div class="text-muted-foreground mt-2 flex gap-4 text-xs">
						<span>Created: {formatDate(apiKey.createdAt)}</span>
						<span>Last used: {formatDate(apiKey.lastRequest)}</span>
						<span>
							Expires: {apiKey.expiresAt ? formatDate(apiKey.expiresAt) : 'Never'}
						</span>
					</div>
				</div>
				{#if canManageApiKeys}
					<Button variant="ghost" size="sm" onclick={() => deleteApiKey(apiKey.id, apiKey.name!)}>
						Delete
					</Button>
				{/if}
			</div>
		{/each}
	</div>
{/if}

<div class="bg-muted/50 mt-6 rounded-lg border p-4">
	<h3 class="mb-2 text-sm font-medium">Usage</h3>
	<p class="text-muted-foreground mb-2 text-xs">
		Include your API key in the <code class="bg-background rounded px-1 py-0.5">x-api-key</code>
		header
	</p>
</div>
