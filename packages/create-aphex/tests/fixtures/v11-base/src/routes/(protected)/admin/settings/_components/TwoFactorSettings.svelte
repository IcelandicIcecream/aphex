<script lang="ts">
	import { authClient } from '$lib/auth-client';
	import { Button } from '@aphexcms/ui/shadcn/button';
	import PasswordInput from '$lib/components/PasswordInput.svelte';
	import { Label } from '@aphexcms/ui/shadcn/label';
	import { Badge } from '@aphexcms/ui/shadcn/badge';
	import * as Card from '@aphexcms/ui/shadcn/card';
	import * as InputOTP from '@aphexcms/ui/shadcn/input-otp';
	import { ShieldCheck, ShieldOff, Copy, Download } from '@lucide/svelte';
	import { toast } from 'svelte-sonner';

	/**
	 * Opt-in TOTP enrolment for the signed-in user.
	 *
	 * The enrol → verify split is better-auth's, and it's the right one: `enable`
	 * hands back a secret and backup codes but leaves `twoFactorEnabled` false
	 * until a real code from the authenticator comes back. So a user who closes
	 * this panel halfway through — or scans the QR into an app that never syncs —
	 * is not locked out of their own account.
	 */

	/**
	 * Whether this instance offers the authenticator app at all. Drives enrolment:
	 * with it off, turning 2FA on is a single password confirmation and codes
	 * arrive by email instead of from a scanned QR.
	 */
	let { totpAvailable = true }: { totpAvailable?: boolean } = $props();

	const session = authClient.useSession();

	// `undefined` while the session is still loading, so the panel can show a
	// placeholder instead of flashing "not enabled" at someone who has it on.
	const enabled = $derived($session.data?.user.twoFactorEnabled ?? undefined);

	type Step = 'idle' | 'password' | 'verify' | 'disable' | 'regenerate';

	let step: Step = $state('idle');
	let password = $state('');
	let code = $state('');
	let busy = $state(false);

	// Enrolment material, held only for the length of the flow — the secret is
	// never retrievable again without the password, and the backup codes are
	// shown once.
	let qrDataUrl = $state('');
	let totpSecret = $state('');
	let backupCodes: string[] = $state([]);

	function reset() {
		step = 'idle';
		password = '';
		code = '';
		qrDataUrl = '';
		totpSecret = '';
		backupCodes = [];
	}

	function errorMessage(error: { message?: string } | null, fallback: string) {
		return error?.message || fallback;
	}

	/**
	 * Pull the session again, bypassing the cookie cache.
	 *
	 * The client already refetches after any `/two-factor/*` call, but that request
	 * is served from Better Auth's signed session cookie, which is cached for 60s
	 * and isn't rewritten when 2FA is enabled or disabled. So the "refreshed"
	 * session still says what it said before, and this panel goes on claiming 2FA
	 * is on for a minute after it was switched off. Asking for an uncached read is
	 * what actually moves `twoFactorEnabled`.
	 */
	async function refreshSession() {
		await $session.refetch?.({ query: { disableCookieCache: true } });
	}

	async function startEnrolment(e: SubmitEvent) {
		e.preventDefault();
		busy = true;
		try {
			const result = await authClient.twoFactor.enable({ password });

			if (result.error || !result.data) {
				toast.error(errorMessage(result.error, 'Could not start setup'));
				return;
			}

			backupCodes = result.data.backupCodes;
			password = '';

			// With TOTP switched off there is no authenticator to scan into and
			// nothing to prove, so the server enables on the spot
			// (`skipVerificationOnEnable`) and the QR step would be a dead end.
			// Codes arrive by email from here on; the backup codes still matter.
			if (!totpAvailable) {
				await refreshSession();
				step = 'idle';
				toast.success('Two-factor authentication is on — codes will be emailed to you');
				return;
			}

			// Imported here rather than at the top so it lands in its own lazy chunk
			// (~23KB) instead of the admin's shared one — this is the only place in
			// the app that ever draws a QR code, and only after a click.
			const QRCode = (await import('qrcode')).default;
			qrDataUrl = await QRCode.toDataURL(result.data.totpURI, { margin: 1, width: 240 });
			// Shown as text for authenticator apps that can't use a camera.
			totpSecret = new URL(result.data.totpURI).searchParams.get('secret') ?? '';

			step = 'verify';
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Could not start setup');
		} finally {
			busy = false;
		}
	}

	function handleConfirm(e: SubmitEvent) {
		e.preventDefault();
		confirmEnrolment();
	}

	async function confirmEnrolment() {
		// `onComplete` fires as soon as the sixth digit lands, so guard against
		// re-entry while the previous attempt is still in flight.
		if (busy || code.trim().length !== 6) return;

		busy = true;
		try {
			const result = await authClient.twoFactor.verifyTotp({ code: code.trim() });

			if (result.error) {
				toast.error(
					errorMessage(
						result.error,
						'That code is not valid. Codes expire every 30 seconds — try the current one.'
					)
				);
				code = '';
				return;
			}

			await refreshSession();
			toast.success('Two-factor authentication is on');
			reset();
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Could not verify the code');
		} finally {
			busy = false;
		}
	}

	async function disable(e: SubmitEvent) {
		e.preventDefault();
		busy = true;
		try {
			const result = await authClient.twoFactor.disable({ password });

			if (result.error) {
				toast.error(errorMessage(result.error, 'Could not turn off two-factor'));
				return;
			}

			await refreshSession();
			toast.success('Two-factor authentication is off');
			reset();
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Could not turn off two-factor');
		} finally {
			busy = false;
		}
	}

	async function regenerate(e: SubmitEvent) {
		e.preventDefault();
		busy = true;
		try {
			const result = await authClient.twoFactor.generateBackupCodes({ password });

			if (result.error || !result.data) {
				toast.error(errorMessage(result.error, 'Could not generate new backup codes'));
				return;
			}

			backupCodes = result.data.backupCodes;
			password = '';
			// Back to the resting state, but keep `backupCodes` — the panel above the
			// buttons is the only place the new set is ever shown.
			step = 'idle';
			toast.success('New backup codes generated — the old ones no longer work');
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Could not generate new backup codes');
		} finally {
			busy = false;
		}
	}

	async function copyBackupCodes() {
		try {
			await navigator.clipboard.writeText(backupCodes.join('\n'));
			toast.success('Backup codes copied');
		} catch {
			toast.error('Could not copy — select and copy them manually');
		}
	}

	function downloadBackupCodes() {
		const blob = new Blob([`${backupCodes.join('\n')}\n`], { type: 'text/plain' });
		const url = URL.createObjectURL(blob);
		const link = document.createElement('a');
		link.href = url;
		link.download = 'aphex-backup-codes.txt';
		link.click();
		URL.revokeObjectURL(url);
	}
