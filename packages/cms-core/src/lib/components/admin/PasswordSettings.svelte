<script lang="ts">
	import { Button } from '@aphexcms/ui/shadcn/button';
	import PasswordInput from './PasswordInput.svelte';
	import { Label } from '@aphexcms/ui/shadcn/label';
	import { Checkbox } from '@aphexcms/ui/shadcn/checkbox';
	import * as Card from '@aphexcms/ui/shadcn/card';
	import * as Dialog from '@aphexcms/ui/shadcn/dialog';
	import { KeyRound } from '@lucide/svelte';
	import { toast } from 'svelte-sonner';
	import { useAdminAuthClient } from '../../admin/client-auth.svelte';

	/**
	 * Change your own password from inside the admin.
	 *
	 * Distinct from the /reset-password flow, which is for people who *can't* sign
	 * in and proves identity by email. Here the session already proves identity,
	 * so the current password is what stops someone walking up to an unlocked
	 * laptop and taking the account over.
	 *
	 * The actual mutation goes through the host-provided admin auth client (the
	 * provider-agnostic client-side seam), not a hard dependency on Better Auth.
	 */

	/**
	 * Someone who has only signed in with Google (or another provider) has no
	 * password to give, so the card offers to set one instead: an emailed link, the
	 * reset flow, which adds a password beside Google. Emailed rather than set here,
	 * so someone at an unlocked laptop can't add a way in without the inbox.
	 */
	let { email, signInMethods = null }: { email?: string; signInMethods?: string[] | null } =
		$props();

	const PROVIDER_NAMES: Record<string, string> = {
		google: 'Google',
		github: 'GitHub',
		apple: 'Apple',
		microsoft: 'Microsoft'
	};
	// Unknown (null) keeps the change-password card: most accounts have a password.
	const noPassword = $derived(!!signInMethods && !signInMethods.includes('credential'));
	const providerName = $derived(
		(signInMethods ?? [])
			.filter((method) => method !== 'credential')
			.map((method) => PROVIDER_NAMES[method] ?? method.charAt(0).toUpperCase() + method.slice(1))
			.join(' or ') || 'another account'
	);
	let linkSent = $state(false);

	async function sendSetLink() {
		if (!email) return;
		busy = true;
		try {
			const response = await fetch('/api/user/request-password-reset', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					email,
					redirectTo: `${window.location.origin}/admin/reset-password`
				})
			});
			const result = await response.json().catch(() => ({}));
			if (!response.ok || result.success === false) {
				toast.error(result.message || 'Could not send the link');
				return;
			}
			linkSent = true;
			toast.success(`We sent a link to ${email}`);
		} catch {
			toast.error('Could not send the link');
		} finally {
			busy = false;
		}
	}

	const auth = useAdminAuthClient();

	// The minimum better-auth enforces server-side; repeated here only so the user
	// finds out before the round-trip, never as the only check.
	const MIN_LENGTH = 8;

	let open = $state(false);
	let currentPassword = $state('');
	let newPassword = $state('');
	let confirmPassword = $state('');
	// On by default: a password change usually means "someone may have had this",
	// and leaving other sessions alive would defeat the point.
	let revokeOtherSessions = $state(true);
	let busy = $state(false);

	const mismatch = $derived(confirmPassword.length > 0 && newPassword !== confirmPassword);
	const tooShort = $derived(newPassword.length > 0 && newPassword.length < MIN_LENGTH);
	const canSubmit = $derived(
		Boolean(currentPassword) && newPassword.length >= MIN_LENGTH && newPassword === confirmPassword
	);

	function reset() {
		currentPassword = '';
		newPassword = '';
		confirmPassword = '';
		revokeOtherSessions = true;
	}

	/** Never leave typed passwords sitting in memory behind a closed dialog. */
	function onOpenChange(next: boolean) {
		if (busy) return;
		open = next;
		if (!next) reset();
	}

	async function changePassword(e: SubmitEvent) {
		e.preventDefault();
		if (!auth) {
			toast.error('Password changes are unavailable');
			return;
		}
		busy = true;
		try {
			const result = await auth.changePassword({
				currentPassword,
				newPassword,
				revokeOtherSessions
			});

			if (result.error) {
				toast.error(result.error.message || 'Could not change your password');
				return;
			}

			reset();
			open = false;
			toast.success(
				revokeOtherSessions
					? 'Password changed — other sessions have been signed out'
					: 'Password changed'
			);
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Could not change your password');
		} finally {
			busy = false;
		}
	}
