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
	import type { CapabilityDefinition, Role } from '@aphexcms/cms-core';
	import { roles as rolesApi } from '@aphexcms/cms-core/client';
	import { invalidateAll } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import { Pencil, Plus, Trash2 } from '@lucide/svelte';
	import type { PageData } from './$types';
	import SettingsHeaderActions from '../_components/SettingsHeaderActions.svelte';

	let { data }: { data: PageData } = $props();

	const roles = $derived(data.roles as Role[]);
	const activeOrganization = $derived((data as any).activeOrganization);
	// Read from the shared permissions context instead of a separate server
	// flag — single source of truth, stays in sync if the role changes.
	const perms = usePermissions();
	const canManageRoles = $derived(perms.can('role.manage'));

	type EditorState = { kind: 'closed' } | { kind: 'create' } | { kind: 'edit'; role: Role };

	let editor = $state<EditorState>({ kind: 'closed' });
	let form = $state({
		name: '',
		description: '',
		capabilities: new Set<string>()
	});
	let saving = $state(false);

	// The capability registry (built-in + plugin-declared), resolved server-side and
	// passed via load. Replaces the previously-hardcoded list, so plugin capabilities
	// appear here automatically.
	const catalog = $derived(data.capabilityCatalog as CapabilityDefinition[]);
	const capabilityById = $derived(new Map(catalog.map((d) => [d.id, d])));
	const totalCapabilities = $derived(catalog.length);

	// Group by each definition's `group` (falling back to "Other"), preserving the
	// catalog's order within each group and first-seen order of the groups.
	function groupedCapabilities() {
		const groups = new Map<string, CapabilityDefinition[]>();
		for (const def of catalog) {
			const title = def.group ?? 'Other';
			(groups.get(title) ?? groups.set(title, []).get(title)!).push(def);
		}
		return [...groups.entries()].map(([title, items]) => ({ title, items }));
	}

	function capabilityLabel(cap: string): string {
		return capabilityById.get(cap)?.title ?? cap;
	}

	function roleMemberCount(roleName: string): number {
		return (
			activeOrganization?.members?.filter((member: any) => member.role === roleName).length ?? 0
		);
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
	// Built-in read/write implications only — plugin caps aren't in these maps, so a
	// plugin capability is simply toggled on its own (correct: it implies nothing).
	const READ_IMPLIED_BY: Record<string, string> = {
		'document.create': 'document.read',
		'document.update': 'document.read',
		'document.delete': 'document.read',
		'document.publish': 'document.read',
		'document.unpublish': 'document.read',
		'asset.upload': 'asset.read',
		'asset.delete': 'asset.read'
	};

	const WRITES_NEEDING: Record<string, string[]> = Object.entries(READ_IMPLIED_BY).reduce(
		(acc, [write, read]) => {
			(acc[read] ??= []).push(write);
			return acc;
		},
		{} as Record<string, string[]>
	);

	function toggleCapability(cap: string, next: boolean) {
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

	function isImpliedRead(cap: string): boolean {
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

{#if canManageRoles}
	<SettingsHeaderActions>
		<Button onclick={openCreate} class="shrink-0">
			<Plus class="mr-1 h-4 w-4" /> New role
		</Button>
	</SettingsHeaderActions>
{/if}

<div class="grid gap-6">
	<div class="grid gap-4 xl:grid-cols-2">
		{#each roles as role (role.id)}
			<Card.Root class="overflow-hidden">
				<Card.Content class="p-4">
					<div class="flex items-start justify-between gap-4">
						<div class="min-w-0">
							<div class="flex flex-wrap items-center gap-2">
								<h2 class="truncate text-lg font-semibold capitalize">{role.name}</h2>
								{#if role.isBuiltIn}
									<Badge variant="secondary" class="text-[10px]">System</Badge>
								{/if}
								<span class="text-muted-foreground text-xs">
									{roleMemberCount(role.name)} member{roleMemberCount(role.name) === 1 ? '' : 's'}
								</span>
							</div>
							{#if role.description}
								<p class="text-muted-foreground mt-1 text-sm">{role.description}</p>
							{/if}
						</div>

						{#if canManageRoles}
							<div class="flex shrink-0 items-center gap-2">
								<Button variant="outline" size="sm" onclick={() => openEdit(role)}>
									<Pencil class="mr-1 h-3.5 w-3.5" /> Edit
								</Button>
								{#if !role.isBuiltIn}
									<Button variant="outline" size="sm" onclick={() => remove(role)}>
										<Trash2 class="text-destructive h-3.5 w-3.5" />
										<span class="sr-only">Delete</span>
									</Button>
								{/if}
							</div>
						{/if}
					</div>

					<Separator class="my-4" />

					<div class="grid gap-4 sm:grid-cols-2">
						{#each groupedCapabilities() as group (group.title)}
							<div class="space-y-2">
								<p class="text-muted-foreground text-xs font-medium">{group.title}</p>
								<div class="flex flex-wrap gap-1.5">
									{#each group.items as def (def.id)}
										{@const enabled = role.capabilities.includes(def.id)}
										<Badge
											variant={enabled ? 'secondary' : 'outline'}
											class={enabled
												? 'bg-primary/10 text-primary border-primary/20 text-xs font-normal'
												: 'bg-muted/20 text-muted-foreground/60 text-xs font-normal'}
										>
											{def.title}
										</Badge>
									{/each}
								</div>
							</div>
						{/each}
					</div>
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
						{form.capabilities.size} of {totalCapabilities} selected
					</span>
				</div>

				{#each groupedCapabilities() as group (group.title)}
					<div class="space-y-2">
						<p class="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
							{group.title}
						</p>
						<div class="grid gap-2">
							{#each group.items as def (def.id)}
								{@const implied = isImpliedRead(def.id)}
								<label
									class="hover:bg-muted flex cursor-pointer items-center gap-3 rounded-md border px-3 py-2"
								>
									<Checkbox
										checked={form.capabilities.has(def.id)}
										disabled={implied}
										onCheckedChange={(v) => toggleCapability(def.id, v === true)}
									/>
									<div class="flex-1">
										<p class="text-sm font-medium">{def.title}</p>
										{#if def.description}
											<p class="text-muted-foreground text-xs">{def.description}</p>
										{/if}
										<p class="text-muted-foreground/70 font-mono text-[10px]">{def.id}</p>
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
