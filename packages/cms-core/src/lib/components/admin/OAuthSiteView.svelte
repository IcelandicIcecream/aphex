<script lang="ts">
	/**
	 * Connecting an app (Claude, ChatGPT) to `/mcp`: the step after signing in, where
	 * the user picks the one site the app may use. A site whose plan doesn't include
	 * MCP access is shown but can't be picked.
	 */
	import { Button } from '@aphexcms/ui/shadcn/button';
	import * as Card from '@aphexcms/ui/shadcn/card';
	import { Check } from '@lucide/svelte';
	import AuthPageShell from './AuthPageShell.svelte';
	import { oauth } from '../../api/oauth';
	import { redirectHost } from './oauth-display';
	import type { AdminOAuthSiteData } from '../../admin/view-data';

	let { data, title }: { data: AdminOAuthSiteData; title: string } = $props();

	const app = $derived(data.authorization?.client.name ?? 'This app');
	const allowed = $derived(data.sites.filter((site) => site.allowed));
	// The site already chosen (back from the consent page), else the only one there is.
	let selected = $state<string | null>(null);
	$effect.pre(() => {
		if (selected) return;
		const current = data.authorization?.organizationId;
		if (current && allowed.some((site) => site.id === current)) selected = current;
		else if (allowed.length === 1) selected = allowed[0]!.id;
	});

	let loading = $state(false);
	let error = $state('');

	async function next() {
		if (!selected) return;
		loading = true;
		error = '';
		try {
			const result = await oauth.chooseSite({
				oauthQuery: data.oauthQuery,
				organizationId: selected
			});
			// Same origin (the consent page), but a full load: it's a new server render.
			window.location.href = result.data!.url;
		} catch (err) {
			error = err instanceof Error ? err.message : 'Something went wrong. Try again.';
			loading = false;
		}
	}
</script>

<svelte:head>
	<title>{title} — Connect {app}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<AuthPageShell branding={data.branding} {title}>
	<Card.Root class="shadow-lg">
		{#if !data.authorization}
			<Card.Header class="space-y-1.5 px-8 text-center">
				<Card.Title class="text-lg">This link has expired</Card.Title>
				<Card.Description>Go back to the app you were connecting and start again.</Card.Description>
			</Card.Header>
		{:else}
			<Card.Header class="space-y-1.5 px-8 text-center">
				<Card.Title class="text-lg">Connect {app}</Card.Title>
				<Card.Description>
					Choose the site {app} can use. It won't be able to reach any other.
				</Card.Description>
			</Card.Header>

			<Card.Content class="space-y-5 px-8">
				{#if error}
					<div class="border-destructive/50 bg-destructive/10 rounded-lg border p-3">
						<p class="text-destructive text-sm font-medium">{error}</p>
					</div>
				{/if}

				{#if data.sites.length === 0}
					<p class="text-muted-foreground text-center text-sm">
						You aren't a member of any site yet.
					</p>
				{:else}
					<div class="space-y-2" role="radiogroup" aria-label="Site">
						{#each data.sites as site (site.id)}
							<button
								type="button"
								role="radio"
								aria-checked={selected === site.id}
								disabled={!site.allowed || loading}
								onclick={() => (selected = site.id)}
								class="hover:bg-muted/60 focus-visible:ring-ring flex w-full items-center gap-3 rounded-lg border px-4 py-3 text-left transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-transparent {selected ===
								site.id
									? 'border-primary bg-primary/5'
									: ''}"
							>
								<span class="min-w-0 flex-1">
									<span class="block truncate text-sm font-medium">{site.name}</span>
									<span class="text-muted-foreground block truncate text-xs">{site.slug}</span>
								</span>
								{#if !site.allowed}
									<span class="text-muted-foreground shrink-0 text-xs">
										Needs {data.requirement ?? 'an upgrade'}
									</span>
								{:else if selected === site.id}
									<Check class="text-primary size-4 shrink-0" aria-hidden="true" />
								{/if}
							</button>
						{/each}
					</div>
				{/if}

				<Button class="w-full" disabled={!selected || loading} onclick={next}>
					{loading ? 'Continuing…' : 'Continue'}
				</Button>

				<p class="text-muted-foreground text-center text-xs">
					Signed in as {data.userEmail}. You'll go back to
					<span class="text-foreground font-medium"
						>{redirectHost(data.authorization.redirectUri)}</span
					> when you're done.
				</p>
			</Card.Content>
		{/if}
	</Card.Root>
</AuthPageShell>
