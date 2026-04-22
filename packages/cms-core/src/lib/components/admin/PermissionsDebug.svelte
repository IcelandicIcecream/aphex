<script lang="ts">
	import { Shield, X, Copy } from '@lucide/svelte';
	import { toast } from 'svelte-sonner';
	import { Button } from '@aphexcms/ui/shadcn/button';
	import { Badge } from '@aphexcms/ui/shadcn/badge';
	import { usePermissions } from '../../permissions-context.svelte';

	/**
	 * A floating dev panel that surfaces the caller's resolved RBAC state so
	 * you can see exactly what the client thinks you can do. Mirrors the
	 * server-side capability set hydrated by the auth hook.
	 *
	 * Mount once near the root of your admin layout. Hidden by default —
	 * clicking the shield toggles the panel open.
	 */

	const perms = usePermissions();
	let open = $state(false);

	const capabilities = $derived([...perms.capabilities].sort());
	const grouped = $derived.by(() => {
		const groups = new Map<string, string[]>();
		for (const cap of capabilities) {
			const prefix = cap.includes('.') ? (cap.split('.')[0] ?? 'other') : 'other';
			if (!groups.has(prefix)) groups.set(prefix, []);
			groups.get(prefix)!.push(cap);
		}
		return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b));
	});

	async function copyJSON() {
		const payload = {
			role: perms.role,
			capabilities
		};
		try {
			await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
			toast.success('Copied RBAC snapshot');
		} catch {
			toast.error('Copy failed');
		}
	}
</script>

{#if open}
	<div
		class="bg-background fixed right-4 bottom-4 z-50 w-80 overflow-hidden rounded-lg border shadow-lg"
		role="dialog"
		aria-label="Permissions debug"
	>
		<div class="border-b px-3 py-2">
			<div class="flex items-center justify-between gap-2">
				<div class="flex items-center gap-2">
					<Shield class="h-3.5 w-3.5" />
					<span class="text-sm font-semibold">RBAC</span>
				</div>
				<div class="flex items-center gap-1">
					<Button variant="ghost" size="sm" class="h-6 w-6 p-0" onclick={copyJSON} title="Copy JSON">
						<Copy class="h-3 w-3" />
					</Button>
					<Button
						variant="ghost"
						size="sm"
						class="h-6 w-6 p-0"
						onclick={() => (open = false)}
						title="Close"
					>
						<X class="h-3 w-3" />
					</Button>
				</div>
			</div>
			<div class="mt-1 flex items-center gap-1.5 text-xs">
				<span class="text-muted-foreground">role:</span>
				{#if perms.role}
					<Badge variant="secondary" class="text-[10px]">{perms.role}</Badge>
				{:else}
					<span class="text-muted-foreground italic">none</span>
				{/if}
			</div>
		</div>

		<div class="max-h-80 space-y-3 overflow-y-auto p-3">
			{#if capabilities.length === 0}
				<p class="text-muted-foreground py-4 text-center text-xs">No capabilities granted.</p>
			{:else}
				{#each grouped as [prefix, caps] (prefix)}
					<div class="space-y-1">
						<p
							class="text-muted-foreground text-[10px] font-semibold tracking-wider uppercase"
						>
							{prefix}
						</p>
						<div class="flex flex-wrap gap-1">
							{#each caps as cap (cap)}
								<Badge variant="outline" class="font-mono text-[10px]">
									{cap.split('.').slice(1).join('.') || cap}
								</Badge>
							{/each}
						</div>
					</div>
				{/each}
			{/if}
		</div>
	</div>
{:else}
	<button
		type="button"
		onclick={() => (open = true)}
		class="bg-background hover:bg-muted fixed right-4 bottom-4 z-50 flex h-9 w-9 items-center justify-center rounded-full border shadow-sm transition-colors"
		title="Show permissions"
		aria-label="Show permissions debug"
	>
		<Shield class="h-4 w-4" />
	</button>
{/if}