</script>

<Card.Root>
	<Card.Header class="flex flex-col items-start justify-between gap-4 sm:flex-row">
		{#if noPassword}
			<div class="space-y-1.5">
				<Card.Title>Password</Card.Title>
				<Card.Description>
					{#if linkSent}
						Check {email} for a link to choose your password. Then you can sign in with your email too.
					{:else}
						You sign in with {providerName}. Set a password to sign in with your email too.
					{/if}
				</Card.Description>
			</div>
			<Button
				variant="outline"
				class="shrink-0"
				onclick={sendSetLink}
				disabled={busy || !email || linkSent}
			>
				<KeyRound class="mr-2 h-4 w-4" />
				{linkSent ? 'Link sent' : 'Set a password'}
			</Button>
		{:else}
			<div class="space-y-1.5">
				<Card.Title>Password</Card.Title>
				<Card.Description>
					Change the password you use to sign in. You'll need your current password, and you can
					sign out everywhere else at the same time.
				</Card.Description>
			</div>
			<Button variant="outline" class="shrink-0" onclick={() => (open = true)} disabled={!auth}>
				<KeyRound class="mr-2 h-4 w-4" />
				Change password
			</Button>
		{/if}
	</Card.Header>
</Card.Root>

<!--
	Controlled rather than `bind:open` — the binding would apply the close before
	`onOpenChange` could refuse it, so an in-flight request couldn't hold the
	dialog open.
-->
<Dialog.Root {open} {onOpenChange}>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>Change password</Dialog.Title>
			<Dialog.Description>Enter your current password, then choose a new one.</Dialog.Description>
		</Dialog.Header>

		<form id="change-password" onsubmit={changePassword} class="space-y-4">
			<div class="space-y-2">
				<Label for="current-password">Current password</Label>
				<PasswordInput
					id="current-password"
					bind:value={currentPassword}
					required
					autocomplete="current-password"
					disabled={busy}
				/>
			</div>

			<div class="space-y-2">
				<Label for="new-password">New password</Label>
				<PasswordInput
					id="new-password"
					bind:value={newPassword}
					required
					autocomplete="new-password"
					disabled={busy}
				/>
				<p class="text-xs {tooShort ? 'text-destructive' : 'text-muted-foreground'}">
					Must be at least {MIN_LENGTH} characters long
				</p>
			</div>

			<div class="space-y-2">
				<Label for="confirm-password">Confirm new password</Label>
				<PasswordInput
					id="confirm-password"
					bind:value={confirmPassword}
					required
					autocomplete="new-password"
					disabled={busy}
				/>
				{#if mismatch}
					<p class="text-destructive text-xs">Passwords do not match</p>
				{/if}
			</div>

			<div class="flex items-center gap-2">
				<Checkbox
					id="revoke-sessions"
					checked={revokeOtherSessions}
					onCheckedChange={(checked) => (revokeOtherSessions = checked === true)}
					disabled={busy}
				/>
				<Label for="revoke-sessions" class="text-sm font-normal">Sign out everywhere else</Label>
			</div>
		</form>

		<Dialog.Footer>
			<Button variant="ghost" onclick={() => onOpenChange(false)} disabled={busy}>Cancel</Button>
			<Button type="submit" form="change-password" disabled={busy || !canSubmit}>
				{busy ? 'Changing…' : 'Change password'}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
