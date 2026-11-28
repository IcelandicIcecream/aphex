<script lang="ts">
	import type { FieldComponentProps } from '@aphexcms/cms-core';
	import * as Popover from '@aphexcms/ui/shadcn/popover';
	import { Input } from '@aphexcms/ui/shadcn/input';
	import { cn } from '@aphexcms/ui/utils';
	import { X } from '@lucide/svelte';
	import { ICON_WEIGHTS, WEIGHT_TITLES, isIconWeight, type IconWeight } from './constants.js';
	import { allIcons, searchIcons } from './lookup.js';
	import { isDrawableIcon, isIconValue, type IconValue } from './value.js';
	import Icon from './Icon.svelte';

	/**
	 * An icon field as one row: the chosen icon and its name, opening a searchable
	 * grid of Phosphor's icons. Search finds names and meanings (`cafe` finds a coffee
	 * cup). The weight row restyles the grid and the chosen icon together.
	 */
	let {
		field,
		value,
		onUpdate,
		validationClasses,
		readonly = false
	}: FieldComponentProps = $props();

	const weights = $derived.by((): IconWeight[] => {
		const allowed = field.inputOptions?.weights;
		const list = Array.isArray(allowed) ? allowed.filter(isIconWeight) : [];
		return list.length ? list : [...ICON_WEIGHTS];
	});
	const startWeight = $derived.by((): IconWeight => {
		const option = field.inputOptions?.weight;
		return isIconWeight(option) && weights.includes(option) ? option : (weights[0] ?? 'regular');
	});

	const current = $derived(isIconValue(value) ? value : null);
	let open = $state(false);
	let query = $state('');
	let weight = $state<IconWeight>('regular');
	$effect(() => {
		// The grid opens in the chosen icon's weight, else the field's.
		if (open)
			weight = current?.weight && weights.includes(current.weight) ? current.weight : startWeight;
	});

	let names = $state<string[]>([]);
	let drawings = $state<Record<string, string | [string, string]>>({});
	let loading = $state(true);
	$effect(() => {
		if (!open) return;
		const q = query;
		const w = weight;
		let stale = false;
		loading = true;
		Promise.all([searchIcons(q, 240), allIcons(w)]).then(([found, data]) => {
			if (stale) return;
			names = found;
			drawings = data;
			loading = false;
		});
		return () => {
			stale = true;
		};
	});

	function valueFor(name: string, w: IconWeight): IconValue | null {
		const entry = drawings[name];
		if (entry === undefined) return null;
		return typeof entry === 'string'
			? { name, weight: w, path: entry }
			: { name, weight: w, path: entry[0], shade: entry[1] };
	}

	function choose(name: string) {
		const next = valueFor(name, weight);
		if (!next) return;
		onUpdate(next);
		open = false;
		query = '';
	}

	/** A new weight restyles the chosen icon too, once its drawings are in. */
	async function setWeight(next: IconWeight) {
		weight = next;
		if (!current) return;
		const data = await allIcons(next);
		const entry = data[current.name];
		if (entry === undefined || weight !== next) return;
		onUpdate(
			typeof entry === 'string'
				? { name: current.name, weight: next, path: entry }
				: { name: current.name, weight: next, path: entry[0], shade: entry[1] }
		);
	}

	const label = (name: string) => name.replace(/-/g, ' ');
</script>

