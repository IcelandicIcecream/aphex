<!--
	The "add item" dialog for an array with `options.insertMenu`: group tabs, a
	search box and a grid of cards (thumbnail or icon, title, one-line
	description) or a list. A page builder's blocks are chosen by what they look
	like and do, which a dropdown of type names can't show.
-->
<script lang="ts">
	import * as Dialog from '@aphexcms/ui/shadcn/dialog';
	import { Input } from '@aphexcms/ui/shadcn/input';
	import { FileText, LayoutGrid, List, Search } from '@lucide/svelte';
	import type { ArrayInsertMenu, SchemaType } from '../../../types/schemas';

	interface Props {
		open: boolean;
		/** The array's title, for the heading ("Add to Blocks"). */
		title: string;
		types: SchemaType[];
		menu: ArrayInsertMenu;
		onSelect: (typeName: string) => void;
		onOpenChange: (open: boolean) => void;
	}

	let { open, title, types, menu, onSelect, onOpenChange }: Props = $props();

	let query = $state('');
	let group = $state('all');
	let viewIndex = $state(0);

	const views = $derived(menu.views?.length ? menu.views : [{ name: 'grid' as const }]);
	const view = $derived(views[Math.min(viewIndex, views.length - 1)]!);
	const thumbnail = (name: string) =>
		view.name === 'grid' && 'previewImageUrl' in view ? view.previewImageUrl?.(name) : undefined;

	// Only groups that hold at least one of this array's types.
	const groups = $derived(
		(menu.groups ?? []).filter((g) => g.of?.some((name) => types.some((t) => t.name === name)))
	);
	const showSearch = $derived(
		menu.filter === true || ((menu.filter ?? 'auto') === 'auto' && types.length > 5)
	);

	const byName = (names: string[] | undefined) =>
		(names ?? []).flatMap((n) => types.filter((t) => t.name === n));
	// "All" follows the groups' order, then anything no group names.
	const ordered = $derived.by(() => {
		const grouped = [...new Set(groups.flatMap((g) => byName(g.of)))];
		return [...grouped, ...types.filter((t) => !grouped.includes(t))];
	});

	/**
	 * Every word must appear in the title, name or description. A word also
	 * matches without its last letter, so "price" finds "Pricing" and "photos"
	 * finds "photo".
	 */
	function matches(type: SchemaType, words: string[]) {
		const hay = [type.title, type.name, type.description].join(' ').toLowerCase();
		return words.every((w) => hay.includes(w) || (w.length > 3 && hay.includes(w.slice(0, -1))));
	}

	const shown = $derived.by(() => {
		const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
		// A search looks across every group: someone typing "price" wants the
		// pricing block wherever it lives, not "no results in Start".
		if (words.length) return ordered.filter((t) => matches(t, words));
		const inGroup = groups.find((g) => g.name === group);
		return inGroup ? byName(inGroup.of) : ordered;
	});

	// Each opening starts fresh, on "All" with an empty search.
	$effect(() => {
		if (open) {
			query = '';
			group = 'all';
		}
	});

	function choose(name: string) {
		onSelect(name);
		onOpenChange(false);
	}

	function onSearchKey(event: KeyboardEvent) {
		if (event.key === 'Enter' && shown[0]) {
			event.preventDefault();
			choose(shown[0].name);
		}
	}
</script>

