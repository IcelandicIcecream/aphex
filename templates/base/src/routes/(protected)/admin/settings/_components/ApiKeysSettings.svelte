<script lang="ts">
	import { Badge } from '@aphexcms/ui/shadcn/badge';
	import { Button } from '@aphexcms/ui/shadcn/button';
	import * as Card from '@aphexcms/ui/shadcn/card';
	import * as Alert from '@aphexcms/ui/shadcn/alert';
	import {
		Dialog,
		DialogContent,
		DialogDescription,
		DialogFooter,
		DialogHeader,
		DialogTitle
	} from '@aphexcms/ui/shadcn/dialog';
	import { Input } from '@aphexcms/ui/shadcn/input';
	import { Label } from '@aphexcms/ui/shadcn/label';
	import * as Select from '@aphexcms/ui/shadcn/select';
	import {
		apiKeys as apiKeysApi,
		confirmDialog,
		usePermissions
	} from '@aphexcms/cms-core/client/ui';
	import { invalidateAll } from '$app/navigation';
	import { Copy, KeyRound, Plus, Trash2 } from '@lucide/svelte';
	import { toast } from 'svelte-sonner';
	import SettingsHeaderActions from './SettingsHeaderActions.svelte';

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

	// eslint-disable-next-line svelte/no-unused-props
	let { apiKeys }: Props = $props();

	const perms = usePermissions();
	const canManageApiKeys = $derived(perms.can('apiKey.manage'));

	let createDialogOpen = $state(false);
	let newKeyName = $state('');
	let newKeyMode = $state<'read' | 'write'>('read');
	const newKeyPermissions = $derived<('read' | 'write')[]>(
		newKeyMode === 'write' ? ['read', 'write'] : ['read']
	);
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
			newKeyName = '';
			newKeyMode = 'read';
			newKeyExpiresValue = '365';
			newKeyExpiresInDays = 365;
			await invalidateAll();
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Failed to create API key');
		} finally {
			isCreating = false;
		}
	}

	async function deleteApiKey(id: string, name: string) {
		const confirmed = await confirmDialog({
			title: `Delete "${name}"?`,
			description: 'This action cannot be undone. Any integration using this key will lose access.',
			confirmText: 'Delete',
			variant: 'destructive'
		});
		if (!confirmed) return;

		try {
			const result = await apiKeysApi.remove(id);
			if (!result.success) throw new Error(result.error || 'Failed to delete API key');
			toast.success(`API key "${name}" deleted`);
			await invalidateAll();
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Failed to delete API key');
		}
	}

	function copyToClipboard(text: string) {
		navigator.clipboard.writeText(text);
		toast.success('Copied to clipboard');
	}

	function formatDate(date: Date | null | undefined) {
		if (!date) return 'Never';
		return new Date(date).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		});
	}

	function formatPermissions(permissions: ('read' | 'write')[]) {
		return permissions.join(' ');
	}
</script>

