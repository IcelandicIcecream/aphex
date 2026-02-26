<script lang="ts">
	import { Button } from '@aphexcms/ui/shadcn/button';
	import { Input } from '@aphexcms/ui/shadcn/input';
	import { Label } from '@aphexcms/ui/shadcn/label';
	import { Badge } from '@aphexcms/ui/shadcn/badge';
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
	import * as Card from '@aphexcms/ui/shadcn/card';
	import * as Tooltip from '@aphexcms/ui/shadcn/tooltip';
	import * as Collapsible from '@aphexcms/ui/shadcn/collapsible';
	import { Separator } from '@aphexcms/ui/shadcn/separator';
	import { apiKeys as apiKeysApi } from '@aphexcms/cms-core/client';
	import { invalidateAll } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import { KeyRound, Copy, Trash2, Plus, ChevronDown } from '@lucide/svelte';

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

			createdKey = { key: result.data.apiKey.key, name: result.data.apiKey.name ?? newKeyName };

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

			toast.success(`API key "${name}" deleted`);
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

<Card.Root>
	<Card.Header>
		<div class="flex items-center justify-between">
			<div>
				<Card.Title>API Keys</Card.Title>
				<Card.Description>
					API keys allow programmatic access to your CMS content
				</Card.Description>
			</div>
			{#if canManageApiKeys}
				<Dialog bind:open={createDialogOpen}>
					<DialogTrigger>
						{#snippet child({ props })}
							<Button size="sm" {...props}>
								<Plus class="mr-1.5 h-4 w-4" />
								Create Key
							</Button>
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
								<DialogDescription>
									Generate a new API key for programmatic access
								</DialogDescription>
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
	</Card.Header>

	<Card.Content>
		{#if apiKeys.length === 0}
			<div class="flex flex-col items-center justify-center py-12 text-center">
				<div class="bg-muted mb-4 rounded-full p-3">
					<KeyRound class="text-muted-foreground h-6 w-6" />
				</div>
				<p class="text-base font-medium">No API keys yet</p>
				<p class="text-muted-foreground mt-1 text-sm">
					Create your first API key to access the CMS data programmatically
				</p>
				{#if canManageApiKeys}
					<Button size="sm" class="mt-4" onclick={() => (createDialogOpen = true)}>
						<Plus class="mr-1.5 h-4 w-4" />
						Create API Key
					</Button>
				{/if}
			</div>
		{:else}
			<div class="divide-y">
				{#each apiKeys as apiKey, i (apiKey.id)}
					<div class="flex items-center justify-between gap-4 {i > 0 ? 'pt-4' : ''} {i < apiKeys.length - 1 ? 'pb-4' : ''}">
						<div class="min-w-0 flex-1">
							<div class="flex items-center gap-2">
								<KeyRound class="text-muted-foreground h-4 w-4 shrink-0" />
								<span class="truncate font-medium">{apiKey.name}</span>
								<div class="flex gap-1">
									{#each apiKey.permissions as permission}
										<Badge variant="secondary" class="text-xs capitalize">
											{permission}
										</Badge>
									{/each}
								</div>
							</div>
							<div
								class="text-muted-foreground mt-1.5 ml-6 flex flex-wrap gap-x-4 gap-y-1 text-xs"
							>
								<span>Created {formatDate(apiKey.createdAt)}</span>
								<span>Last used {formatDate(apiKey.lastRequest)}</span>
								<span>
									Expires {apiKey.expiresAt ? formatDate(apiKey.expiresAt) : 'never'}
								</span>
							</div>
						</div>
						{#if canManageApiKeys}
							<Tooltip.Root>
								<Tooltip.Trigger>
									{#snippet child({ props })}
										<Button
											variant="ghost"
											size="icon"
											class="text-muted-foreground hover:text-destructive h-8 w-8 shrink-0"
											onclick={() => deleteApiKey(apiKey.id, apiKey.name!)}
											{...props}
										>
											<Trash2 class="h-4 w-4" />
										</Button>
									{/snippet}
								</Tooltip.Trigger>
								<Tooltip.Content>Delete this API key</Tooltip.Content>
							</Tooltip.Root>
						{/if}
					</div>
				{/each}
			</div>
		{/if}
	</Card.Content>
</Card.Root>

<!-- Quick Reference -->
<Card.Root class="mt-6">
	<Card.Header class="pb-3">
		<Card.Title class="text-sm font-medium">Quick Reference</Card.Title>
		<Card.Description>
			Pass your key via the <code class="bg-muted rounded px-1 py-0.5 text-xs">x-api-key</code> header
		</Card.Description>
	</Card.Header>
	<Card.Content class="space-y-4">
		<!-- Auth example -->
		<div class="bg-muted relative rounded-md p-3">
			<code class="block font-mono text-xs leading-relaxed break-all">
				curl -H "x-api-key: your_key_here" \<br />
				&nbsp;&nbsp;https://your-app.com/api/documents?type=&#123;schemaType&#125;
			</code>
			<Button
				variant="ghost"
				size="icon"
				class="absolute top-2 right-2 h-7 w-7"
				onclick={() =>
					copyToClipboard(
						'curl -H "x-api-key: your_key_here" \\\n  https://your-app.com/api/documents?type={schemaType}'
					)}
			>
				<Copy class="h-3.5 w-3.5" />
			</Button>
		</div>

		<!-- Endpoints -->
		<Collapsible.Root>
			<Collapsible.Trigger
				class="flex w-full items-center justify-between text-xs font-medium [&[data-state=open]>svg]:rotate-180"
			>
				Endpoints
				<ChevronDown class="text-muted-foreground h-3.5 w-3.5 transition-transform duration-200" />
			</Collapsible.Trigger>
			<Collapsible.Content>
				<div class="bg-muted mt-2 overflow-hidden rounded-md font-mono text-xs">
					<div class="divide-y divide-border">
						<div class="flex gap-2 px-3 py-1.5">
							<Badge variant="outline" class="w-14 justify-center font-mono text-[10px]">GET</Badge>
							<span class="text-muted-foreground">/api/documents?type=&#123;type&#125;</span>
						</div>
						<div class="flex gap-2 px-3 py-1.5">
							<Badge variant="outline" class="w-14 justify-center font-mono text-[10px]">GET</Badge>
							<span class="text-muted-foreground">/api/documents/&#123;id&#125;</span>
						</div>
						<div class="flex gap-2 px-3 py-1.5">
							<Badge variant="secondary" class="w-14 justify-center font-mono text-[10px]">POST</Badge>
							<span class="text-muted-foreground">/api/documents</span>
						</div>
						<div class="flex gap-2 px-3 py-1.5">
							<Badge variant="secondary" class="w-14 justify-center font-mono text-[10px]">PUT</Badge>
							<span class="text-muted-foreground">/api/documents/&#123;id&#125;</span>
						</div>
						<div class="flex gap-2 px-3 py-1.5">
							<Badge variant="secondary" class="w-14 justify-center font-mono text-[10px]">DEL</Badge>
							<span class="text-muted-foreground">/api/documents/&#123;id&#125;</span>
						</div>
						<div class="flex gap-2 px-3 py-1.5">
							<Badge variant="outline" class="w-14 justify-center font-mono text-[10px]">POST</Badge>
							<span class="text-muted-foreground">/api/documents/query</span>
						</div>
						<div class="flex gap-2 px-3 py-1.5">
							<Badge variant="outline" class="w-14 justify-center font-mono text-[10px]">GET</Badge>
							<span class="text-muted-foreground">/api/assets</span>
						</div>
						<div class="flex gap-2 px-3 py-1.5">
							<Badge variant="secondary" class="w-14 justify-center font-mono text-[10px]">POST</Badge>
							<span class="text-muted-foreground">/api/assets</span>
							<span class="text-muted-foreground/60 ml-auto text-[10px]">multipart/form-data</span>
						</div>
						<div class="flex gap-2 px-3 py-1.5">
							<Badge variant="outline" class="w-14 justify-center font-mono text-[10px]">GET</Badge>
							<span class="text-muted-foreground">/api/schemas</span>
						</div>
					</div>
				</div>
			</Collapsible.Content>
		</Collapsible.Root>

		<!-- Permissions note -->
		<div class="text-muted-foreground text-xs leading-relaxed">
			<p>
				<Badge variant="outline" class="mr-1 font-mono text-[10px]">GET</Badge> endpoints need
				<strong class="text-foreground">read</strong> permission.
				<Badge variant="secondary" class="mr-1 ml-1 font-mono text-[10px]">POST</Badge>
				<Badge variant="secondary" class="mr-1 font-mono text-[10px]">PUT</Badge>
				<Badge variant="secondary" class="mr-1 font-mono text-[10px]">DEL</Badge> need
				<strong class="text-foreground">write</strong>. Read-only keys get
				<code class="bg-muted rounded px-1 py-0.5">403</code> on mutations.
			</p>
			<p class="mt-1">
				<code class="bg-muted rounded px-1 py-0.5">POST /api/documents/query</code> is the exception
				— it only needs <strong class="text-foreground">read</strong> permission.
			</p>
		</div>
	</Card.Content>
</Card.Root>
