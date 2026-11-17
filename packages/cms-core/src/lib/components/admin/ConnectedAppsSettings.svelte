<script lang="ts">
	/**
	 * The apps (Claude, ChatGPT…) this user has connected to the current organization
	 * over OAuth, with a way to cut one off. Disconnecting removes the grant and every
	 * token it issued, so the app's next request fails.
	 */
	import { Button } from '@aphexcms/ui/shadcn/button';
	import * as Card from '@aphexcms/ui/shadcn/card';
	import * as Tabs from '@aphexcms/ui/shadcn/tabs';
	import { invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import { Check, Copy, Plug } from '@lucide/svelte';
	import { toast } from 'svelte-sonner';
	import { oauth } from '../../api/oauth';
	import { confirmDialog } from './confirm-dialog/confirm-dialog.svelte';
	import type { OAuthConnection } from '../../auth/provider';
	import { MCP_PATH } from '../../mcp/paths';

	let { apps }: { apps: OAuthConnection[] } = $props();

	let removing = $state<string | null>(null);

	/** What Claude or ChatGPT is given: this site's own address, tenant subdomain and all. */
	const address = $derived(`${page.url.origin}${MCP_PATH}`);
	let copied = $state(false);

	async function copyAddress() {
		try {
			await navigator.clipboard.writeText(address);
			copied = true;
			setTimeout(() => (copied = false), 2000);
		} catch {
			toast.error('Could not copy. Select the address and copy it yourself.');
		}
	}

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
	<Card.Content class="space-y-6">
		{#if apps.length > 0}
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
			<details class="group">
				<summary class="text-muted-foreground hover:text-foreground cursor-pointer text-sm">
					Connect another app
				</summary>
				<div class="pt-4">{@render howTo()}</div>
			</details>
		{:else}
			<p class="text-muted-foreground text-sm">
				Nothing connected yet. Connect Claude or ChatGPT and you can ask it, in plain words, to read
				and edit your content for you. It takes about two minutes.
			</p>
			{@render howTo()}
		{/if}
	</Card.Content>
</Card.Root>

{#snippet step(n: number, body: import('svelte').Snippet)}
	<li class="flex gap-3">
		<span
			class="bg-muted text-muted-foreground flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-medium"
			aria-hidden="true">{n}</span
		>
		<div class="min-w-0 pt-0.5">{@render body()}</div>
	</li>
{/snippet}

{#snippet howTo()}
	<div class="space-y-5 text-sm">
		<div class="space-y-2">
			<p class="font-medium">This site's address for connecting</p>
			<div class="flex gap-2">
				<code
					class="bg-muted min-w-0 flex-1 truncate rounded-md px-3 py-2 font-mono text-xs leading-5 select-all"
					>{address}</code
				>
				<Button variant="outline" size="sm" class="h-9 shrink-0" onclick={copyAddress}>
					{#if copied}<Check class="size-4" /> Copied{:else}<Copy class="size-4" /> Copy{/if}
				</Button>
			</div>
			<p class="text-muted-foreground text-xs">
				You'll paste this into Claude or ChatGPT in a moment. Keep this page open.
			</p>
		</div>

		<Tabs.Root value="claude">
			<Tabs.List>
				<Tabs.Trigger value="claude">Claude</Tabs.Trigger>
				<Tabs.Trigger value="chatgpt">ChatGPT</Tabs.Trigger>
			</Tabs.List>

			<Tabs.Content value="claude" class="pt-3">
				<ol class="space-y-3">
					{#snippet c1()}
						Open <a
							href="https://claude.ai"
							target="_blank"
							rel="noreferrer"
							class="underline underline-offset-2">claude.ai</a
						>
						(or the Claude desktop app) and sign in. Click your name in the bottom left, then
						<strong>Settings</strong>, then <strong>Connectors</strong>.
					{/snippet}
					{@render step(1, c1)}
					{#snippet c2()}
						Click <strong>Add custom connector</strong>. Give it a name you'll recognise (your
						site's name is good), paste the address above into <strong>URL</strong>, and click
						<strong>Add</strong>.
					{/snippet}
					{@render step(2, c2)}
					{#snippet c3()}
						Click <strong>Connect</strong> next to it. A window opens here: sign in if asked, pick
						this site, and click <strong>Allow</strong>. You're sent back to Claude.
					{/snippet}
					{@render step(3, c3)}
					{#snippet c4()}
						Start a new chat. In the <strong>+</strong> menu under the message box, open
						<strong>Connectors</strong> and check yours is switched on. Then ask, for example: "What can
						you do on my site?"
					{/snippet}
					{@render step(4, c4)}
				</ol>
				<p class="text-muted-foreground mt-3 text-xs">
					On a Claude Team or Enterprise plan, an owner of your Claude organization may need to add
					the connector first.
				</p>
			</Tabs.Content>

			<Tabs.Content value="chatgpt" class="pt-3">
				<ol class="space-y-3">
					{#snippet g1()}
						Open <a
							href="https://chatgpt.com"
							target="_blank"
							rel="noreferrer"
							class="underline underline-offset-2">chatgpt.com</a
						>
						and sign in. Click your name, then <strong>Settings</strong>, then
						<strong>Apps & Connectors</strong>.
					{/snippet}
					{@render step(1, g1)}
					{#snippet g2()}
						Scroll to <strong>Advanced settings</strong> and turn on
						<strong>Developer mode</strong>. ChatGPT needs it for apps that aren't in its store yet,
						like this one.
					{/snippet}
					{@render step(2, g2)}
					{#snippet g3()}
						Go back and click <strong>Create</strong>. Give it a name, paste the address above into
						<strong>MCP Server URL</strong>, choose <strong>OAuth</strong> for authentication, tick
						that you trust it, and click <strong>Create</strong>.
					{/snippet}
					{@render step(3, g3)}
					{#snippet g4()}
						A window opens here: sign in if asked, pick this site, and click
						<strong>Allow</strong>.
					{/snippet}
					{@render step(4, g4)}
					{#snippet g5()}
						Start a new chat, click <strong>+</strong> under the message box, and choose your app
						(under <strong>More</strong> if you don't see it). Then ask, for example: "What can you do
						on my site?"
					{/snippet}
					{@render step(5, g5)}
				</ol>
				<p class="text-muted-foreground mt-3 text-xs">
					Developer mode is on ChatGPT's paid plans (Plus, Pro, Business and up).
				</p>
			</Tabs.Content>
		</Tabs.Root>

		<div class="bg-muted/50 space-y-1 rounded-md p-3 text-xs">
			<p class="font-medium">What it can do</p>
			<p class="text-muted-foreground">
				It works as you, in this site only. It can read your content and write drafts, but it can
				never publish, delete, or change members and settings: you check its work and publish it
				yourself. Disconnect it here any time and it loses access straight away.
			</p>
		</div>
	</div>
{/snippet}
