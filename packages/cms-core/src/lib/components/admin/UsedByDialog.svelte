<script lang="ts">
	import { Button } from '@aphexcms/ui/shadcn/button';
	import { FileText, X } from '@lucide/svelte';
	import { documents } from '../../api/documents';
	import { resolvePreviewTitle, resolvePreviewSubtitle } from '../../utils/preview';
	import { pluralize } from '../../utils/pluralize';
	import type { SchemaType } from '../../types/schemas';

	/**
	 * What references a document, grouped by type: "Invoices · 42" with the first
	 * few by name. Counts first so a much-used document stays readable, the rows
	 * to open the ones you're after. Read from the back-reference index, which
	 * includes drafts, the same set the delete guard checks.
	 */
	interface Props {
		documentId: string;
		title: string;
		schemas: SchemaType[];
		onClose: () => void;
		/** Opens one of them, as a reference opens from a field. */
		onOpen?: (documentId: string, documentType: string) => void;
	}

	let { documentId, title, schemas, onClose, onOpen }: Props = $props();

	/** Rows shown by name per type; the rest are counted. */
	const SHOWN_PER_TYPE = 5;

	type Group = { type: string; label: string; total: number; rows: any[] };

	let loading = $state(true);
	let failed = $state(false);
	let groups = $state<Group[]>([]);

	const schemaOf = (type: string) => schemas.find((s) => s.name === type) ?? null;
	// "Invoice settings" is already plural.
	const plural = (label: string) => (/s$/i.test(label) ? label : pluralize(label));

	$effect(() => {
		const id = documentId;
		loading = true;
		failed = false;
		(async () => {
			try {
				const res = await documents.getBackReferences(id);
				const refs = (res.success && res.data ? res.data : []).filter((r) => r.id !== id);
				const byType = new Map<string, string[]>();
				for (const ref of refs) byType.set(ref.type, [...(byType.get(ref.type) ?? []), ref.id]);

				// One batched fetch for every row shown, whatever the number of types.
				const shownIds = [...byType.values()].flatMap((ids) => ids.slice(0, SHOWN_PER_TYPE));
				const fetched = shownIds.length > 0 ? await documents.getMany(shownIds) : null;
				const docsById = new Map(
					(fetched?.success && fetched.data ? (fetched.data as any[]) : []).map((d) => [d.id, d])
				);

				groups = [...byType.entries()]
					.map(([type, ids]) => {
						const schema = schemaOf(type);
						return {
							type,
							label: plural(schema?.title ?? type),
							total: ids.length,
							rows: ids
								.slice(0, SHOWN_PER_TYPE)
								.map((rowId) => docsById.get(rowId))
								.filter(Boolean)
						};
					})
					.sort((a, b) => b.total - a.total);
			} catch {
				failed = true;
			} finally {
				if (id === documentId) loading = false;
			}
		})();
	});

	const total = $derived(groups.reduce((sum, g) => sum + g.total, 0));
</script>

<svelte:window onkeydown={(e) => e.key === 'Escape' && onClose()} />

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="absolute inset-0 z-50 flex items-start justify-center bg-black/40 pt-[10vh]"
	onclick={(e) => e.target === e.currentTarget && onClose()}
>
	<div
		role="dialog"
		aria-modal="true"
		aria-label="Used by"
		class="bg-background border-rule mx-4 flex max-h-[75vh] w-full max-w-lg flex-col rounded-lg border shadow-xl"
	>
		<div class="flex items-start justify-between gap-3 border-b px-4 py-3">
			<div class="min-w-0">
				<h3 class="text-sm font-semibold">Used by</h3>
				<p class="text-muted-foreground truncate text-xs">
					{#if loading}
						What references “{title}”
					{:else if total === 0}
						Nothing references “{title}”
					{:else}
						{total}
						{total === 1 ? 'document references' : 'documents reference'} “{title}”
					{/if}
				</p>
			</div>
			<Button
				variant="ghost"
				size="icon"
				class="h-7 w-7 shrink-0"
				onclick={onClose}
				aria-label="Close"
			>
				<X class="h-4 w-4" />
			</Button>
		</div>

		<div class="min-h-0 flex-1 overflow-y-auto p-2">
			{#if loading}
				<p class="text-muted-foreground px-2 py-6 text-center text-sm">Loading…</p>
			{:else if failed}
				<p class="text-destructive px-2 py-6 text-center text-sm">Couldn't load what uses this.</p>
			{:else if total === 0}
				<p class="text-muted-foreground px-2 py-6 text-center text-sm">
					Nothing uses it, so it can be deleted without affecting anything else.
				</p>
			{:else}
				{#each groups as group (group.type)}
					{@const schema = schemaOf(group.type)}
					{@const Icon = schema?.icon ?? FileText}
					<section class="mb-2 last:mb-0">
						<h4
							class="text-muted-foreground flex items-center justify-between px-2 pt-2 pb-1 text-[11px] font-medium tracking-wider uppercase"
						>
							<span>{group.label}</span>
							<span class="tabular-nums">{group.total}</span>
						</h4>
						{#each group.rows as doc (doc.id)}
							{@const subtitle = resolvePreviewSubtitle(doc, schema)}
							<button
								type="button"
								class="hover:bg-muted flex w-full cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-left transition-colors"
								onclick={() => {
									onOpen?.(doc.id, group.type);
									onClose();
								}}
							>
								<Icon class="text-muted-foreground h-4 w-4 shrink-0" />
								<span class="flex min-w-0 flex-1 flex-col">
									<span class="truncate text-sm">{resolvePreviewTitle(doc, schema)}</span>
									{#if subtitle}
										<span class="text-muted-foreground truncate text-xs">{subtitle}</span>
									{/if}
								</span>
								{#if doc._meta?.status === 'published'}
									<span class="h-1.5 w-1.5 shrink-0 rounded-full bg-green-500" title="Published"
									></span>
								{:else}
									<span class="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" title="Draft"></span>
								{/if}
							</button>
						{/each}
						{#if group.total > group.rows.length}
							<p class="text-muted-foreground px-2 py-1 text-xs">
								and {group.total - group.rows.length} more
							</p>
						{/if}
					</section>
				{/each}
			{/if}
		</div>
	</div>
</div>
