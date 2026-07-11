<script lang="ts">
	import { onMount } from 'svelte';
	import { documents } from '@aphexcms/cms-core';
	import type { AdminToolProps, SchemaType } from '@aphexcms/cms-core';
	import { resolveTitle, resolveDescription, hasSocialImage } from './config';
	import { Button } from '@aphexcms/ui/shadcn/button';
	import {
		Sparkles,
		CheckCircle2,
		AlertTriangle,
		XCircle,
		ArrowRight,
		RefreshCw
	} from '@lucide/svelte';

	// The stable context every admin tool receives (org, schemas, navigation, …).
	let { tool }: { tool: AdminToolProps } = $props();

	// Audit every SEO-enabled document type — i.e. any document schema that carries a
	// `seo` field (added directly or injected by the plugin's collections transform).
	const targetTypes = $derived(
		tool.schemas.filter((s) => s.type === 'document' && s.fields.some((f) => f.name === 'seo'))
	);

	type Status = 'good' | 'warn' | 'missing';
	interface Audit {
		id: string;
		type: string;
		typeTitle: string;
		title: string;
		issues: string[];
		status: Status;
	}

	let audits = $state<Audit[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);

	const str = (v: unknown): string => (typeof v === 'string' && v.trim() ? v.trim() : '');

	/**
	 * Compute an SEO health check for one document. The schema comes from the query
	 * (we filtered `targetTypes` by it), so it's authoritative — the REST list row
	 * carries no reliable top-level `type`. Title / description / image are resolved
	 * the same way the Generate action fills them: the schema's own `preview` config
	 * first (so an author uses `name`/`bio`, not the blog's `title`/`excerpt`), then
	 * conventional fallbacks. Editors can always override via the `seo` fields.
	 */
	function auditDoc(doc: Record<string, any>, schema: SchemaType): Audit {
		// The REST list returns each document flattened (perspective applied) — the
		// content fields sit at the top level, not under `draftData`.
		const data = doc;
		const seo = (data.seo ?? {}) as Record<string, any>;
		const issues: string[] = [];

		const metaTitle = str(seo.metaTitle) || resolveTitle(data, schema);
		if (!metaTitle) issues.push('No title');

		const metaDesc = str(seo.metaDescription) || resolveDescription(data, schema);
		if (!metaDesc) issues.push('No meta description');
		else if (metaDesc.length > 160) issues.push('Meta description too long');
		else if (metaDesc.length < 50) issues.push('Meta description too short');

		if (!hasSocialImage(data, schema)) issues.push('No social image');
		if (seo.noIndex) issues.push('Hidden from search');

		const critical = issues.includes('No title') || issues.includes('No meta description');
		const status: Status = issues.length === 0 ? 'good' : critical ? 'missing' : 'warn';
		return {
			id: doc.id,
			type: schema.name,
			typeTitle: schema.title,
			title: resolveTitle(data, schema) || 'Untitled',
			issues,
			status
		};
	}

	async function load() {
		loading = true;
		error = null;
		try {
			const perType = await Promise.all(
				targetTypes.map(async (t) => {
					const res = await documents.list({ type: t.name, perspective: 'draft', pageSize: 100 });
					const docs = res.success && res.data ? res.data : [];
					return docs.map((d) => auditDoc(d, t));
				})
			);
			audits = perType.flat();
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to load documents.';
		} finally {
			loading = false;
		}
	}

	onMount(load);

	const stats = $derived({
		total: audits.length,
		good: audits.filter((a) => a.status === 'good').length,
		warn: audits.filter((a) => a.status === 'warn').length,
		missing: audits.filter((a) => a.status === 'missing').length
	});
</script>

