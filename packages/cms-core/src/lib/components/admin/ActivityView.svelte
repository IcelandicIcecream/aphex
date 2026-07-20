<script lang="ts">
	// Read-only operational history for the durable spine — the queryability Sanity's old
	// out-of-dataset scheduling lacked. Jobs tab = scheduled/queued work and its outcome;
	// Events tab = the append-only domain-event log. Fetches GET /api/jobs and /api/events
	// (gated on document.read). No mutation controls — replay/cancel can come later.
	import { onMount } from 'svelte';
	import { Button } from '@aphexcms/ui/shadcn/button';
	import { Badge } from '@aphexcms/ui/shadcn/badge';
	import { RefreshCw, CalendarClock, Radio } from '@lucide/svelte';
	import { apiClient } from '../../api/client';
	import type { Job, DomainEvent, JobStatus } from '../../types/events';

	type Tab = 'jobs' | 'events';
	let tab = $state<Tab>('jobs');

	let jobs = $state<Job[]>([]);
	let events = $state<DomainEvent[]>([]);
	let loading = $state(false);
	let error = $state<string | null>(null);
	let total = $state(0);

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
			} else {
				const res = await apiClient.get<DomainEvent[]>('/events', { limit: '100' });
				if (res.success) {
					events = res.data ?? [];
					total = res.pagination?.total ?? events.length;
				} else {
					error = res.error ?? 'Failed to load events';
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
			<p class="text-muted-foreground text-sm">Scheduled jobs and the domain-event log.</p>
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
	{:else if loading && jobs.length === 0 && events.length === 0}
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
	{:else if events.length === 0}
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
								>{event.createdBy ?? '—'}</td
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
</div>
