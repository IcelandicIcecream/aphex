<script lang="ts">
	import * as Card from '@aphexcms/ui/shadcn/card';
	import * as Sheet from '@aphexcms/ui/shadcn/sheet';
	import { Button } from '@aphexcms/ui/shadcn/button';
	import { Input } from '@aphexcms/ui/shadcn/input';
	import { Textarea } from '@aphexcms/ui/shadcn/textarea';
	import { Label } from '@aphexcms/ui/shadcn/label';
	import { Checkbox } from '@aphexcms/ui/shadcn/checkbox';
	import { Badge } from '@aphexcms/ui/shadcn/badge';
	import { Separator } from '@aphexcms/ui/shadcn/separator';
	import { confirmDialog, usePermissions } from '@aphexcms/cms-core/client';
	import { ALL_CAPABILITIES } from '@aphexcms/cms-core';
	import type { Capability, Role } from '@aphexcms/cms-core';
	import { roles as rolesApi } from '@aphexcms/cms-core/client';
	import { invalidateAll } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import { Shield, Plus, Pencil, Trash2, Lock } from '@lucide/svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const roles = $derived(data.roles as Role[]);
	// Read from the shared permissions context instead of a separate server
	// flag — single source of truth, stays in sync if the role changes.
	const perms = usePermissions();
	const canManageRoles = $derived(perms.can('role.manage'));

	type EditorState = { kind: 'closed' } | { kind: 'create' } | { kind: 'edit'; role: Role };

	let editor = $state<EditorState>({ kind: 'closed' });
	let form = $state({
		name: '',
		description: '',
		capabilities: new Set<Capability>()
	});
	let saving = $state(false);

	// Capability groupings for the picker. Any capability not listed here falls
	// into "Other" so new additions don't disappear silently.
	const CAPABILITY_GROUPS: { title: string; prefix: string }[] = [
		{ title: 'Documents', prefix: 'document.' },
		{ title: 'Assets', prefix: 'asset.' },
		{ title: 'Members', prefix: 'member.' },
		{ title: 'Organization', prefix: 'org.' },
		{ title: 'Keys & Roles', prefix: '' } // catch-all, resolved below
	];

	function groupedCapabilities() {
		const groups: Record<string, Capability[]> = {};
		for (const cap of ALL_CAPABILITIES) {
			const match = CAPABILITY_GROUPS.find((g) => g.prefix && cap.startsWith(g.prefix));
			const title = match?.title ?? 'Keys & Roles';
			(groups[title] ??= []).push(cap);
		}
		return CAPABILITY_GROUPS.map((g) => ({
			title: g.title,
			items: groups[g.title] ?? []
		})).filter((g) => g.items.length > 0);
	}

	function capabilityLabel(cap: Capability): string {
		// "document.publish" → "Publish"
		const suffix = cap.split('.').slice(1).join('.');
		return suffix.charAt(0).toUpperCase() + suffix.slice(1);
	}

	function openCreate() {
		form = { name: '', description: '', capabilities: new Set() };
		editor = { kind: 'create' };
	}

	function openEdit(role: Role) {
		form = {
			name: role.name,
			description: role.description ?? '',
			capabilities: new Set(role.capabilities)
		};
		editor = { kind: 'edit', role };
	}

	function closeEditor() {
		editor = { kind: 'closed' };
	}

	// Write caps imply their matching read on the same resource family. Mirror
	// the server-side normalization visually so users see the read checkbox
	// light up instead of being surprised by it reappearing post-save.
	const READ_IMPLIED_BY: Partial<Record<Capability, Capability>> = {
		'document.create': 'document.read',
		'document.update': 'document.read',
		'document.delete': 'document.read',
		'document.publish': 'document.read',
		'document.unpublish': 'document.read',
		'asset.upload': 'asset.read',
		'asset.delete': 'asset.read'
	};

	const WRITES_NEEDING: Record<Capability, Capability[]> = Object.entries(READ_IMPLIED_BY).reduce(
		(acc, [write, read]) => {
			if (!read) return acc;
			(acc[read as Capability] ??= []).push(write as Capability);
			return acc;
		},
		{} as Record<Capability, Capability[]>
	);

	function toggleCapability(cap: Capability, next: boolean) {
		const updated = new Set(form.capabilities);
		if (next) {
			updated.add(cap);
			const implied = READ_IMPLIED_BY[cap];
			if (implied) updated.add(implied);
		} else {
			// Don't allow unchecking a read cap while a dependent write is selected —
			// the server would re-add it anyway.
			const dependents = WRITES_NEEDING[cap] ?? [];
			if (dependents.some((w) => updated.has(w))) return;
			updated.delete(cap);
		}
		form.capabilities = updated;
	}

	function isImpliedRead(cap: Capability): boolean {
		const dependents = WRITES_NEEDING[cap] ?? [];
		return dependents.some((w) => form.capabilities.has(w));
	}

	async function save() {
		saving = true;
		try {
			const capabilities = Array.from(form.capabilities);
			if (editor.kind === 'create') {
				if (!form.name.trim()) {
					toast.error('Name is required');
					return;
				}
				const result = await rolesApi.create({
					name: form.name.trim(),
					description: form.description.trim() || null,
					capabilities
				});
				if (!result.success) throw new Error(result.error || 'Failed to create role');
				toast.success(`Role "${form.name.trim()}" created`);
			} else if (editor.kind === 'edit') {
				const result = await rolesApi.update(editor.role.name, {
					description: form.description.trim() || null,
					capabilities
				});
				if (!result.success) throw new Error(result.error || 'Failed to update role');
				toast.success(`Role "${editor.role.name}" updated`);
			}
			closeEditor();
			await invalidateAll();
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Failed to save role');
		} finally {
			saving = false;
		}
	}

	async function remove(role: Role) {
		const confirmed = await confirmDialog({
			title: `Delete role "${role.name}"?`,
			description:
				'This cannot be undone. Members and pending invitations using this role will block the deletion.',
			confirmText: 'Delete',
			variant: 'destructive'
		});
		if (!confirmed) return;

		try {
			const result = await rolesApi.remove(role.name);
			if (!result.success) throw new Error(result.error || 'Failed to delete role');
			toast.success(`Role "${role.name}" deleted`);
			await invalidateAll();
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Failed to delete role');
		}
	}
