<script lang="ts">
	import * as Card from '@aphexcms/ui/shadcn/card';
	import * as Select from '@aphexcms/ui/shadcn/select';
	import { Button } from '@aphexcms/ui/shadcn/button';
	import { Input } from '@aphexcms/ui/shadcn/input';
	import { Textarea } from '@aphexcms/ui/shadcn/textarea';
	import { Label } from '@aphexcms/ui/shadcn/label';
	import { Switch } from '@aphexcms/ui/shadcn/switch';
	import { toast } from 'svelte-sonner';
	import { onMount } from 'svelte';
	import type { CMSPlugin, SettingsPart } from '../../plugins/types';
	import type { SettingsField } from '../../types/schemas';

	/**
	 * Generic plugin-settings surface. The app mounts this in its settings area and
	 * passes its plugin registry; the panel reads each plugin's `aphex/settings`
	 * declaration, loads the org's masked values from the API, renders a form per
	 * plugin, and saves via the API. Secret fields are write-only (masked); a blank/
	 * untouched submission leaves them unchanged.
	 */
	let { plugins = [] }: { plugins?: CMSPlugin[] } = $props();

	// Settings declarations from the client plugin registry (component plane).
	const declarations = $derived(
		plugins
			.flatMap((p) => p.parts ?? [])
			.filter((part): part is SettingsPart => part.implements === 'aphex/settings')
	);

	// Per-plugin working values, plus the last-saved snapshot for dirty detection.
	let valuesByPlugin = $state<Record<string, Record<string, unknown>>>({});
	let savedByPlugin = $state<Record<string, string>>({});
	let secretsEnabled = $state(true);
	let loading = $state(true);
	let loadError = $state<string | null>(null);
	let savingId = $state<string | null>(null);

	onMount(async () => {
		try {
			const res = await fetch('/api/plugin-settings');
			const json = await res.json();
			if (!res.ok || !json.success) {
				loadError = json?.message ?? 'Failed to load plugin settings';
				return;
			}
			secretsEnabled = json.secretsEnabled ?? true;
			for (const entry of json.data as Array<{
				pluginId: string;
				values: Record<string, unknown>;
			}>) {
				valuesByPlugin[entry.pluginId] = { ...entry.values };
				savedByPlugin[entry.pluginId] = JSON.stringify(entry.values);
			}
		} catch {
			loadError = 'Failed to load plugin settings';
		} finally {
			loading = false;
		}
	});

	function getVal(pluginId: string, name: string): unknown {
		return valuesByPlugin[pluginId]?.[name];
	}
	function setVal(pluginId: string, name: string, value: unknown) {
		valuesByPlugin[pluginId] = { ...(valuesByPlugin[pluginId] ?? {}), [name]: value };
	}
	function isDirty(pluginId: string): boolean {
		return JSON.stringify(valuesByPlugin[pluginId] ?? {}) !== savedByPlugin[pluginId];
	}

	// Normalize a string field's `list` to `{ title, value }[]`.
	function listItems(field: SettingsField): Array<{ title: string; value: string }> {
		const list = (field as { list?: unknown }).list;
		if (!Array.isArray(list)) return [];
		return list.map((item) =>
			typeof item === 'string'
				? { title: item, value: item }
				: (item as { title: string; value: string })
		);
	}

	async function save(decl: SettingsPart) {
		savingId = decl.pluginId;
		try {
			const res = await fetch(`/api/plugin-settings/${encodeURIComponent(decl.pluginId)}`, {
				method: 'PUT',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ values: valuesByPlugin[decl.pluginId] ?? {} })
			});
			const json = await res.json();
			if (!res.ok || !json.success) {
				toast.error(json?.message ?? 'Failed to save settings');
				return;
			}
			valuesByPlugin[decl.pluginId] = { ...json.data.values };
			savedByPlugin[decl.pluginId] = JSON.stringify(json.data.values);
			toast.success(`${decl.title} settings saved`);
		} catch {
			toast.error('Failed to save settings');
		} finally {
			savingId = null;
		}
	}
</script>

{#snippet fieldControl(decl: SettingsPart, field: SettingsField)}
	{@const value = getVal(decl.pluginId, field.name)}
	{#if field.type === 'secret'}
		<Input
			type="password"
			autocomplete="off"
			disabled={!secretsEnabled}
			placeholder={secretsEnabled
				? 'Enter a value to set or replace'
				: 'Encryption key not configured'}
			value={typeof value === 'string' ? value : ''}
			oninput={(e) => setVal(decl.pluginId, field.name, e.currentTarget.value)}
		/>
	{:else if field.type === 'boolean'}
		<Switch
			checked={value === true}
			onCheckedChange={(c) => setVal(decl.pluginId, field.name, c)}
		/>
	{:else if field.type === 'number'}
		<Input
			type="number"
			value={value == null ? '' : String(value)}
			oninput={(e) =>
				setVal(
					decl.pluginId,
					field.name,
					e.currentTarget.value === '' ? null : Number(e.currentTarget.value)
				)}
		/>
	{:else if field.type === 'text'}
		<Textarea
			value={typeof value === 'string' ? value : ''}
			oninput={(e) => setVal(decl.pluginId, field.name, e.currentTarget.value)}
		/>
	{:else if field.type === 'string' && listItems(field).length > 0}
		{@const items = listItems(field)}
		<Select.Root
			type="single"
			value={typeof value === 'string' ? value : ''}
			onValueChange={(v) => setVal(decl.pluginId, field.name, v)}
		>
			<Select.Trigger class="w-full">
				{items.find((i) => i.value === value)?.title ?? 'Select…'}
			</Select.Trigger>
			<Select.Content>
				{#each items as item (item.value)}
					<Select.Item value={item.value} label={item.title}>{item.title}</Select.Item>
				{/each}
			</Select.Content>
		</Select.Root>
	{:else}
		<Input
			value={typeof value === 'string' ? value : ''}
			placeholder={(field as { placeholder?: string }).placeholder ?? ''}
			oninput={(e) => setVal(decl.pluginId, field.name, e.currentTarget.value)}
		/>
	{/if}
{/snippet}

<div class="space-y-6">
	{#if loading}
		<p class="text-muted-foreground text-sm">Loading…</p>
	{:else if loadError}
		<p class="text-destructive text-sm">{loadError}</p>
	{:else if declarations.length === 0}
		<div class="border-muted-foreground/30 rounded-md border border-dashed p-8 text-center">
			<p class="text-muted-foreground text-sm">No installed plugins have configurable settings.</p>
		</div>
	{:else}
		{#each declarations as decl (decl.pluginId)}
			<Card.Root>
				<Card.Header>
					<Card.Title>{decl.title}</Card.Title>
					{#if decl.description}
						<Card.Description>{decl.description}</Card.Description>
					{/if}
				</Card.Header>
				<Card.Content class="space-y-4">
					{#each decl.fields as field (field.name)}
						<div class="space-y-1.5">
							<Label for={`${decl.pluginId}-${field.name}`}>{field.title}</Label>
							{@render fieldControl(decl, field)}
							{#if field.description}
								<p class="text-muted-foreground text-xs">{field.description}</p>
							{/if}
						</div>
					{/each}
				</Card.Content>
				<Card.Footer class="justify-end">
					<Button
						onclick={() => save(decl)}
						disabled={savingId === decl.pluginId || !isDirty(decl.pluginId)}
					>
						{savingId === decl.pluginId ? 'Saving…' : 'Save'}
					</Button>
				</Card.Footer>
			</Card.Root>
		{/each}
	{/if}
</div>