{#if canManageApiKeys}
	<SettingsHeaderActions>
		<Button
			size="sm"
			onclick={() => {
				createdKey = null;
				createDialogOpen = true;
			}}
		>
			<Plus class="mr-1.5 h-4 w-4" />
			New token
		</Button>
	</SettingsHeaderActions>
{/if}

<Card.Root>
	<Card.Header class="gap-4">
		<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
			<div>
				<Card.Title>API keys</Card.Title>
				<Card.Description>Personal and service tokens scoped to this organization.</Card.Description
				>
			</div>
			{#if canManageApiKeys}
				<Dialog bind:open={createDialogOpen}>
					<DialogContent class="sm:max-w-[500px]">
						{#if createdKey}
							<DialogHeader>
								<DialogTitle>API key created</DialogTitle>
								<DialogDescription
									>Save this key securely. You won't be able to see it again.</DialogDescription
								>
							</DialogHeader>
							<div class="space-y-4 py-4">
								<div>
									<Label>Key name</Label>
									<p class="mt-1 text-sm font-medium">{createdKey.name}</p>
								</div>
								<div>
									<Label>API key</Label>
									<div class="mt-1 flex gap-2">
										<Input value={createdKey.key} readonly class="font-mono text-xs" />
										<Button
											size="sm"
											variant="outline"
											onclick={() => copyToClipboard(createdKey!.key)}
										>
											<Copy class="mr-1.5 h-3.5 w-3.5" />
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
									}}>Done</Button
								>
							</DialogFooter>
						{:else}
							<DialogHeader>
								<DialogTitle>Create API key</DialogTitle>
								<DialogDescription>Generate a new token for programmatic access.</DialogDescription>
							</DialogHeader>
							<div class="space-y-4 py-4">
								<div>
									<Label for="key-name">Key name</Label>
									<Input
										id="key-name"
										bind:value={newKeyName}
										placeholder="Production read"
										class="mt-1"
									/>
								</div>
								<div>
									<Label>Access level</Label>
									<div class="mt-2 flex gap-2">
										<Button
											variant={newKeyMode === 'read' ? 'default' : 'outline'}
											size="sm"
											onclick={() => (newKeyMode = 'read')}>Read only</Button
										>
										<Button
											variant={newKeyMode === 'write' ? 'default' : 'outline'}
											size="sm"
											onclick={() => (newKeyMode = 'write')}>Read + write</Button
										>
									</div>
								</div>
								<div>
									<Label for="expires">Expires in</Label>
									<Select.Root
										type="single"
										name="expiration"
										bind:value={newKeyExpiresValue}
										onValueChange={(value) => {
											if (value)
												newKeyExpiresInDays = value === 'never' ? undefined : parseInt(value);
										}}
									>
										<Select.Trigger class="mt-1 w-[180px]"
											>{expirationTriggerContent}</Select.Trigger
										>
										<Select.Content>
											<Select.Group>
												{#each expirationOptions as option (option.value)}
													<Select.Item value={option.value} label={option.label}
														>{option.label}</Select.Item
													>
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
									disabled={isCreating}>Cancel</Button
								>
								<Button onclick={createApiKey} disabled={isCreating}
									>{isCreating ? 'Creating...' : 'Create key'}</Button
								>
							</DialogFooter>
						{/if}
					</DialogContent>
				</Dialog>
			{/if}
		</div>
		<Alert.Root class="bg-muted/50 text-muted-foreground px-3 py-2">
			<Alert.Description>
				Tokens are shown once. Treat them like passwords: store them in a secrets manager and never
				commit them to source.
			</Alert.Description>
		</Alert.Root>
	</Card.Header>

	<Card.Content class="pt-0">
		{#if apiKeys.length === 0}
			<div
				class="border-border flex flex-col items-center justify-center rounded-lg border border-dashed py-12 text-center"
			>
				<div class="bg-muted mb-4 rounded-full p-3">
					<KeyRound class="text-muted-foreground h-6 w-6" />
				</div>
				<p class="text-base font-medium">No API keys yet</p>
				<p class="text-muted-foreground mt-1 text-sm">
					Create a token to access CMS data programmatically.
				</p>
			</div>
		{:else}
			<div class="border-border hidden overflow-hidden rounded-lg border md:block">
				<div
					class="bg-muted/30 text-muted-foreground grid grid-cols-[minmax(140px,1fr)_96px_130px_100px_100px_76px] border-b px-4 py-2 text-xs font-medium tracking-wide uppercase"
				>
					<div>Name</div>
					<div>Token</div>
					<div>Scope</div>
					<div>Created</div>
					<div>Last used</div>
					<div></div>
				</div>
				<div class="divide-y">
					{#each apiKeys as apiKey (apiKey.id)}
						<div
							class="grid grid-cols-[minmax(140px,1fr)_96px_130px_100px_100px_76px] items-center px-4 py-3 text-sm"
						>
							<div class="truncate font-medium">{apiKey.name ?? 'Unnamed key'}</div>
							<div class="text-muted-foreground truncate font-mono text-xs">shown once</div>
							<div>
								<Badge variant="outline" class="font-mono text-xs"
									>{formatPermissions(apiKey.permissions)}</Badge
								>
							</div>
							<div class="text-muted-foreground">{formatDate(apiKey.createdAt)}</div>
							<div class="text-muted-foreground">{formatDate(apiKey.lastRequest)}</div>
							<div class="flex justify-end">
								{#if canManageApiKeys}
									<Button
										variant="outline"
										size="sm"
										onclick={() => deleteApiKey(apiKey.id, apiKey.name ?? 'Unnamed')}>Delete</Button
									>
								{/if}
							</div>
						</div>
					{/each}
				</div>
			</div>

			<div class="space-y-3 md:hidden">
				{#each apiKeys as apiKey (apiKey.id)}
					<div class="border-border rounded-lg border p-4">
						<div class="flex items-start justify-between gap-3">
							<div class="min-w-0">
								<p class="truncate text-sm font-medium">{apiKey.name ?? 'Unnamed key'}</p>
								<p class="text-muted-foreground mt-1 font-mono text-xs">Token shown once</p>
							</div>
							<Badge variant="outline" class="font-mono text-xs"
								>{formatPermissions(apiKey.permissions)}</Badge
							>
						</div>
						<div class="mt-4 grid grid-cols-2 gap-3 text-sm">
							<div>
								<p class="text-muted-foreground text-xs">Created</p>
								<p class="mt-1">{formatDate(apiKey.createdAt)}</p>
							</div>
							<div>
								<p class="text-muted-foreground text-xs">Last used</p>
								<p class="mt-1">{formatDate(apiKey.lastRequest)}</p>
							</div>
						</div>
						{#if canManageApiKeys}
							<Button
								class="mt-4 w-full"
								variant="outline"
								size="sm"
								onclick={() => deleteApiKey(apiKey.id, apiKey.name ?? 'Unnamed')}
							>
								<Trash2 class="mr-1.5 h-4 w-4" />
								Delete key
							</Button>
						{/if}
					</div>
				{/each}
			</div>
		{/if}
	</Card.Content>
</Card.Root>

<Card.Root class="mt-5">
	<Card.Header>
		<Card.Title class="text-base">API reference</Card.Title>
		<Card.Description
			>Use the key in the <code class="bg-muted rounded px-1 py-0.5 text-xs">x-api-key</code> header.</Card.Description
		>
	</Card.Header>
	<Card.Content class="space-y-4">
		<div class="bg-muted relative rounded-md p-3 pr-11">
			<code class="block font-mono text-xs leading-relaxed break-all">
				curl -H "x-api-key: your_key_here"
				https://your-app.com/api/documents?type=&#123;schemaType&#125;
			</code>
			<Button
				variant="ghost"
				size="icon"
				class="absolute top-2 right-2 h-7 w-7"
				onclick={() =>
					copyToClipboard(
						'curl -H "x-api-key: your_key_here" https://your-app.com/api/documents?type={schemaType}'
					)}
			>
				<Copy class="h-3.5 w-3.5" />
			</Button>
		</div>

		<div class="grid gap-2 text-sm sm:grid-cols-2">
			<div class="border-border rounded-md border p-3">
				<p class="font-medium">Read endpoints</p>
				<div class="text-muted-foreground mt-2 space-y-1 font-mono text-xs">
					<p>GET /api/documents?type=&#123;type&#125;</p>
					<p>GET /api/documents/&#123;id&#125;</p>
					<p>POST /api/documents/query</p>
					<p>GET /api/assets</p>
					<p>GET /api/schemas</p>
				</div>
			</div>
			<div class="border-border rounded-md border p-3">
				<p class="font-medium">Write endpoints</p>
				<div class="text-muted-foreground mt-2 space-y-1 font-mono text-xs">
					<p>POST /api/documents</p>
					<p>PUT /api/documents/&#123;id&#125;</p>
					<p>DELETE /api/documents/&#123;id&#125;</p>
					<p>POST /api/assets</p>
				</div>
			</div>
		</div>

		<p class="text-muted-foreground text-xs leading-relaxed">
			Read-only keys can use read endpoints. Write keys can create, update, and delete documents and
			upload assets. <code class="bg-muted rounded px-1 py-0.5">POST /api/documents/query</code> only
			requires read access.
		</p>
	</Card.Content>
</Card.Root>