<div class="row" class:readonly aria-disabled={readonly}>
	<Popover.Root bind:open>
		<Popover.Trigger
			class={cn(
				'border-input bg-background focus-visible:ring-ring/50 flex h-9 items-center gap-2 rounded-md border px-3 text-left text-sm shadow-xs outline-none focus-visible:ring-[3px]',
				validationClasses
			)}
			disabled={readonly}
			aria-label="Choose {field.title ?? 'an icon'}"
		>
			{#if isDrawableIcon(current)}
				<Icon value={current} class="size-5 shrink-0" />
				<span class="truncate">{label(current.name)}</span>
				{#if current.weight && current.weight !== 'regular'}
					<span class="text-muted-foreground shrink-0 text-xs">{WEIGHT_TITLES[current.weight]}</span
					>
				{/if}
			{:else if current}
				<!-- Named but not drawn: a name Phosphor doesn't have. -->
				<span class="text-muted-foreground truncate"
					>“{current.name}” isn't an icon. Choose one</span
				>
			{:else}
				<span class="text-muted-foreground">Choose an icon</span>
			{/if}
		</Popover.Trigger>
		<Popover.Content class="w-[22rem] p-0" align="start">
			<div class="picker">
				<Input
					class="h-8 text-sm"
					placeholder="Search: coffee, phone, star…"
					value={query}
					oninput={(event) => (query = event.currentTarget.value)}
					autofocus
					spellcheck={false}
					autocomplete="off"
				/>
				{#if weights.length > 1}
					<div class="weights" role="radiogroup" aria-label="Weight">
						{#each weights as w (w)}
							<button
								type="button"
								role="radio"
								aria-checked={weight === w}
								class:on={weight === w}
								onclick={() => setWeight(w)}
							>
								{WEIGHT_TITLES[w]}
							</button>
						{/each}
					</div>
				{/if}
				<div class="grid" aria-busy={loading}>
					{#each names as name (name)}
						{@const drawn = valueFor(name, weight)}
						{#if drawn}
							<button
								type="button"
								class:on={current?.name === name}
								title={label(name)}
								aria-label={label(name)}
								onclick={() => choose(name)}
							>
								<Icon value={drawn} />
							</button>
						{/if}
					{:else}
						{#if !loading}<p class="empty">No icon matches “{query}”.</p>{/if}
					{/each}
				</div>
				<p class="credit">Icons by Phosphor</p>
			</div>
		</Popover.Content>
	</Popover.Root>

	{#if current && !readonly}
		<button
			type="button"
			class="clear"
			aria-label="Clear {field.title ?? 'icon'}"
			title="Clear"
			onclick={() => onUpdate(undefined)}
		>
			<X class="size-4" />
		</button>
	{/if}
</div>

<style>
	/* Layout in the component's own CSS: an app's Tailwind may not scan this package. */
	.row {
		display: flex;
		align-items: center;
		gap: 0.25rem;
	}
	.row.readonly {
		opacity: 0.5;
	}
	.row > :global(button:first-child) {
		flex: 1 1 0;
		min-width: 0;
	}
	.clear {
		display: grid;
		place-items: center;
		flex: none;
		width: 1.75rem;
		height: 1.75rem;
		border-radius: 0.375rem;
		color: var(--muted-foreground);
	}
	.clear:hover {
		color: var(--foreground);
		background: var(--muted);
	}
	.clear :global(svg) {
		width: 1rem;
		height: 1rem;
	}
	.picker {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		padding: 0.625rem;
	}
	.weights {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem;
	}
	.weights button {
		border: 1px solid var(--border);
		border-radius: 999px;
		padding: 0.125rem 0.5rem;
		font-size: 0.75rem;
		color: var(--muted-foreground);
	}
	.weights button:hover {
		color: var(--foreground);
	}
	.weights button.on {
		border-color: var(--primary);
		color: var(--foreground);
		background: color-mix(in oklch, var(--primary) 12%, transparent);
	}
	.grid {
		display: grid;
		grid-template-columns: repeat(8, minmax(0, 1fr));
		gap: 0.125rem;
		max-height: 16.5rem;
		overflow-y: auto;
		overscroll-behavior: contain;
	}
	.grid button {
		display: grid;
		place-items: center;
		aspect-ratio: 1;
		border-radius: 0.375rem;
		font-size: 1.25rem;
		color: var(--foreground);
	}
	.grid button:hover,
	.grid button:focus-visible {
		background: var(--muted);
		outline: none;
	}
	.grid button.on {
		background: color-mix(in oklch, var(--primary) 16%, transparent);
		box-shadow: inset 0 0 0 1px var(--primary);
	}
	.empty {
		grid-column: 1 / -1;
		padding: 1.5rem 0;
		text-align: center;
		font-size: 0.8125rem;
		color: var(--muted-foreground);
	}
	.credit {
		font-size: 0.6875rem;
		color: var(--muted-foreground);
	}
</style>
