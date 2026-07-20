<script lang="ts">
	// Read-only submissions viewer — the forms plugin's `aphex/admin/tool` part.
	//
	// This is a CLIENT-side component (it lives in the client-safe plugin registry, which is
	// why admin tools register there rather than through SvelteKit `load`). It has no DB access;
	// it fetches from the plugin's own GET route (`/api/forms/:id/submissions`), which is
	// session-authenticated by the cookie the browser already sends. cms-core owns the seam
	// (renders this in the sidebar via AdminToolProps); the plugin owns this component.
	import type { AdminToolProps } from '@aphexcms/cms-core';
	import { forms } from './contact-form';

	let { tool }: { tool: AdminToolProps } = $props();

	// A stored submission row, as returned by the GET route (mirrors FormSubmission).
	type Row = { id: string; formId: string; data: Record<string, unknown>; createdAt: string };

	// The code-defined forms this studio knows about — the picker's options come straight from
	// the registry, so it never drifts from what `defineForm` actually declared.
	let formId = $state(forms[0]?.id ?? '');
	let rows = $state<Row[]>([]);
	let total = $state(0);
	let loading = $state(false);
	let error = $state('');

	// Column headers come from the selected form's own fields — typed, ordered, no guessing.
	const columns = $derived(forms.find((f) => f.id === formId)?.fields.map((f) => f.name) ?? []);

	async function load() {
		if (!formId) return;
		loading = true;
		error = '';
		try {
			const res = await fetch(`/api/forms/${encodeURIComponent(formId)}/submissions`, {
				headers: { accept: 'application/json' }
			});
			const body = (await res.json().catch(() => ({}))) as {
				success?: boolean;
				items?: Row[];
				total?: number;
				error?: string;
			};
			if (!res.ok || body.success === false) {
				error = body.error ?? `Failed to load (${res.status})`;
				rows = [];
				total = 0;
				return;
			}
			rows = body.items ?? [];
			total = body.total ?? rows.length;
		} catch {
			error = 'Network error while loading submissions.';
		} finally {
			loading = false;
		}
	}

	// Load on mount and whenever the selected form changes.
	$effect(() => {
		void formId;
		load();
	});

	function cell(row: Row, key: string): string {
		const v = row.data[key];
		if (v == null) return '';
		return typeof v === 'string' ? v : JSON.stringify(v);
	}

	function when(iso: string): string {
		const d = new Date(iso);
		return Number.isNaN(d.getTime()) ? iso : d.toLocaleString();
	}
</script>

<div class="submissions">
	<header class="head">
		<div>
			<h1>Form submissions</h1>
			<p class="sub">Read-only. Stored in <code>cms_plugin_storage</code>, not the content tree.</p>
		</div>
		<div class="controls">
			{#if forms.length > 1}
				<select bind:value={formId} aria-label="Form">
					{#each forms as f (f.id)}
						<option value={f.id}>{f.title}</option>
					{/each}
				</select>
			{/if}
			<button onclick={load} disabled={loading}>{loading ? 'Loading…' : 'Refresh'}</button>
		</div>
	</header>

	{#if forms.length === 0}
		<p class="muted">
			No forms are defined yet. Add one with <code>defineForm</code> and register it in the forms registry
			to start collecting submissions.
		</p>
	{:else if error}
		<p class="error">{error}</p>
	{:else if loading && rows.length === 0}
		<p class="muted">Loading…</p>
	{:else if rows.length === 0}
		<p class="muted">No submissions yet for <strong>{formId}</strong>.</p>
	{:else}
		<p class="count">{total} submission{total === 1 ? '' : 's'}</p>
		<div class="scroll">
			<table>
				<thead>
					<tr>
						<th>Received</th>
						{#each columns as col (col)}<th>{col}</th>{/each}
					</tr>
				</thead>
				<tbody>
					{#each rows as row (row.id)}
						<tr>
							<td class="ts">{when(row.createdAt)}</td>
							{#each columns as col (col)}<td>{cell(row, col)}</td>{/each}
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>

<style>
	.submissions {
		padding: 1.5rem 2rem;
		max-width: 100%;
	}
	.head {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 1rem;
		flex-wrap: wrap;
		margin-bottom: 1.25rem;
	}
	h1 {
		font-size: 1.35rem;
		font-weight: 600;
		margin: 0;
	}
	.sub {
		margin: 0.25rem 0 0;
		font-size: 0.85rem;
		color: var(--muted-foreground, #71717a);
	}
	.sub code {
		font-size: 0.8rem;
	}
	.controls {
		display: flex;
		gap: 0.5rem;
		align-items: center;
	}
	select,
	button {
		border: 1px solid var(--border, #e4e4e7);
		background: var(--background, #fff);
		border-radius: 6px;
		padding: 0.4rem 0.7rem;
		font-size: 0.85rem;
	}
	button:disabled {
		opacity: 0.5;
	}
	.count {
		font-size: 0.8rem;
		color: var(--muted-foreground, #71717a);
		margin: 0 0 0.5rem;
	}
	.scroll {
		overflow-x: auto;
		border: 1px solid var(--border, #e4e4e7);
		border-radius: 8px;
	}
	table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.85rem;
	}
	th,
	td {
		text-align: left;
		padding: 0.6rem 0.8rem;
		border-bottom: 1px solid var(--border, #e4e4e7);
		vertical-align: top;
		white-space: pre-wrap;
		word-break: break-word;
	}
	th {
		font-weight: 600;
		background: var(--muted, #fafafa);
		position: sticky;
		top: 0;
	}
	tbody tr:last-child td {
		border-bottom: none;
	}
	.ts {
		white-space: nowrap;
		color: var(--muted-foreground, #71717a);
	}
	.muted {
		color: var(--muted-foreground, #71717a);
		font-size: 0.9rem;
	}
	.error {
		color: var(--destructive, #dc2626);
		font-size: 0.9rem;
	}
</style>