</script>

<Card.Root>
	<Card.Header class="flex flex-row items-start justify-between gap-4">
		<div class="space-y-1.5">
			<Card.Title>Two-Factor Authentication</Card.Title>
			<Card.Description>
				Ask for a code from an authenticator app on top of your password.
			</Card.Description>
		</div>
		{#if enabled !== undefined}
			<Badge variant={enabled ? 'default' : 'outline'} class="shrink-0 px-2.5 py-1 text-xs">
				{enabled ? 'On' : 'Off'}
			</Badge>
		{/if}
	</Card.Header>

	<Card.Content>
		{#if enabled === undefined}
			<div class="bg-muted/40 h-10 animate-pulse rounded-md"></div>
		{:else if enabled}
			<div class="space-y-4">
				<div class="flex items-start gap-3">
					<ShieldCheck class="mt-0.5 h-5 w-5 shrink-0 text-green-600 dark:text-green-500" />
					<p class="text-muted-foreground text-sm">
						Signing in on a new device asks for a six-digit code from your authenticator app.
					</p>
				</div>

				{#if backupCodes.length}
					{@render codesPanel()}
				{/if}

				{#if step === 'disable' || step === 'regenerate'}
					<form onsubmit={step === 'disable' ? disable : regenerate} class="space-y-3">
						<div class="space-y-2">
							<Label for="tf-password">Confirm your password</Label>
							<PasswordInput
								id="tf-password"
								bind:value={password}
								required
								autocomplete="current-password"
								disabled={busy}
							/>
							<p class="text-muted-foreground text-xs">
								{step === 'disable'
									? 'Turning this off removes your authenticator and all backup codes.'
									: 'Generating new codes immediately invalidates the previous set.'}
							</p>
						</div>
						<div class="flex gap-2">
							<Button
								type="submit"
								variant={step === 'disable' ? 'destructive' : 'default'}
								disabled={busy || !password}
							>
								{#if busy}
									Working…
								{:else if step === 'disable'}
									Turn off two-factor
								{:else}
									Generate new codes
								{/if}
							</Button>
							<Button type="button" variant="ghost" disabled={busy} onclick={reset}>Cancel</Button>
						</div>
					</form>
				{:else}
					<div class="flex flex-wrap gap-2">
						<Button
							type="button"
							variant="outline"
							onclick={() => {
								backupCodes = [];
								step = 'regenerate';
							}}
						>
							Generate new backup codes
						</Button>
						<Button
							type="button"
							variant="ghost"
							class="text-destructive hover:text-destructive"
							onclick={() => {
								backupCodes = [];
								step = 'disable';
							}}
						>
							<ShieldOff class="mr-2 h-4 w-4" />
							Turn off
						</Button>
					</div>
				{/if}
			</div>
		{:else if step === 'idle'}
			<div class="space-y-4">
				<p class="text-muted-foreground text-sm">
					You'll scan a QR code with an authenticator app — 1Password, Bitwarden, Google
					Authenticator, or any other — and enter a six-digit code to confirm it works.
				</p>
				<Button type="button" onclick={() => (step = 'password')}>
					<ShieldCheck class="mr-2 h-4 w-4" />
					Set up two-factor
				</Button>
			</div>
		{:else if step === 'password'}
			<form onsubmit={startEnrolment} class="space-y-3">
				<div class="space-y-2">
					<Label for="tf-password">Confirm your password</Label>
					<PasswordInput
						id="tf-password"
						bind:value={password}
						required
						autocomplete="current-password"
						disabled={busy}
					/>
				</div>
				<div class="flex gap-2">
					<Button type="submit" disabled={busy || !password}>
						{busy ? 'Working…' : 'Continue'}
					</Button>
					<Button type="button" variant="ghost" disabled={busy} onclick={reset}>Cancel</Button>
				</div>
			</form>
		{:else if step === 'verify'}
			<div class="space-y-5">
				<div class="flex flex-col gap-4 sm:flex-row sm:items-start">
					{#if qrDataUrl}
						<img
							src={qrDataUrl}
							alt="QR code for your authenticator app"
							class="bg-background h-[180px] w-[180px] shrink-0 rounded-lg border p-2"
						/>
					{/if}
					<div class="min-w-0 flex-1 space-y-2">
						<p class="text-sm font-medium">1. Scan this with your authenticator app</p>
						{#if totpSecret}
							<p class="text-muted-foreground text-xs">Can't scan? Enter this key manually:</p>
							<code class="bg-muted block rounded px-2 py-1.5 font-mono text-xs break-all">
								{totpSecret}
							</code>
						{/if}
					</div>
				</div>

				<div class="space-y-2">
					<p class="text-sm font-medium">2. Save your backup codes</p>
					{@render codesPanel()}
				</div>

				<form onsubmit={handleConfirm} class="space-y-3">
					<div class="space-y-2">
						<Label for="tf-code">3. Enter the six-digit code to finish</Label>
						<InputOTP.Root
							inputId="tf-code"
							maxlength={6}
							value={code}
							onValueChange={(next) => (code = next.replace(/\D/g, ''))}
							onComplete={confirmEnrolment}
							pasteTransformer={(text) => text.replace(/\D/g, '')}
							disabled={busy}
							inputmode="numeric"
							autocomplete="one-time-code"
						>
							{#snippet children({ cells })}
								<InputOTP.Group>
									{#each cells as cell, i (i)}
										<InputOTP.Slot {cell} />
									{/each}
								</InputOTP.Group>
							{/snippet}
						</InputOTP.Root>
					</div>
					<div class="flex gap-2">
						<Button type="submit" disabled={busy || code.trim().length !== 6}>
							{busy ? 'Verifying…' : 'Turn on two-factor'}
						</Button>
						<Button type="button" variant="ghost" disabled={busy} onclick={reset}>Cancel</Button>
					</div>
				</form>
			</div>
		{/if}
	</Card.Content>
</Card.Root>

{#snippet codesPanel()}
	<div class="bg-muted/40 space-y-3 rounded-lg border p-4">
		<p class="text-muted-foreground text-xs">
			Each code works once, and they're shown only now. Keep them somewhere you can reach without
			your phone.
		</p>
		<ul class="grid grid-cols-2 gap-1.5 font-mono text-sm sm:grid-cols-3">
			{#each backupCodes as backupCode (backupCode)}
				<li class="bg-background rounded border px-2 py-1 text-center">{backupCode}</li>
			{/each}
		</ul>
		<div class="flex flex-wrap gap-2">
			<Button type="button" variant="outline" size="sm" onclick={copyBackupCodes}>
				<Copy class="mr-2 h-3.5 w-3.5" />
				Copy
			</Button>
			<Button type="button" variant="outline" size="sm" onclick={downloadBackupCodes}>
				<Download class="mr-2 h-3.5 w-3.5" />
				Download
			</Button>
		</div>
	</div>
{/snippet}