<div class="mx-auto max-w-4xl px-6 py-10">
	<div class="flex items-start justify-between gap-4">
		<div class="flex items-center gap-3">
			<div class="bg-primary/10 text-primary flex h-10 w-10 items-center justify-center rounded-lg">
				<Sparkles class="h-5 w-5" />
			</div>
			<div>
				<h1 class="text-xl font-semibold tracking-tight">SEO Audit</h1>
				<p class="text-muted-foreground text-sm">
					{stats.total} item{stats.total === 1 ? '' : 's'} across {targetTypes.length} type{targetTypes.length ===
					1
						? ''
						: 's'}
				</p>
			</div>
		</div>
		<Button variant="outline" size="sm" onclick={load} disabled={loading} class="gap-2">
			<RefreshCw class="h-3.5 w-3.5 {loading ? 'animate-spin' : ''}" /> Refresh
		</Button>
	</div>

	<!-- Summary -->
	<div class="mt-6 grid grid-cols-3 gap-3">
		<div class="border-border bg-card rounded-lg border p-4">
			<div class="flex items-center gap-2 text-emerald-600 dark:text-emerald-500">
				<CheckCircle2 class="h-4 w-4" />
				<span class="text-2xl font-semibold tabular-nums">{stats.good}</span>
			</div>
			<p class="text-muted-foreground mt-1 text-xs">Optimized</p>
		</div>
		<div class="border-border bg-card rounded-lg border p-4">
			<div class="flex items-center gap-2 text-amber-600 dark:text-amber-500">
				<AlertTriangle class="h-4 w-4" />
				<span class="text-2xl font-semibold tabular-nums">{stats.warn}</span>
			</div>
			<p class="text-muted-foreground mt-1 text-xs">Warnings</p>
		</div>
		<div class="border-border bg-card rounded-lg border p-4">
			<div class="text-destructive flex items-center gap-2">
				<XCircle class="h-4 w-4" />
				<span class="text-2xl font-semibold tabular-nums">{stats.missing}</span>
			</div>
			<p class="text-muted-foreground mt-1 text-xs">Needs work</p>
		</div>
	</div>

	<!-- List -->
	<div class="border-border bg-card mt-6 overflow-hidden rounded-xl border">
		{#if loading}
			<div class="text-muted-foreground p-8 text-center text-sm">Auditing content…</div>
		{:else if error}
			<div class="text-destructive p-8 text-center text-sm">{error}</div>
		{:else if audits.length === 0}
			<div class="text-muted-foreground p-8 text-center text-sm">
				No posts or pages to audit yet.
			</div>
		{:else}
			<ul class="divide-border divide-y">
				{#each audits as a (a.id)}
					<li class="flex items-center gap-3 px-4 py-3">
						{#if a.status === 'good'}
							<CheckCircle2 class="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-500" />
						{:else if a.status === 'warn'}
							<AlertTriangle class="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-500" />
						{:else}
							<XCircle class="text-destructive h-4 w-4 shrink-0" />
						{/if}

						<div class="min-w-0 flex-1">
							<div class="flex items-center gap-2">
								<span class="truncate text-sm font-medium">{a.title}</span>
								<span
									class="bg-muted text-muted-foreground shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium tracking-wide uppercase"
								>
									{a.typeTitle}
								</span>
							</div>
							{#if a.issues.length > 0}
								<p class="text-muted-foreground mt-0.5 truncate text-xs">{a.issues.join(' · ')}</p>
							{:else}
								<p class="mt-0.5 text-xs text-emerald-600 dark:text-emerald-500">
									All checks passed
								</p>
							{/if}
						</div>

						<Button
							variant="ghost"
							size="sm"
							class="shrink-0 gap-1 hover:cursor-pointer"
							onclick={() => tool.openDocument(a.type, a.id)}
						>
							Fix <ArrowRight class="h-3.5 w-3.5" />
						</Button>
					</li>
				{/each}
			</ul>
		{/if}
	</div>

	<p class="text-muted-foreground mt-4 text-xs leading-relaxed">
		This dashboard is a plugin admin tool (<code>aphex/admin/tool</code>). It fetches content
		through the session-authenticated REST client, scores each item, and routes you into the editor
		via
		<code>tool.openDocument()</code> — no core files touched.
	</p>
</div>
