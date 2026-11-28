<script lang="ts">
	/** Asks for `phrase` to be typed before something is deleted for good. */
	import type { Snippet } from 'svelte';
	import { Button } from '@aphexcms/ui/shadcn/button';
	import * as Dialog from '@aphexcms/ui/shadcn/dialog';
	import { Input } from '@aphexcms/ui/shadcn/input';
	import { Label } from '@aphexcms/ui/shadcn/label';
	import { toast } from 'svelte-sonner';

	type Props = {
		open: boolean;
		title: string;
		phrase: string;
		action: string;
		/** Throws with the message to show when it couldn't. */
		onConfirm: () => Promise<void>;
		children: Snippet;
	};
	let { open = $bindable(), title, phrase, action, onConfirm, children }: Props = $props();

	const inputId = $props.id();
	let typed = $state('');
	let deleting = $state(false);
	const confirmed = $derived(typed.trim().toLowerCase() === phrase.trim().toLowerCase());

	function onOpenChange(next: boolean) {
		if (deleting) return;
		open = next;
		if (!next) typed = '';
	}

	async function submit(event: SubmitEvent) {
		event.preventDefault();
		if (!confirmed || deleting) return;
		deleting = true;
		try {
			await onConfirm();
			open = false;
			typed = '';
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Could not delete it');
		} finally {
			deleting = false;
		}
	}
</script>

<Dialog.Root {open} {onOpenChange}>
	<Dialog.Content class="sm:max-w-md">
		<form onsubmit={submit} class="grid gap-4">
			<Dialog.Header>
				<Dialog.Title>{title}</Dialog.Title>
				<Dialog.Description>{@render children()}</Dialog.Description>
			</Dialog.Header>
			<div class="grid gap-2">
				<Label for={inputId} class="block leading-normal">
					Type <span class="font-mono font-medium break-all">{phrase}</span> to confirm
				</Label>
				<Input id={inputId} bind:value={typed} autocomplete="off" disabled={deleting} />
			</div>
			<Dialog.Footer>
				<Button variant="outline" onclick={() => onOpenChange(false)} disabled={deleting}>
					Cancel
				</Button>
				<Button type="submit" variant="destructive" disabled={!confirmed || deleting}>
					{deleting ? 'Deleting…' : action}
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>