</script>

<svelte:head>
	<title>Aphex CMS - Roles</title>
</svelte:head>

<div class="grid gap-6">
	<div class="flex items-start justify-between gap-4">
		<div class="hidden sm:block">
			<h2 class="text-xl font-semibold">Roles</h2>
			<p class="text-muted-foreground text-sm">
				Define which members can do what. Built-in roles are always available; add custom roles to
				match how your team works.
			</p>
		</div>
		{#if canManageRoles}
			<Button onclick={openCreate} class="shrink-0">
				<Plus class="mr-1 h-4 w-4" /> New role
			</Button>
		{/if}
	</div>

	<div class="grid gap-3">
		{#each roles as role (role.id)}
			<Card.Root>
				<Card.Content class="flex items-center gap-4 py-4">
					<div class="bg-muted flex h-10 w-10 items-center justify-center rounded-md">
						{#if role.isBuiltIn}
							<Lock class="text-muted-foreground h-4 w-4" />
						{:else}
							<Shield class="text-muted-foreground h-4 w-4" />
						{/if}
					</div>
					<div class="min-w-0 flex-1">
						<div class="flex items-center gap-2">
							<p class="truncate text-sm font-semibold capitalize">{role.name}</p>
							{#if role.isBuiltIn}
								<Badge variant="secondary" class="text-[10px]">Built-in</Badge>
							{/if}
							<Badge variant="outline" class="text-[10px]">
								{role.capabilities.length} capabilit{role.capabilities.length === 1 ? 'y' : 'ies'}
							</Badge>
						</div>
						{#if role.description}
							<p class="text-muted-foreground mt-0.5 truncate text-xs">{role.description}</p>
						{/if}
					</div>
					{#if canManageRoles}
						<div class="flex items-center gap-2">
							<Button variant="outline" size="sm" onclick={() => openEdit(role)}>
								<Pencil class="mr-1 h-3.5 w-3.5" /> Edit
							</Button>
							{#if !role.isBuiltIn}
								<Button variant="outline" size="sm" onclick={() => remove(role)}>
									<Trash2 class="text-destructive mr-1 h-3.5 w-3.5" /> Delete
								</Button>
							{/if}
						</div>
					{/if}
				</Card.Content>
			</Card.Root>
		{/each}
	</div>
</div>

<Sheet.Root
	open={editor.kind !== 'closed'}
	onOpenChange={(o) => {
		if (!o) closeEditor();
	}}
>
	<Sheet.Content class="flex w-full flex-col gap-0 p-0 sm:max-w-lg">
		<Sheet.Header class="border-b p-6">
			<Sheet.Title>
				{editor.kind === 'create'
					? 'Create role'
					: `Edit "${editor.kind === 'edit' ? editor.role.name : ''}"`}
			</Sheet.Title>
			<Sheet.Description>
				{#if editor.kind === 'edit' && editor.role.isBuiltIn}
					Built-in role. Capabilities can be tuned; the name is fixed.
				{:else}
					Pick the capabilities this role grants. Members assigned to this role will gain every
					checked permission.
				{/if}
			</Sheet.Description>
		</Sheet.Header>

		<div class="flex-1 space-y-6 overflow-y-auto p-6">
			<div class="space-y-2">
				<Label for="role-name">Name</Label>
				<Input
					id="role-name"
					bind:value={form.name}
					disabled={editor.kind === 'edit'}
					placeholder="e.g. translator"
				/>
				{#if editor.kind === 'create'}
					<p class="text-muted-foreground text-xs">
						Letters, numbers, spaces, hyphens, or underscores. Used when assigning members.
					</p>
				{/if}
			</div>

			<div class="space-y-2">
				<Label for="role-description">Description</Label>
				<Textarea
					id="role-description"
					bind:value={form.description}
					placeholder="What does this role do?"
					rows={2}
				/>
			</div>

			<Separator />

			<div class="space-y-4">
				<div class="flex items-center justify-between">
					<Label>Capabilities</Label>
					<span class="text-muted-foreground text-xs">
						{form.capabilities.size} of {ALL_CAPABILITIES.length} selected
					</span>
				</div>

				{#each groupedCapabilities() as group (group.title)}
					<div class="space-y-2">
						<p class="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
							{group.title}
						</p>
						<div class="grid gap-2">
							{#each group.items as cap (cap)}
								{@const implied = isImpliedRead(cap)}
								<label
									class="hover:bg-muted flex cursor-pointer items-center gap-3 rounded-md border px-3 py-2"
								>
									<Checkbox
										checked={form.capabilities.has(cap)}
										disabled={implied}
										onCheckedChange={(v) => toggleCapability(cap, v === true)}
									/>
									<div class="flex-1">
										<p class="text-sm font-medium">{capabilityLabel(cap)}</p>
										<p class="text-muted-foreground font-mono text-[10px]">{cap}</p>
									</div>
								</label>
							{/each}
						</div>
					</div>
				{/each}
			</div>
		</div>

		<div class="flex items-center justify-end gap-2 border-t p-6">
			<Button variant="outline" onclick={closeEditor} disabled={saving}>Cancel</Button>
			<Button onclick={save} disabled={saving}>
				{saving ? 'Saving...' : editor.kind === 'create' ? 'Create role' : 'Save changes'}
			</Button>
		</div>
	</Sheet.Content>
</Sheet.Root>
