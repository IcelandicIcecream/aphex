<script lang="ts">
	// Read-only operational history for the durable spine — the queryability Sanity's old
	// out-of-dataset scheduling lacked. Jobs tab = scheduled/queued work and its outcome;
	// Events tab = the append-only domain-event log; Agent Changes tab = the AI assistant's
	// audit/undo trail (GET /api/agent/change-sets, gated on document.read like the others —
	// undo itself is the one mutation here, gated separately on document.update server-side).
	import { onMount } from 'svelte';
	import { Button } from '@aphexcms/ui/shadcn/button';
	import { Badge } from '@aphexcms/ui/shadcn/badge';
	import { RefreshCw, CalendarClock, Radio, Sparkles, Undo2, ChevronDown } from '@lucide/svelte';
	import { toast } from 'svelte-sonner';
	import { apiClient } from '../../api/client';
	import type { Job, DomainEvent, JobStatus } from '../../types/events';
	import type {
		AgentChangeSet,
		AgentChangeSetWithOperations,
		AgentChangeSetStatus
	} from '../../types/agent-change-sets';

	// The server resolves `createdBy` (a raw user id) to a display name — see
	// `resolve-created-by.ts`, shared by GET /api/events and GET /api/agent/change-sets.
	type WithCreatedByName<T> = T & { createdByName: string | null };

	type Tab = 'jobs' | 'events' | 'agent';
	let tab = $state<Tab>('jobs');

	let jobs = $state<Job[]>([]);
	let events = $state<WithCreatedByName<DomainEvent>[]>([]);
	let changeSets = $state<WithCreatedByName<AgentChangeSetWithOperations>[]>([]);
	let loading = $state(false);
	let error = $state<string | null>(null);
	let total = $state(0);

	// Agent-changes tab: which row is expanded (fetches its operations lazily), and the
	// per-change-set expanded detail + undo-in-flight state.
	let expandedChangeSetId = $state<string | null>(null);
	let expandedDetail = $state<WithCreatedByName<AgentChangeSetWithOperations> | null>(null);
	let undoingId = $state<string | null>(null);

	const changeSetStatusVariant: Record<
		AgentChangeSetStatus,
		'default' | 'secondary' | 'destructive'
	> = {
		in_progress: 'secondary',
		completed: 'default',
		failed: 'destructive'
	};

	const statuses: Array<JobStatus | 'all'> = [
		'all',
		'pending',
		'leased',
		'completed',
		'failed',
		'cancelled'
	];
	let statusFilter = $state<JobStatus | 'all'>('all');

	// Badge colour per status — leased/pending are in-flight, completed good, failed bad.
	const statusVariant: Record<JobStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
		pending: 'secondary',
		leased: 'secondary',
		completed: 'default',
		failed: 'destructive',
		cancelled: 'outline'
	};

	// The row's headline: what the turn actually did, not who ran it (createdBy is secondary
	// metadata, shown further along the row) — unique tool names in first-use order, e.g.
	// "create_document" or "create_document, update_document". A pure Q&A turn (no operations)
	// falls back to its truncated first message, since there's no action to name.
	function changeSetHeadline(changeSet: AgentChangeSetWithOperations): string {
		if (changeSet.operations.length === 0) {
			return changeSet.summary ?? 'No document changes';
		}
		const seen = new Set<string>();
		const names: string[] = [];
		for (const op of changeSet.operations) {
			if (seen.has(op.toolName)) continue;
			seen.add(op.toolName);
			names.push(op.toolName);
		}
		return names.join(', ');
	}

	function fmt(d: string | Date | null | undefined): string {
		if (!d) return '—';
		const date = typeof d === 'string' ? new Date(d) : d;
		return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString();
	}

	async function load() {
		loading = true;
		error = null;
		try {
			if (tab === 'jobs') {
				const params: Record<string, string> = { limit: '100' };
				if (statusFilter !== 'all') params.status = statusFilter;
				const res = await apiClient.get<Job[]>('/jobs', params);
				if (res.success) {
					jobs = res.data ?? [];
					total = res.pagination?.total ?? jobs.length;
				} else {
					error = res.error ?? 'Failed to load jobs';
				}
			} else if (tab === 'events') {
				const res = await apiClient.get<WithCreatedByName<DomainEvent>[]>('/events', {
					limit: '100'
				});
				if (res.success) {
					events = res.data ?? [];
					total = res.pagination?.total ?? events.length;
				} else {
					error = res.error ?? 'Failed to load events';
				}
			} else {
				const res = await apiClient.get<WithCreatedByName<AgentChangeSetWithOperations>[]>(
					'/agent/change-sets',
					{ limit: '100' }
				);
				if (res.success) {
					changeSets = res.data ?? [];
					total = res.pagination?.total ?? changeSets.length;
				} else {
					error = res.error ?? 'Failed to load agent changes';
				}
			}
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load';
		} finally {
			loading = false;
		}
	}

	function switchTab(next: Tab) {
		if (tab === next) return;
		tab = next;
		load();
	}

	async function toggleExpand(changeSet: AgentChangeSet) {
		if (expandedChangeSetId === changeSet.id) {
			expandedChangeSetId = null;
			expandedDetail = null;
			return;
		}
		expandedChangeSetId = changeSet.id;
		expandedDetail = null;
		const res = await apiClient.get<WithCreatedByName<AgentChangeSetWithOperations>>(
			`/agent/change-sets/${changeSet.id}`
		);
		if (res.success && res.data) expandedDetail = res.data;
	}

	async function undoChangeSet(changeSet: AgentChangeSet) {
		if (undoingId) return;
		undoingId = changeSet.id;
		try {
			const res = await apiClient.post<{
				results: Array<{
					operationId: string;
					documentId: string;
					success: boolean;
					error?: string;
				}>;
			}>(`/agent/change-sets/${changeSet.id}/undo`);
			if (!res.success || !res.data) {
				toast.error(res.error ?? 'Undo failed');
				return;
			}
			const failed = res.data.results.filter((r) => !r.success);
			if (failed.length === 0) {
				toast.success('Undone — reverted document(s) to their prior version.');
			} else {
				toast.error(`${failed.length} operation(s) couldn't be undone (see console).`);
				// eslint-disable-next-line no-console -- surfaced only when an undo partially fails
				console.warn('[agent-changes] undo results:', failed);
			}
			// Refresh the expanded detail (if open) and the list so status/timestamps update.
			if (expandedChangeSetId === changeSet.id) {
				const detailRes = await apiClient.get<WithCreatedByName<AgentChangeSetWithOperations>>(
					`/agent/change-sets/${changeSet.id}`
				);
				if (detailRes.success && detailRes.data) expandedDetail = detailRes.data;
			}
			await load();
		} finally {
			undoingId = null;
		}
	}

	// Reload jobs when the status filter changes (only relevant on the jobs tab).
	$effect(() => {
		// eslint-disable-next-line @typescript-eslint/no-unused-expressions -- reactive dependency: re-run when statusFilter changes
		statusFilter;
		if (tab === 'jobs') load();
	});

	onMount(load);
