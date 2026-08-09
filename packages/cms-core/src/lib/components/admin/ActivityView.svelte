<script lang="ts">
	// Read-only operational history for the durable spine — the queryability Sanity's old
	// out-of-dataset scheduling lacked. Jobs tab = scheduled/queued work and its outcome;
	// Events tab = the append-only domain-event log; Agent Changes tab = the AI assistant's
	// audit/undo trail (GET /api/agent/change-sets, gated on document.read like the others —
	// undo itself is the one mutation here, gated separately on document.update server-side).
	import { onMount } from 'svelte';
	import { Button } from '@aphexcms/ui/shadcn/button';
	import { Badge } from '@aphexcms/ui/shadcn/badge';
	import {
		RefreshCw,
		CalendarClock,
		Radio,
		Sparkles,
		Undo2,
		ChevronDown,
		RotateCcw,
		Ban,
		TriangleAlert
	} from '@lucide/svelte';
	import { toast } from 'svelte-sonner';
	import { apiClient } from '../../api/client';
	import type { Job, DomainEvent, JobStatus, OutboxHealth } from '../../types/events';
	import type {
		AgentChangeSet,
		AgentChangeSetWithOperations,
		AgentChangeSetStatus
	} from '../../types/agent-change-sets';

	type Props = {
		/**
		 * May the viewer retry/cancel jobs? `org.settings` — see `requireJobControl` in the
		 * route. Gating here only hides buttons; the server is what enforces it.
		 */
		canControlJobs?: boolean;
		/** Super admins can widen jobs/events past their active organization (`?scope=all`). */
		isSuperAdmin?: boolean;
	};
	let { canControlJobs = false, isSuperAdmin = false }: Props = $props();

	// The server resolves `createdBy` (a raw user id) to a display name — see
	// `resolve-created-by.ts`, shared by GET /api/events and GET /api/agent/change-sets.
	type WithCreatedByName<T> = T & { createdByName: string | null };
	// …and `organizationId` to an org name, but only in the instance-wide view, where rows
	// from several tenants share a table. Absent (not null) in the org-scoped view.
	type WithOrganizationName<T> = T & { organizationName?: string | null };

	type Tab = 'jobs' | 'events' | 'agent';
	let tab = $state<Tab>('jobs');

	/**
	 * Whose history is on screen. `all` is a super-admin-only widening: the queue is
	 * instance-wide (one worker claims across every org), so a failure in a tenant you
	 * aren't currently switched into is otherwise invisible.
	 */
	let scope = $state<'organization' | 'all'>('organization');

	let jobs = $state<WithOrganizationName<Job>[]>([]);
	let events = $state<WithOrganizationName<WithCreatedByName<DomainEvent>>[]>([]);
	let health = $state<OutboxHealth | null>(null);
	let actingJobId = $state<string | null>(null);
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

	/** "3m", "2h", "4d" — coarse on purpose; this is a staleness signal, not a stopwatch. */
	function age(d: string | Date): string {
		const ms = Date.now() - new Date(d).getTime();
		if (ms < 60_000) return `${Math.max(0, Math.round(ms / 1000))}s`;
		if (ms < 3_600_000) return `${Math.round(ms / 60_000)}m`;
		if (ms < 86_400_000) return `${Math.round(ms / 3_600_000)}h`;
		return `${Math.round(ms / 86_400_000)}d`;
	}

	// A backlog older than this means the relay has stopped, not that it's busy. The
	// self-hosted worker polls every 5s by default and platform cron runs at most once a
	// minute, so a minute is the shortest gap that can't be explained by normal cadence.
	const RELAY_STALE_MS = 60_000;

	/**
	 * The backlog, pre-chewed into exactly what the banner renders — or null when there's
	 * nothing to say. Deriving the whole object (rather than a `stalled` flag beside the raw
	 * `health`) is what lets the markup read `oldestAge` without re-proving that
	 * `oldestPendingAt` is non-null: `pending > 0` implies a row exists, but only this
	 * narrowing tells the compiler so.
	 */
	const relayBacklog = $derived.by(() => {
		const oldest = health?.oldestPendingAt;
		if (!health || health.pending === 0 || !oldest) return null;
		return {
			pending: health.pending,
			oldestAge: age(oldest),
			stalled: Date.now() - new Date(oldest).getTime() > RELAY_STALE_MS
		};
	});

	/**
	 * A job whose lease has run out but which is still marked `leased` — the worker holding
	 * it died mid-run. It isn't lost (the next `claimDueJobs` reclaims expired leases), but
	 * it looks identical to healthy in-flight work without this.
	 */
	function leaseExpired(job: Job): boolean {
		return (
			job.status === 'leased' && !!job.leaseExpiresAt && new Date(job.leaseExpiresAt) < new Date()
		);
	}

	/** Requeue puts a dead letter back with a fresh attempt budget; cancel retires it. */
	const canRetry = (job: Job) => job.status === 'failed' || job.status === 'cancelled';
	const canCancel = (job: Job) => job.status === 'pending' || job.status === 'failed';

	/** Only send `scope` when it's actually widened — keeps the default request unchanged. */
	function scopeParam(): Record<string, string> {
		return scope === 'all' ? { scope: 'all' } : {};
	}

	async function load() {
		loading = true;
		error = null;
		try {
			if (tab === 'jobs') {
				const params: Record<string, string> = { limit: '100', ...scopeParam() };
				if (statusFilter !== 'all') params.status = statusFilter;
				// Health rides along with the list: it's the context for everything below it,
				// and a separate refresh button for one number would be its own small trap.
				const [res, healthRes] = await Promise.all([
					apiClient.get<WithOrganizationName<Job>[]>('/jobs', params),
					apiClient.get<OutboxHealth>('/jobs/health', scopeParam())
				]);
				if (res.success) {
					jobs = res.data ?? [];
					total = res.pagination?.total ?? jobs.length;
				} else {
					error = res.error ?? 'Failed to load jobs';
				}
				// A failed health read shouldn't blank the page — the list is still useful.
				health = healthRes.success ? (healthRes.data ?? null) : null;
			} else if (tab === 'events') {
				const res = await apiClient.get<WithOrganizationName<WithCreatedByName<DomainEvent>>[]>(
					'/events',
					{
						limit: '100',
						...scopeParam()
					}
				);
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

	/**
	 * Retry and cancel share everything but the verb and the past-tense confirmation, so they
	 * share a body. `organizationId` is always sent: in the instance-wide view the job may
	 * belong to a tenant the caller isn't switched into, and the server needs to be told which
	 * one (it rejects the mismatch unless you're a super admin).
	 */
	async function actOnJob(job: Job, action: 'retry' | 'cancel') {
		if (actingJobId) return;
		actingJobId = job.id;
		try {
			const res = await apiClient.post<Job>(`/jobs/${job.id}/${action}`, {
				organizationId: job.organizationId
			});
			if (!res.success) {
				toast.error(res.error ?? `Could not ${action} this job`);
				return;
			}
			toast.success(
				action === 'retry' ? 'Job requeued — it runs on the next tick.' : 'Job cancelled.'
			);
			await load();
		} catch (err) {
			toast.error(err instanceof Error ? err.message : `Could not ${action} this job`);
		} finally {
			actingJobId = null;
		}
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

	// Scope applies to jobs and events alike, so this one reloads whichever is showing.
	$effect(() => {
		// eslint-disable-next-line @typescript-eslint/no-unused-expressions -- reactive dependency: re-run when scope changes
		scope;
		if (tab !== 'agent') load();
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
		<div class="flex items-center gap-2">
			{#if isSuperAdmin && tab !== 'agent'}
				<!-- The queue is instance-wide; this is the only view that can show it that way. -->
				<div class="border-rule flex items-center rounded-md border p-0.5 text-xs">
					<button
						class="rounded px-2 py-1 transition-colors {scope === 'organization'
							? 'bg-muted text-foreground'
							: 'text-muted-foreground hover:text-foreground'}"
						onclick={() => (scope = 'organization')}
					>
						This workspace
					</button>
					<button
						class="rounded px-2 py-1 transition-colors {scope === 'all'
							? 'bg-muted text-foreground'
							: 'text-muted-foreground hover:text-foreground'}"
						onclick={() => (scope = 'all')}
					>
						All workspaces
					</button>
				</div>
			{/if}
			<Button variant="outline" size="sm" onclick={load} disabled={loading} class="gap-1.5">
				<RefreshCw class="h-3.5 w-3.5 {loading ? 'animate-spin' : ''}" /> Refresh
			</Button>
		</div>
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
		{#if relayBacklog}
			<!--
				The relay backlog. A count on its own is meaningless — a busy instance always has
				rows in flight — so the age of the oldest is what decides the tone: past a minute,
				nothing is draining the outbox and every consumer has silently stopped.
			-->
			<div
				class="mb-3 flex items-start gap-2 rounded-md border p-3 text-sm {relayBacklog.stalled
					? 'border-destructive/40 bg-destructive/10 text-destructive'
					: 'border-rule text-muted-foreground'}"
			>
				{#if relayBacklog.stalled}
					<TriangleAlert class="mt-0.5 h-4 w-4 shrink-0" />
				{:else}
					<Radio class="mt-0.5 h-4 w-4 shrink-0" />
				{/if}
				<div>
					{#if relayBacklog.stalled}
						<p class="font-medium">
							The relay looks stopped — {relayBacklog.pending} event{relayBacklog.pending === 1
								? ''
								: 's'} waiting, oldest {relayBacklog.oldestAge} old.
						</p>
						<p class="mt-0.5 text-xs">
							Nothing is reacting to events: scheduled publishes, erasure and plugin consumers are
							all paused until a worker calls <code>POST /api/internal/workers/run</code> again.
						</p>
					{:else}
						<p>
							{relayBacklog.pending} event{relayBacklog.pending === 1 ? '' : 's'} waiting to fan out,
							oldest {relayBacklog.oldestAge} old — the relay is keeping up.
						</p>
					{/if}
				</div>
			</div>
		{/if}

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
							{#if scope === 'all'}
								<th class="px-3 py-2 text-left font-medium">Workspace</th>
							{/if}
							<th class="px-3 py-2 text-left font-medium">Status</th>
							<th class="px-3 py-2 text-left font-medium">Run at</th>
							<th class="px-3 py-2 text-left font-medium">Attempts</th>
							<th class="px-3 py-2 text-left font-medium">Last error</th>
							<th class="px-3 py-2 text-left font-medium">Created</th>
							{#if canControlJobs}
								<th class="px-3 py-2 text-right font-medium">Actions</th>
							{/if}
						</tr>
					</thead>
					<tbody>
						{#each jobs as job (job.id)}
							<tr class="border-rule border-t">
								<td class="px-3 py-2 font-mono text-xs">{job.type}</td>
								{#if scope === 'all'}
									<td class="text-muted-foreground px-3 py-2 text-xs">
										{job.organizationName ?? job.organizationId}
									</td>
								{/if}
								<td class="px-3 py-2 whitespace-nowrap">
									<Badge variant={statusVariant[job.status]} class="capitalize">{job.status}</Badge>
									{#if leaseExpired(job)}
										<!-- Still `leased` past its expiry: the worker that held it died. The next
										     claim reclaims it, so this is a diagnosis, not an action item. -->
										<span
											class="text-destructive ml-1.5 text-xs"
											title="Lease expired {age(
												job.leaseExpiresAt ?? new Date()
											)} ago — the worker holding this job stopped. It will be reclaimed on the next tick."
										>
											stalled
										</span>
									{/if}
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
								{#if canControlJobs}
									<td class="px-3 py-2 text-right whitespace-nowrap">
										{#if canRetry(job)}
											<Button
												variant="ghost"
												size="sm"
												class="h-7 gap-1 px-2 text-xs"
												disabled={actingJobId !== null}
												onclick={() => actOnJob(job, 'retry')}
											>
												<RotateCcw class="h-3 w-3" /> Retry
											</Button>
										{/if}
										{#if canCancel(job)}
											<Button
												variant="ghost"
												size="sm"
												class="text-muted-foreground h-7 gap-1 px-2 text-xs"
												disabled={actingJobId !== null}
												onclick={() => actOnJob(job, 'cancel')}
											>
												<Ban class="h-3 w-3" /> Cancel
											</Button>
										{/if}
										{#if !canRetry(job) && !canCancel(job)}
											<span class="text-muted-foreground text-xs">—</span>
										{/if}
									</td>
								{/if}
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
							{#if scope === 'all'}
								<th class="px-3 py-2 text-left font-medium">Workspace</th>
							{/if}
							<th class="px-3 py-2 text-left font-medium">Payload</th>
							<th class="px-3 py-2 text-left font-medium">By</th>
							<th class="px-3 py-2 text-left font-medium">When</th>
						</tr>
					</thead>
					<tbody>
						{#each events as event (event.id)}
							<tr class="border-rule border-t">
								<td class="px-3 py-2 font-mono text-xs">{event.type}</td>
								{#if scope === 'all'}
									<td class="text-muted-foreground px-3 py-2 text-xs">
										{event.organizationName ?? event.organizationId}
									</td>
								{/if}
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
