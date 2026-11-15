<script lang="ts">
	/**
	 * The apps (Claude, ChatGPT…) this user has connected to the current organization
	 * over OAuth, with a way to cut one off. Disconnecting removes the grant and every
	 * token it issued, so the app's next request fails.
	 */
	import { Button } from '@aphexcms/ui/shadcn/button';
	import * as Card from '@aphexcms/ui/shadcn/card';
	import { invalidateAll } from '$app/navigation';
	import { Plug } from '@lucide/svelte';
	import { toast } from 'svelte-sonner';
	import { oauth } from '../../api/oauth';
	import { confirmDialog } from './confirm-dialog/confirm-dialog.svelte';
	import type { OAuthConnection } from '../../auth/provider';

	let { apps }: { apps: OAuthConnection[] } = $props();

	let removing = $state<string | null>(null);

	const scopeSummary = (scopes: string[]) =>
		scopes.includes('aphex:write') ? 'Reads and edits drafts' : 'Reads content';

	const connectedOn = (date: Date | string) =>
		new Date(date).toLocaleDateString(undefined, {
			day: 'numeric',
			month: 'short',
			year: 'numeric'
		});

	async function disconnect(app: OAuthConnection) {
		const confirmed = await confirmDialog({
			title: `Disconnect ${app.name}?`,
			description: `${app.name} loses access straight away. You can connect it again later.`,
			confirmText: 'Disconnect',
			variant: 'destructive'
		});
		if (!confirmed) return;
		removing = app.clientId;
		try {
			await oauth.disconnect(app.clientId);
			toast.success(`${app.name} disconnected`);
			await invalidateAll();
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Could not disconnect');
		} finally {
			removing = null;
		}
	}
</script>

<Card.Root>
	<Card.Header>
		<Card.Title>Connected apps</Card.Title>
		<Card.Description>
			Apps such as Claude or ChatGPT you've let into this site. Each acts as you, can read and edit
			drafts, and can never publish or delete.
		</Card.Description>
	</Card.Header>
	<Card.Content>
		{#if apps.length === 0}
			<p class="text-muted-foreground text-sm">
				None yet. Add this site's MCP address to Claude or ChatGPT as a connector to connect one.
			</p>
		{:else}
			<ul class="divide-y">
				{#each apps as app (app.clientId)}
					<li class="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
						{#if app.icon}
							<img src={app.icon} alt="" class="size-8 shrink-0 rounded-md object-contain" />
						{:else}
							<div class="bg-muted flex size-8 shrink-0 items-center justify-center rounded-md">
								<Plug class="text-muted-foreground size-4" aria-hidden="true" />
							</div>
						{/if}
						<div class="min-w-0 flex-1">
							<p class="truncate text-sm font-medium">{app.name}</p>
							<p class="text-muted-foreground truncate text-xs">
								{scopeSummary(app.scopes)} · connected {connectedOn(app.connectedAt)}
							</p>
						</div>
						<Button
							variant="outline"
							size="sm"
							disabled={removing === app.clientId}
							onclick={() => disconnect(app)}
						>
							{removing === app.clientId ? 'Disconnecting…' : 'Disconnect'}
						</Button>
					</li>
				{/each}
			</ul>
		{/if}
	</Card.Content>
</Card.Root>