</script>

<div class="mx-auto w-full max-w-5xl p-4 sm:p-6">
	<div class="mb-4 flex items-center justify-between gap-3">
		<div>
			<h1 class="text-lg font-semibold">Activity</h1>
			<p class="text-muted-foreground text-sm">
				Scheduled jobs, the domain-event log, and the AI assistant's audit trail.
			</p>
		</div>
		<Button variant="outline" size="sm" onclick={load} disabled={loading} class="gap-1.5">
			<RefreshCw class="h-3.5 w-3.5 {loading ? 'animate-spin' : ''}" /> Refresh
		</Button>
	</div>

	<!-- Tabs -->
	<div class="border-rule mb-3 flex gap-1 border-b">
		<button
			class="flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm transition-colors {tab ===
			'jobs'
				? 'border-primary text-foreground'
				: 'text-muted-foreground hover:text-foreground border-transparent'}"
			onclick={() => switchTab('jobs')}
		>
			<CalendarClock class="h-3.5 w-3.5" /> Jobs
		</button>
		<button
			class="flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm transition-colors {tab ===
			'events'
				? 'border-primary text-foreground'
				: 'text-muted-foreground hover:text-foreground border-transparent'}"
			onclick={() => switchTab('events')}
		>
			<Radio class="h-3.5 w-3.5" /> Events
		</button>
		<button
			class="flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm transition-colors {tab ===
			'agent'
				? 'border-primary text-foreground'
				: 'text-muted-foreground hover:text-foreground border-transparent'}"
			onclick={() => switchTab('agent')}
		>
			<Sparkles class="h-3.5 w-3.5" /> Agent Changes
		</button>
	</div>

	{#if tab === 'jobs'}
		<div class="mb-3 flex flex-wrap items-center gap-1.5">
			{#each statuses as s (s)}
				<button
					class="rounded-full border px-2.5 py-1 text-xs capitalize transition-colors {statusFilter ===
					s
						? 'bg-primary text-primary-foreground border-transparent'
						: 'text-muted-foreground hover:bg-muted'}"
					onclick={() => (statusFilter = s)}
				>
					{s}
				</button>
			{/each}
		</div>
	{/if}

	{#if error}
		<div
			class="border-destructive/40 bg-destructive/10 text-destructive rounded-md border p-3 text-sm"
		>
			{error}
		</div>
	{:else if loading && jobs.length === 0 && events.length === 0 && changeSets.length === 0}
		<div class="text-muted-foreground p-8 text-center text-sm">Loading…</div>
	{:else if tab === 'jobs'}
		{#if jobs.length === 0}
			<div class="text-muted-foreground p-8 text-center text-sm">No jobs.</div>
		{:else}
			<div class="border-rule overflow-x-auto rounded-md border">
				<table class="w-full text-sm">
					<thead class="bg-muted/50 text-muted-foreground text-xs">
						<tr>
							<th class="px-3 py-2 text-left font-medium">Type</th>
							<th class="px-3 py-2 text-left font-medium">Status</th>
							<th class="px-3 py-2 text-left font-medium">Run at</th>
							<th class="px-3 py-2 text-left font-medium">Attempts</th>
							<th class="px-3 py-2 text-left font-medium">Last error</th>
							<th class="px-3 py-2 text-left font-medium">Created</th>
						</tr>
					</thead>
					<tbody>
						{#each jobs as job (job.id)}
							<tr class="border-rule border-t">
								<td class="px-3 py-2 font-mono text-xs">{job.type}</td>
								<td class="px-3 py-2">
									<Badge variant={statusVariant[job.status]} class="capitalize">{job.status}</Badge>
								</td>
								<td class="px-3 py-2 whitespace-nowrap">{fmt(job.runAt)}</td>
								<td class="px-3 py-2">{job.attempts}/{job.maxAttempts}</td>
								<td
									class="text-muted-foreground max-w-[220px] truncate px-3 py-2"
									title={job.lastError ?? ''}
								>
									{job.lastError ?? '—'}
								</td>
								<td class="text-muted-foreground px-3 py-2 whitespace-nowrap"
									>{fmt(job.createdAt)}</td
								>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
			<p class="text-muted-foreground mt-2 text-xs">Showing {jobs.length} of {total}.</p>
		{/if}
	{:else if tab === 'events'}
		{#if events.length === 0}
			<div class="text-muted-foreground p-8 text-center text-sm">No events.</div>
		{:else}
			<div class="border-rule overflow-x-auto rounded-md border">
				<table class="w-full text-sm">
					<thead class="bg-muted/50 text-muted-foreground text-xs">
						<tr>
							<th class="px-3 py-2 text-left font-medium">Type</th>
							<th class="px-3 py-2 text-left font-medium">Payload</th>
							<th class="px-3 py-2 text-left font-medium">By</th>
							<th class="px-3 py-2 text-left font-medium">When</th>
						</tr>
					</thead>
					<tbody>
						{#each events as event (event.id)}
							<tr class="border-rule border-t">
								<td class="px-3 py-2 font-mono text-xs">{event.type}</td>
								<td
									class="text-muted-foreground max-w-[320px] truncate px-3 py-2 font-mono text-xs"
									title={JSON.stringify(event.payload)}
								>
									{JSON.stringify(event.payload)}
								</td>
								<td class="text-muted-foreground px-3 py-2 font-mono text-xs"
									>{event.createdByName ?? event.createdBy ?? '—'}</td
								>
								<td class="text-muted-foreground px-3 py-2 whitespace-nowrap"
									>{fmt(event.createdAt)}</td
								>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
			<p class="text-muted-foreground mt-2 text-xs">Showing {events.length} of {total}.</p>
		{/if}
	{:else if changeSets.length === 0}
		<div class="text-muted-foreground p-8 text-center text-sm">No agent activity yet.</div>
	{:else}
		<div class="flex flex-col gap-2">
			{#each changeSets as changeSet (changeSet.id)}
				<div class="border-rule rounded-md border">
					<Button
						variant="ghost"
						class="h-auto w-full items-center justify-start gap-3 rounded-b-none px-3 py-2.5 text-left text-sm font-normal"
						onclick={() => toggleExpand(changeSet)}
					>
						<ChevronDown
							class="text-muted-foreground h-3.5 w-3.5 shrink-0 transition-transform {expandedChangeSetId ===
							changeSet.id
								? 'rotate-180'
								: ''}"
						/>
						<span class="min-w-0 flex-1 truncate font-mono">{changeSetHeadline(changeSet)}</span>
						<Badge variant={changeSetStatusVariant[changeSet.status]} class="capitalize"
							>{changeSet.status.replace('_', ' ')}</Badge
						>
						<span class="text-muted-foreground hidden shrink-0 text-xs sm:inline"
							>{changeSet.createdByName ?? changeSet.createdBy ?? 'Unknown'}</span
						>
						<span class="text-muted-foreground hidden shrink-0 font-mono text-xs sm:inline"
							>{changeSet.provider}/{changeSet.model}</span
						>
						<span
							class="text-muted-foreground hidden shrink-0 font-mono text-xs sm:inline"
							title="{changeSet.promptTokens} input tokens, {changeSet.completionTokens} output tokens"
							>{changeSet.promptTokens.toLocaleString()} in / {changeSet.completionTokens.toLocaleString()}
							out</span
						>
						<span class="text-muted-foreground shrink-0 text-xs whitespace-nowrap"
							>{fmt(changeSet.createdAt)}</span
						>
					</Button>

					{#if expandedChangeSetId === changeSet.id}
						<div class="border-rule border-t p-3">
							{#if !expandedDetail}
								<p class="text-muted-foreground text-xs">Loading…</p>
							{:else}
								{#if expandedDetail.summary}
									<p class="text-muted-foreground mb-3 border-l-2 pl-2 text-xs italic">
										“{expandedDetail.summary}”
									</p>
								{/if}
								{#if expandedDetail.operations.length === 0}
									<p class="text-muted-foreground text-xs">
										No document changes — a read-only conversation.
									</p>
								{:else}
									<div class="flex flex-col gap-1.5">
										{#each expandedDetail.operations as op (op.id)}
											<div class="flex items-center gap-2 font-mono text-xs">
												<Badge variant={op.success ? 'default' : 'destructive'} class="shrink-0"
													>{op.success ? 'ok' : 'error'}</Badge
												>
												<span>{op.toolName}</span>
												<span class="text-muted-foreground">{op.collection}/{op.documentId}</span>
												{#if op.error}
													<span class="text-destructive truncate">{op.error}</span>
												{/if}
											</div>
										{/each}
									</div>
									{#if expandedDetail.operations.some((op) => op.success && op.versionBefore !== null)}
										<Button
											variant="outline"
											size="sm"
											class="mt-3 gap-1.5"
											disabled={undoingId === changeSet.id}
											onclick={() => undoChangeSet(changeSet)}
										>
											<Undo2 class="h-3.5 w-3.5" />
											{undoingId === changeSet.id ? 'Undoing…' : 'Undo this turn'}
										</Button>
									{/if}
								{/if}
							{/if}
						</div>
					{/if}
				</div>
			{/each}
		</div>
		<p class="text-muted-foreground mt-2 text-xs">Showing {changeSets.length} of {total}.</p>
	{/if}
</div>