<Dialog.Root {open} {onOpenChange}>
	<!-- A fixed height, so the dialog doesn't jump as a search narrows the list. -->
	<Dialog.Content class="flex h-[min(85vh,44rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl">
		<Dialog.Header class="border-b px-5 pt-5 pb-4">
			<Dialog.Title>Add to {title}</Dialog.Title>
			<Dialog.Description class="sr-only">Choose what to add.</Dialog.Description>
			{#if showSearch || views.length > 1}
				<div class="mt-3 flex items-center gap-2">
					{#if showSearch}
						<div class="relative flex-1">
							<Search
								class="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2"
							/>
							<Input
								bind:value={query}
								onkeydown={onSearchKey}
								placeholder="Search"
								aria-label="Search"
								class="pl-8"
							/>
						</div>
					{/if}
					{#if views.length > 1}
						<div class="ml-auto flex rounded-md border p-0.5" role="group" aria-label="View">
							{#each views as v, i (v.name)}
								{@const Icon = v.name === 'grid' ? LayoutGrid : List}
								<button
									type="button"
									class="text-muted-foreground hover:text-foreground aria-pressed:bg-muted aria-pressed:text-foreground rounded p-1.5 transition-colors"
									aria-pressed={i === viewIndex}
									aria-label={v.name === 'grid' ? 'Grid' : 'List'}
									onclick={() => (viewIndex = i)}
								>
									<Icon class="h-4 w-4" />
								</button>
							{/each}
						</div>
					{/if}
				</div>
			{/if}
			{#if groups.length > 0}
				<div class="-mx-1 mt-3 flex gap-1 overflow-x-auto pb-0.5" role="tablist">
					{#each [{ name: 'all', title: 'All' }, ...groups] as g (g.name)}
						<button
							type="button"
							role="tab"
							aria-selected={group === g.name && !query.trim()}
							class="text-muted-foreground hover:text-foreground aria-selected:bg-muted aria-selected:text-foreground shrink-0 rounded-md px-2.5 py-1 text-sm whitespace-nowrap transition-colors"
							onclick={() => {
								group = g.name;
								query = '';
							}}
						>
							{g.title ?? g.name}
						</button>
					{/each}
				</div>
			{/if}
		</Dialog.Header>

		<div class="min-h-0 flex-1 overflow-y-auto p-4">
			{#if shown.length === 0}
				<p class="text-muted-foreground py-12 text-center text-sm">
					Nothing matches “{query.trim()}”.
				</p>
			{:else if view.name === 'grid'}
				<ul class="grid grid-cols-2 gap-3 sm:grid-cols-3">
					{#each shown as type (type.name)}
						{@const src = thumbnail(type.name)}
						<li>
							<button
								type="button"
								class="group hover:border-foreground/30 focus-visible:ring-ring flex h-full w-full flex-col overflow-hidden rounded-lg border text-left transition-colors focus-visible:ring-2 focus-visible:outline-none"
								onclick={() => choose(type.name)}
							>
								<span
									class="bg-muted/60 text-muted-foreground flex aspect-[16/10] w-full items-center justify-center border-b"
								>
									{#if src}
										<img {src} alt="" class="h-full w-full object-cover" loading="lazy" />
									{:else if type.icon}
										{@const Icon = type.icon}
										<Icon class="h-7 w-7" />
									{:else}
										<FileText class="h-7 w-7" />
									{/if}
								</span>
								<span class="flex flex-1 flex-col gap-0.5 p-2.5">
									<span class="text-sm font-medium">{type.title}</span>
									{#if type.description}
										<span class="text-muted-foreground line-clamp-2 text-xs leading-snug">
											{type.description}
										</span>
									{/if}
								</span>
							</button>
						</li>
					{/each}
				</ul>
			{:else}
				<ul class="flex flex-col">
					{#each shown as type (type.name)}
						<li>
							<button
								type="button"
								class="hover:bg-muted/60 focus-visible:bg-muted/60 flex w-full items-start gap-3 rounded-md px-2.5 py-2 text-left transition-colors focus-visible:outline-none"
								onclick={() => choose(type.name)}
							>
								{#if type.icon}
									{@const Icon = type.icon}
									<Icon class="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
								{:else}
									<FileText class="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
								{/if}
								<span class="flex flex-col">
									<span class="text-sm font-medium">{type.title}</span>
									{#if type.description}
										<span class="text-muted-foreground text-xs">{type.description}</span>
									{/if}
								</span>
							</button>
						</li>
					{/each}
				</ul>
			{/if}
		</div>
	</Dialog.Content>
</Dialog.Root>
