<script lang="ts">
	// The SEO dashboard: every document with SEO fields, checked the way a search
	// engine and a share card will read it (./audit.ts), with what to fix first.
	import { assets, documents, formatDate } from '@aphexcms/cms-core';
	import type { AdminToolProps, SchemaType } from '@aphexcms/cms-core';
	import { Button } from '@aphexcms/ui/shadcn/button';
	import * as Card from '@aphexcms/ui/shadcn/card';
	import { Input } from '@aphexcms/ui/shadcn/input';
	import { Skeleton } from '@aphexcms/ui/shadcn/skeleton';
	import { ChevronRight, RefreshCw, Search, X } from '@lucide/svelte';
	import {
		auditDocument,
		issueCounts,
		markDuplicates,
		type AssetInfo,
		type DocumentAudit,
		type IssueCode
	} from './audit';

	let { tool }: { tool: AdminToolProps } = $props();

	const targetTypes = $derived(
		tool.schemas.filter((s) => s.type === 'document' && s.fields.some((f) => f.name === 'seo'))
	);

	let audits = $state<DocumentAudit[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let checkedAt = $state<Date | null>(null);

	type View = 'work' | 'ready' | 'hidden' | 'all';
	let view = $state<View>('work');
	let issue = $state<IssueCode | null>(null);
	let query = $state('');

	/** The site's image library, by id: sizes for share images, alt text for the rest. */
	async function loadAssets(): Promise<Map<string, AssetInfo>> {
		const map = new Map<string, AssetInfo>();
		const limit = 500;
		for (let offset = 0; offset < 10 * limit; offset += limit) {
			const res = await assets.list({ limit, offset });
			const rows = res.success && res.data ? res.data : [];
			for (const a of rows) {
				map.set(a.id, {
					alt: a.alt,
					width: a.width,
					height: a.height,
					isImage: a.assetType === 'image' && a.mimeType !== 'image/svg+xml'
				});
			}
			if (rows.length < limit) break;
		}
		return map;
	}

	async function loadType(schema: SchemaType): Promise<Record<string, unknown>[]> {
		const docs: Record<string, unknown>[] = [];
		for (let page = 1; page <= 10; page++) {
			const res = await documents.list({
				type: schema.name,
				perspective: 'draft',
				pageSize: 200,
				page
			});
			if (!res.success) throw new Error(res.error ?? 'The documents couldn’t load.');
			docs.push(...(res.data ?? []));
			if (!res.pagination?.hasNextPage) break;
		}
		return docs;
	}

	async function load() {
		loading = true;
		error = null;
		try {
			const [library, perType] = await Promise.all([
				loadAssets(),
				Promise.all(targetTypes.map(async (t) => ({ schema: t, docs: await loadType(t) })))
			]);
			audits = markDuplicates(
				perType.flatMap(({ schema, docs }) => docs.map((d) => auditDocument(d, schema, library)))
			);
			checkedAt = new Date();
		} catch (e) {
			error = e instanceof Error ? e.message : 'The check didn’t finish. Try again.';
		} finally {
			loading = false;
		}
	}

	$effect(() => {
		load();
	});

	const searchable = $derived(audits.filter((a) => !a.hidden));
	const counts = $derived({
		good: searchable.filter((a) => a.status === 'good').length,
		warning: searchable.filter((a) => a.status === 'warning').length,
		error: searchable.filter((a) => a.status === 'error').length,
		hidden: audits.length - searchable.length
	});
	const groups = $derived(issueCounts(searchable));

	const shown = $derived.by(() => {
		const q = query.trim().toLowerCase();
		const rank = { error: 0, warning: 1, good: 2 };
		return audits
			.filter((a) => {
				if (issue) return !a.hidden && a.issues.some((i) => i.code === issue);
				if (view === 'work') return !a.hidden && a.status !== 'good';
				if (view === 'ready') return !a.hidden && a.status === 'good';
				if (view === 'hidden') return a.hidden;
				return true;
			})
			.filter((a) => !q || a.name.toLowerCase().includes(q) || a.title.toLowerCase().includes(q))
			.sort((a, b) => rank[a.status] - rank[b.status] || b.issues.length - a.issues.length);
	});

	const views: { id: View; label: string; count: () => number }[] = [
		{ id: 'work', label: 'Needs work', count: () => counts.warning + counts.error },
		{ id: 'ready', label: 'Ready', count: () => counts.good },
		{ id: 'hidden', label: 'Hidden', count: () => counts.hidden },
		{ id: 'all', label: 'All', count: () => audits.length }
	];

	const pct = (n: number) => (searchable.length ? (n / searchable.length) * 100 : 0);
	const typeList = $derived(
		new Intl.ListFormat(undefined, { type: 'conjunction' }).format(
			targetTypes.map((t) => t.title.toLowerCase())
		)
	);
	const checkedLabel = $derived(formatDate(checkedAt, { hour: 'numeric', minute: '2-digit' }));
	const groupLabel = $derived(groups.find((g) => g.code === issue)?.label ?? '');

	const dot: Record<DocumentAudit['status'], string> = {
		good: 'bg-emerald-500',
		warning: 'bg-amber-500',
		error: 'bg-destructive'
	};
</script>

<div class="mx-auto grid w-full max-w-5xl gap-6 px-4 pt-6 pb-16 sm:px-6">
	<header class="flex items-start justify-between gap-4">
		<div class="grid gap-1">
			<h1 class="text-2xl font-semibold tracking-tight">SEO</h1>
			<p class="text-muted-foreground text-sm">
				How each {typeList ? `of your ${typeList}` : 'page'} reads in search results and share cards.
				{#if checkedLabel && !loading}Checked at {checkedLabel}.{/if}
			</p>
		</div>
		<Button variant="outline" size="sm" onclick={load} disabled={loading} class="shrink-0 gap-2">
			<RefreshCw class="size-3.5 {loading ? 'animate-spin' : ''}" />
			{loading ? 'Checking…' : 'Check again'}
		</Button>
	</header>

	{#if error}
		<Card.Root class="py-0">
			<div class="flex items-center justify-between gap-4 p-4">
				<p class="text-destructive text-sm" role="alert">{error}</p>
				<Button size="sm" variant="outline" onclick={load}>Try again</Button>
			</div>
		</Card.Root>
	{:else if !loading && targetTypes.length === 0}
		<Card.Root class="py-0">
			<p class="text-muted-foreground p-6 text-sm">
				No document type has SEO fields yet. Add types to <code
					>seoPlugin(&#123; collections &#125;)</code
				>
				and they’ll be checked here.
			</p>
		</Card.Root>
	{:else}
		<!-- Summary: one number, one bar, what it's made of. -->
		<Card.Root class="gap-0 py-0">
			<div class="grid gap-4 p-5">
				{#if loading && audits.length === 0}
					<Skeleton class="h-7 w-56" />
					<Skeleton class="h-2 w-full" />
					<Skeleton class="h-4 w-80" />
				{:else}
					<p class="text-sm">
						<span class="text-2xl font-semibold tracking-tight tabular-nums">{counts.good}</span>
						<span class="text-muted-foreground">
							of {searchable.length} ready for search{counts.hidden
								? ` · ${counts.hidden} hidden from search`
								: ''}
						</span>
					</p>
					<div
						class="bg-muted flex h-2 overflow-hidden rounded-full"
						role="img"
						aria-label="{counts.good} ready, {counts.warning} could be better, {counts.error} missing a title or description"
					>
						<span
							class="bg-emerald-500 transition-[width] duration-500"
							style:width="{pct(counts.good)}%"
						></span>
						<span
							class="bg-amber-500 transition-[width] duration-500"
							style:width="{pct(counts.warning)}%"
						></span>
						<span
							class="bg-destructive transition-[width] duration-500"
							style:width="{pct(counts.error)}%"
						></span>
					</div>
					<dl class="text-muted-foreground flex flex-wrap gap-x-5 gap-y-1 text-xs">
						<div class="flex items-center gap-1.5">
							<span class="size-2 rounded-full bg-emerald-500"></span>
							<dt>Ready</dt>
							<dd class="text-foreground tabular-nums">{counts.good}</dd>
						</div>
						<div class="flex items-center gap-1.5">
							<span class="size-2 rounded-full bg-amber-500"></span>
							<dt>Could be better</dt>
							<dd class="text-foreground tabular-nums">{counts.warning}</dd>
						</div>
						<div class="flex items-center gap-1.5">
							<span class="bg-destructive size-2 rounded-full"></span>
							<dt>Missing a title or description</dt>
							<dd class="text-foreground tabular-nums">{counts.error}</dd>
						</div>
					</dl>
				{/if}
			</div>
		</Card.Root>

		<div class="grid items-start gap-6 lg:grid-cols-[15rem_1fr]">
			<!-- What to fix: each kind of problem, how many have it. Picking one filters the list. -->
			<section class="grid gap-2 lg:sticky lg:top-6" aria-labelledby="seo-fix">
				<h2 id="seo-fix" class="text-muted-foreground px-2 text-xs font-medium">What to fix</h2>
				{#if loading && audits.length === 0}
					<div class="grid gap-2 px-2">
						{#each [0, 1, 2] as i (i)}<Skeleton class="h-5 w-full" />{/each}
					</div>
				{:else if groups.length === 0}
					<p class="text-muted-foreground px-2 text-sm">Nothing. Every page passes every check.</p>
				{:else}
					<ul class="grid gap-0.5">
						{#each groups as g (g.code)}
							<li>
								<button
									type="button"
									class="hover:bg-muted flex w-full items-center justify-between gap-3 rounded-md px-2 py-1.5 text-left text-sm transition-colors {issue ===
									g.code
										? 'bg-muted font-medium'
										: ''}"
									aria-pressed={issue === g.code}
									onclick={() => (issue = issue === g.code ? null : g.code)}
								>
									<span class="min-w-0 truncate">{g.label}</span>
									<span class="text-muted-foreground tabular-nums">{g.count}</span>
								</button>
							</li>
						{/each}
					</ul>
				{/if}
			</section>

			<section class="grid gap-3" aria-label="Pages">
				<div class="flex flex-wrap items-center gap-2">
					{#if issue}
						<button
							type="button"
							class="bg-muted hover:bg-muted/70 inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-sm font-medium"
							onclick={() => (issue = null)}
						>
							{groupLabel}
							<X class="size-3.5" aria-label="Show all" />
						</button>
					{:else}
						<div class="bg-muted inline-flex rounded-md p-0.5" role="group" aria-label="Show">
							{#each views as v (v.id)}
								<button
									type="button"
									class="inline-flex h-7 items-center gap-1.5 rounded-[5px] px-2.5 text-sm transition-colors {view ===
									v.id
										? 'bg-background text-foreground font-medium shadow-sm'
										: 'text-muted-foreground hover:text-foreground'}"
									aria-pressed={view === v.id}
									onclick={() => (view = v.id)}
								>
									{v.label}
									<span class="text-muted-foreground text-xs tabular-nums">{v.count()}</span>
								</button>
							{/each}
						</div>
					{/if}
					<label class="relative ml-auto w-full sm:w-56">
						<span class="sr-only">Find a page</span>
						<Search
							class="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2"
						/>
						<Input bind:value={query} placeholder="Find a page" class="h-8 pl-8" />
					</label>
				</div>

				<Card.Root class="gap-0 overflow-hidden py-0">
					{#if loading && audits.length === 0}
						<div class="divide-border divide-y">
							{#each [0, 1, 2, 3, 4] as i (i)}
								<div class="grid gap-2 px-4 py-3.5">
									<Skeleton class="h-4 w-1/3" />
									<Skeleton class="h-3 w-2/3" />
								</div>
							{/each}
						</div>
					{:else if shown.length === 0}
						<p class="text-muted-foreground p-6 text-center text-sm">
							{#if query}Nothing matches “{query}”.
							{:else if view === 'work'}Nothing needs work. Every page passes every check.
							{:else if view === 'hidden'}No page is hidden from search.
							{:else}Nothing here yet.{/if}
						</p>
					{:else}
						<ul class="divide-border divide-y">
							{#each shown as a (a.id)}
								<li>
									<button
										type="button"
										class="group hover:bg-muted/50 flex w-full items-start gap-3 px-4 py-3 text-left transition-colors"
										onclick={() => tool.openDocument(a.type, a.id)}
									>
										<span
											class="mt-1.5 size-2 shrink-0 rounded-full {a.hidden
												? 'bg-muted-foreground/40'
												: dot[a.status]}"
											aria-hidden="true"
										></span>
										<span class="grid min-w-0 flex-1 gap-0.5">
											<span class="flex min-w-0 items-baseline gap-2">
												<span class="truncate text-sm font-medium">{a.name}</span>
												<span class="text-muted-foreground shrink-0 text-xs">{a.typeTitle}</span>
											</span>
											{#if a.hidden}
												<span class="text-muted-foreground text-xs">Hidden from search</span>
											{:else if a.issues.length === 0}
												<span class="text-muted-foreground truncate text-xs">{a.title}</span>
											{:else}
												<span class="text-muted-foreground grid gap-0.5 text-xs">
													{#each a.issues as i (i.code)}
														<span class={i.severity === 'error' ? 'text-destructive' : ''}
															>{i.message}</span
														>
													{/each}
												</span>
											{/if}
										</span>
										<ChevronRight
											class="text-muted-foreground mt-0.5 size-4 shrink-0 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
											aria-hidden="true"
										/>
									</button>
								</li>
							{/each}
						</ul>
					{/if}
				</Card.Root>
			</section>
		</div>
	{/if}
</div>
