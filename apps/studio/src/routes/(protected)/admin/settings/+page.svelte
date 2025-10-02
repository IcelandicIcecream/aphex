<script lang="ts">
  import { Button } from '@aphex/ui/shadcn/button';
  import { Card } from '@aphex/ui/shadcn/card';
  import { Input } from '@aphex/ui/shadcn/input';
  import { Label } from '@aphex/ui/shadcn/label';
  import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger
  } from '@aphex/ui/shadcn/dialog';
  import * as Select from '@aphex/ui/shadcn/select';
  import { invalidateAll } from '$app/navigation';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

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
      alert('Please enter a key name');
      return;
    }

    isCreating = true;
    try {
      const response = await fetch('/api/settings/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newKeyName.trim(),
          permissions: newKeyPermissions,
          expiresInDays: newKeyExpiresInDays
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create API key');
      }

      const result = await response.json();
      createdKey = { key: result.apiKey.key, name: result.apiKey.name };

      // Reset form
      newKeyName = '';
      newKeyPermissions = ['read'];
      newKeyExpiresValue = '365';
      newKeyExpiresInDays = 365;

      // Refresh the list
      await invalidateAll();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to create API key');
    } finally {
      isCreating = false;
    }
  }

  async function deleteApiKey(id: string, name: string) {
    if (!confirm(`Are you sure you want to delete "${name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/settings/api-keys/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete API key');
      }

      await invalidateAll();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to delete API key');
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
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
      newKeyPermissions = newKeyPermissions.filter(p => p !== permission);
    } else {
      newKeyPermissions = [...newKeyPermissions, permission];
    }
  }
</script>

<div class="container mx-auto p-6 max-w-6xl">
  <div class="flex justify-between items-center mb-6">
    <div>
      <h1 class="text-3xl font-bold">Settings</h1>
      <p class="text-muted-foreground mt-1">Manage your API keys and access tokens</p>
    </div>
  </div>

  <Card class="p-6">
    <div class="flex justify-between items-center mb-6">
      <div>
        <h2 class="text-xl font-semibold">API Keys</h2>
        <p class="text-sm text-muted-foreground mt-1">
          API keys allow programmatic access to your CMS content
        </p>
      </div>
      <Dialog bind:open={createDialogOpen}>
        <DialogTrigger>
          <Button>Create API Key</Button>
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
                <p class="text-sm font-medium mt-1">{createdKey.name}</p>
              </div>
              <div>
                <Label>API Key</Label>
                <div class="flex gap-2 mt-1">
                  <Input
                    value={createdKey.key}
                    readonly
                    class="font-mono text-xs"
                  />
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
                <p class="text-xs text-muted-foreground mt-1">
                  A descriptive name to identify this key
                </p>
              </div>

              <div>
                <Label>Permissions</Label>
                <div class="flex gap-2 mt-2">
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
                <p class="text-xs text-muted-foreground mt-1">
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
                onclick={() => createDialogOpen = false}
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
    </div>

    {#if data.apiKeys.length === 0}
      <div class="text-center py-12 text-muted-foreground">
        <p class="text-lg">No API keys yet</p>
        <p class="text-sm mt-2">Create your first API key to access the CMS programmatically</p>
      </div>
    {:else}
      <div class="space-y-3">
        {#each data.apiKeys as apiKey (apiKey.id)}
          <div class="border rounded-lg p-4 flex items-center justify-between">
            <div class="flex-1">
              <div class="flex items-center gap-3">
                <h3 class="font-medium">{apiKey.name}</h3>
                <div class="flex gap-1">
                  {#each apiKey.permissions as permission}
                    <span class="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                      {permission}
                    </span>
                  {/each}
                </div>
              </div>
              <div class="flex gap-4 mt-2 text-xs text-muted-foreground">
                <span>Created: {formatDate(apiKey.createdAt)}</span>
                <span>Last used: {formatDate(apiKey.lastRequest)}</span>
                <span>
                  Expires: {apiKey.expiresAt ? formatDate(apiKey.expiresAt) : 'Never'}
                </span>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onclick={() => deleteApiKey(apiKey.id, apiKey.name!)}
            >
              Delete
            </Button>
          </div>
        {/each}
      </div>
    {/if}

    <div class="mt-6 p-4 border rounded-lg bg-muted/50">
      <h3 class="text-sm font-medium mb-2">Usage</h3>
      <p class="text-xs text-muted-foreground mb-2">
        Include your API key in the <code class="px-1 py-0.5 bg-background rounded">x-api-key</code> header
      </p>
    </div>
  </Card>
</div>
