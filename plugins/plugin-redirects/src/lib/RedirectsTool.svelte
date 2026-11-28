<script lang="ts">
	// Redirects: old addresses that lead somewhere new. Most are made by themselves
	// when a page, post or section changes its address; people add their own for a
	// site they're moving from. Data: GET/POST/DELETE /api/redirects (./index.ts).
	import { toast } from '@aphexcms/cms-core/client';
	import { Badge } from '@aphexcms/ui/shadcn/badge';
	import { Button } from '@aphexcms/ui/shadcn/button';
	import * as Card from '@aphexcms/ui/shadcn/card';
	import { Input } from '@aphexcms/ui/shadcn/input';
	import { ArrowRight, Trash2 } from '@lucide/svelte';
	import type { Redirect } from './store';

	let rows = $state<Redirect[] | null>(null);
	let loadError = $state('');
	let from = $state('');
	let to = $state('');
	let formError = $state<{ field: 'from' | 'to' | null; message: string } | null>(null);
	let saving = $state(false);
	let removing = $state<string | null>(null);

	async function load() {
		const response = await fetch('/api/redirects').catch(() => null);
		if (!response?.ok) {
			loadError = 'Redirects couldn’t load. Reload the page to try again.';
			return;
		}
		rows = (await response.json()).redirects;
	}

	$effect(() => {
		load();
	});

	async function add(event: SubmitEvent) {
		event.preventDefault();
		formError = null;
		saving = true;
		try {
			const response = await fetch('/api/redirects', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ from, to })
			});
			const body = await response.json().catch(() => ({}));
			if (!response.ok) {
				formError = {
					field: body.field ?? null,
					message: body.error ?? 'The redirect wasn’t saved. Try again.'
				};
				return;
			}
			rows = body.redirects;
			toast.success('Redirect added.');
			from = '';
			to = '';
		} catch {
			formError = {
				field: null,
				message: 'The redirect wasn’t saved: the connection dropped. Try again.'
			};
		} finally {
			saving = false;
		}
	}

	async function remove(row: Redirect) {
		removing = row.id;
		const response = await fetch('/api/redirects', {
			method: 'DELETE',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ id: row.id })
		}).catch(() => null);
		removing = null;
		if (!response?.ok) {
			toast.error('The redirect wasn’t removed. Try again.');
			return;
		}
		rows = (await response.json()).redirects;
		toast.success(`${row.from} no longer redirects.`);
	}

	const used = (row: Redirect) => {
		if (row.hits === 0) return 'Not used yet';
		const when = row.lastHitAt
			? new Date(row.lastHitAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
			: null;
		return `Used ${row.hits === 1 ? 'once' : `${row.hits.toLocaleString()} times`}${when ? `, last on ${when}` : ''}`;
	};
</script>

<div class="mx-auto grid w-full max-w-3xl gap-8 px-4 pt-6 pb-16 sm:px-6">
	<header class="grid gap-1">
		<h1 class="text-2xl font-semibold tracking-tight">Redirects</h1>
		<p class="text-muted-foreground text-sm">
			When a page, post or section of your site gets a new address, the old one sends people to the
			new one, so saved links and search results keep working. Add your own for addresses from a
			site you’re moving from.
		</p>
	</header>

	<Card.Root class="gap-0 py-0">
		<form class="grid gap-3 p-4" onsubmit={add} novalidate>
			<h2 class="font-semibold">Add a redirect</h2>
			<div class="grid items-start gap-2 sm:grid-cols-[1fr_auto_1fr]">
				<label class="grid gap-1.5">
					<span class="text-sm font-medium">Old address</span>
					<Input
						bind:value={from}
						placeholder="/about-us"
						autocomplete="off"
						autocapitalize="off"
						aria-invalid={formError?.field === 'from' ? 'true' : undefined}
					/>
				</label>
				<ArrowRight class="text-muted-foreground mt-8 hidden size-4 sm:block" aria-hidden="true" />
				<label class="grid gap-1.5">
					<span class="text-sm font-medium">Goes to</span>
					<Input
						bind:value={to}
						placeholder="/about"
						autocomplete="off"
						autocapitalize="off"
						aria-invalid={formError?.field === 'to' ? 'true' : undefined}
					/>
				</label>
			</div>
			<p class="text-muted-foreground text-xs">
				A path on your site, like /about. The old address can also be a full link from your old
				site.
			</p>
			{#if formError}<p class="text-destructive text-sm" role="alert">{formError.message}</p>{/if}
			<div>
				<Button type="submit" size="sm" disabled={saving || !from.trim() || !to.trim()}>
					{saving ? 'Adding…' : 'Add redirect'}
				</Button>
			</div>
		</form>
	</Card.Root>

	<section class="grid gap-3" aria-labelledby="redirects-list">
		<h2 id="redirects-list" class="font-semibold">Your redirects</h2>
		{#if loadError}
			<p class="text-destructive text-sm" role="alert">{loadError}</p>
		{:else if !rows}
			<p class="text-muted-foreground text-sm">Loading…</p>
		{:else if rows.length === 0}
			<p class="text-muted-foreground text-sm">
				None yet. Change a page’s address and the old one shows up here, already redirecting.
			</p>
		{:else}
			<ul class="divide-border bg-card divide-y rounded-xl border">
				{#each rows as row (row.id)}
					<li class="flex items-center gap-3 px-4 py-3">
						<div class="grid min-w-0 flex-1 gap-1">
							<p class="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 font-mono text-sm">
								<span class="truncate">{row.from}</span>
								<ArrowRight class="text-muted-foreground size-3.5 flex-none" aria-label="goes to" />
								<span class="truncate">{row.to}</span>
							</p>
							<p class="text-muted-foreground flex flex-wrap items-center gap-2 text-xs">
								{#if row.source === 'auto'}
									<Badge variant="secondary" class="px-1.5 py-0 text-[11px] font-normal">
										{row.prefix ? 'Section moved' : 'Address changed'}
									</Badge>
								{/if}
								{#if row.prefix}<span>Includes every address under it</span><span aria-hidden="true"
										>·</span
									>{/if}
								{used(row)}
							</p>
						</div>
						<Button
							variant="ghost"
							size="icon"
							class="size-8 flex-none"
							title="Remove this redirect"
							disabled={removing === row.id}
							onclick={() => remove(row)}
						>
							<Trash2 class="size-4" />
							<span class="sr-only">Remove the redirect from {row.from}</span>
						</Button>
					</li>
				{/each}
			</ul>
		{/if}
	</section>
</div>
