<script lang="ts">
	import { Button } from '@aphexcms/ui/shadcn/button';
	import { Label } from '@aphexcms/ui/shadcn/label';
	import { Input } from '@aphexcms/ui/shadcn/input';
	import * as Card from '@aphexcms/ui/shadcn/card';
	import * as Dialog from '@aphexcms/ui/shadcn/dialog';
	import { toast } from 'svelte-sonner';
	import { goto } from '$app/navigation';
	import { authClient } from '$lib/auth-client';
	import PasswordInput from '$lib/components/PasswordInput.svelte';

	type Props = { email: string };
	let { email }: Props = $props();

	let open = $state(false);
	let confirmation = $state('');
	let password = $state('');
	let isDeleting = $state(false);

	// Typing the address is the whole safeguard: it's the one field that can't be
	// satisfied by clicking through, which is how an irreversible action gets taken
	// by accident. The password is proof of identity, not of intent — a borrowed
	// session has the button but not the words.
	const canDelete = $derived(confirmation.trim().toLowerCase() === email.toLowerCase());

	function onOpenChange(next: boolean) {
		// Refuse to close mid-request; the dialog is the only thing reporting progress.
		if (isDeleting) return;
		open = next;
		if (!next) {
			confirmation = '';
			password = '';
		}
	}

	async function deleteAccount() {
		if (!canDelete || isDeleting) return;

		isDeleting = true;
		try {
			const result = await authClient.deleteUser({ password });
			if (result.error) {
				// The server refuses when you're the last owner of an organization that
				// still has members — surface its message rather than a generic failure,
				// because it names what to fix.
				throw new Error(result.error.message || 'Could not delete your account');
			}

			// Straight out, no toast: the session is gone and the admin shell would only
			// render a flash of a workspace this account no longer belongs to.
			await goto('/login?deleted=1');
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Could not delete your account');
			isDeleting = false;
		}
	}
</script>

<Card.Root class="border-destructive/40">
	<Card.Content class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
		<div class="space-y-1">
			<p class="text-sm font-medium">Delete account</p>
			<p class="text-muted-foreground max-w-prose text-sm">
				Permanently deletes your account, your profile picture, and your membership of every
				workspace. Content you created stays where it is. This can't be undone.
			</p>
		</div>

		<Button variant="destructive" class="shrink-0" onclick={() => (open = true)}>
			Delete account
		</Button>
	</Card.Content>
</Card.Root>

<Dialog.Root {open} {onOpenChange}>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>Delete your account?</Dialog.Title>
			<Dialog.Description>
				This is permanent. Your profile and profile picture are erased and you're removed from every
				workspace you belong to.
			</Dialog.Description>
		</Dialog.Header>

		<div class="grid gap-4 py-2">
			<div class="grid gap-2">
				<Label for="delete-confirmation">
					Type <span class="font-mono font-medium">{email}</span> to confirm
				</Label>
				<Input
					id="delete-confirmation"
					bind:value={confirmation}
					autocomplete="off"
					disabled={isDeleting}
				/>
			</div>

			<div class="grid gap-2">
				<Label for="delete-password">Your password</Label>
				<PasswordInput
					id="delete-password"
					bind:value={password}
					autocomplete="current-password"
					disabled={isDeleting}
				/>
			</div>
		</div>

		<Dialog.Footer>
			<Button variant="outline" onclick={() => onOpenChange(false)} disabled={isDeleting}>
				Cancel
			</Button>
			<Button variant="destructive" onclick={deleteAccount} disabled={!canDelete || isDeleting}>
				{isDeleting ? 'Deleting…' : 'Delete account'}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
