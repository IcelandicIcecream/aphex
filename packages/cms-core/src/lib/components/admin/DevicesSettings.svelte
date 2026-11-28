<script lang="ts">
	/**
	 * The devices signed in to this account, with a way to sign each out. Through the
	 * host's auth client, and not shown when it can't list them.
	 */
	import { onMount } from 'svelte';
	import { Button } from '@aphexcms/ui/shadcn/button';
	import * as Card from '@aphexcms/ui/shadcn/card';
	import { toast } from 'svelte-sonner';
	import { useAdminAuthClient, type AdminDeviceSession } from '../../admin/client-auth.svelte';
	import { describeDevice } from '../../utils/user-agent';
	import { formatDate } from '../../utils/dates';
	import { confirmDialog } from './confirm-dialog/confirm-dialog.svelte';

	let { currentSessionId }: { currentSessionId: string | null } = $props();

	const auth = useAdminAuthClient();
	const available = !!(auth?.listSessions && auth.revokeSession && auth.revokeOtherSessions);

	let sessions = $state<AdminDeviceSession[] | null>(null);
	let failed = $state(false);
	let busy = $state<string | null>(null);

	const others = $derived((sessions ?? []).filter(({ id }) => id !== currentSessionId));
	const ordered = $derived([
		...(sessions ?? []).filter(({ id }) => id === currentSessionId),
		...[...others].sort((a, b) => Number(new Date(b.updatedAt)) - Number(new Date(a.updatedAt)))
	]);

	async function refresh() {
		try {
			const result = await auth?.listSessions?.();
			failed = !result?.data;
			if (result?.data) sessions = result.data;
		} catch {
			failed = true;
		}
	}
	onMount(() => {
		if (available) refresh();
	});

	async function run(
		key: string,
		action: () => Promise<{ error?: unknown } | undefined>,
		done: string
	) {
		busy = key;
		try {
			const result = await action();
			if (!result || result.error) throw new Error();
			toast.success(done);
			await refresh();
		} catch {
			toast.error('Could not sign that out. Try again.');
		} finally {
			busy = null;
		}
	}

	async function signOutOthers() {
		const confirmed = await confirmDialog({
			title: 'Sign out everywhere else?',
			description: 'Every other device has to sign in again. This one stays signed in.',
			confirmText: 'Sign out everywhere else'
		});
		if (confirmed)
			await run('others', async () => auth?.revokeOtherSessions?.(), 'Signed out everywhere else');
	}

	const day = (date: Date | string) =>
		formatDate(date, { day: 'numeric', month: 'short', year: 'numeric' });
</script>

{#if available}
	<Card.Root>
		<Card.Header class="flex flex-col items-start justify-between gap-4 sm:flex-row">
			<div class="space-y-1.5">
				<Card.Title>Signed-in devices</Card.Title>
				<Card.Description>
					Sign out any you don't recognise, then change your password. A device can take a minute to
					be signed out.
				</Card.Description>
			</div>
			{#if others.length}
				<Button variant="outline" class="shrink-0" onclick={signOutOthers} disabled={busy !== null}>
					Sign out everywhere else
				</Button>
			{/if}
		</Card.Header>
		<Card.Content>
			{#if failed && !sessions}
				<div class="flex items-center justify-between gap-4 text-sm">
					<p class="text-muted-foreground">Your devices couldn't be loaded.</p>
					<Button variant="outline" size="sm" onclick={refresh}>Try again</Button>
				</div>
			{:else if !sessions}
				<p class="text-muted-foreground text-sm">Loading…</p>
			{:else}
				<ul class="divide-border divide-y">
					{#each ordered as session (session.id)}
						<li class="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
							<div class="min-w-0">
								<p class="truncate text-sm font-medium">
									{describeDevice(session.userAgent) ?? 'Unknown device'}
								</p>
								<p class="text-muted-foreground text-xs">
									{session.id === currentSessionId
										? 'This device'
										: `Last active ${day(session.updatedAt)}`} · signed in {day(session.createdAt)}
								</p>
							</div>
							{#if session.id !== currentSessionId}
								<Button
									variant="ghost"
									size="sm"
									class="shrink-0"
									disabled={busy !== null}
									onclick={() =>
										run(
											session.id,
											async () => auth?.revokeSession?.({ token: session.token }),
											'Signed out'
										)}
								>
									Sign out
								</Button>
							{/if}
						</li>
					{/each}
				</ul>
			{/if}
		</Card.Content>
	</Card.Root>
{/if}
