<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import Logo from '$lib/components/Logo.svelte';
	import { authClient } from '$lib/auth-client';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { Button } from '@aphexcms/ui/shadcn/button';
	import { Input } from '@aphexcms/ui/shadcn/input';
	import { Label } from '@aphexcms/ui/shadcn/label';
	import { Checkbox } from '@aphexcms/ui/shadcn/checkbox';
	import * as Card from '@aphexcms/ui/shadcn/card';
	import * as InputOTP from '@aphexcms/ui/shadcn/input-otp';

	let { data } = $props();

	// Three ways through the challenge: the rotating code from the authenticator,
	// a one-time code emailed on request, or one of the single-use backup codes
	// handed out at enrolment (for a lost phone).
	type Method = 'totp' | 'otp' | 'backup';

	/** Seconds before "Resend code" comes back, so a stuck user can't hammer the mailer. */
	const RESEND_COOLDOWN = 30;

	// Typed on `$state` rather than the binding: an annotated `let` with a literal
	// initialiser still gets narrowed to that literal by control-flow analysis, so
	// `method === 'backup'` below would read as a comparison that can never hold.
	//
	// Opens on whichever factor the instance actually offers. With TOTP switched
	// off, landing on an authenticator field nobody enrolled in would look broken.
	let method = $state<Method>(untrack(() => (data.totpAvailable ? 'totp' : 'otp')));
	let code = $state('');
	let trustDevice = $state(false);
	let error = $state('');
	let loading = $state(false);
	// Set when the challenge lapsed mid-form; the only useful action left is
	// starting over, so the code field is retired in favour of a link back.
	let expired = $state(false);
	let sendingOtp = $state(false);
	let otpSent = $state(false);
	let resendIn = $state(0);

	const callbackUrl = $derived(page.url.searchParams.get('callbackUrl'));

	// When email is the only factor the page opens on it, and nobody asked for a
	// code — so send one, or the screen is a six-digit field with no way to fill it.
	onMount(() => {
		if (method === 'otp') sendOtp();
	});

	// TOTP and emailed codes are always six digits; backup codes are longer and may
	// contain a separator, so only the six-digit fields are length-constrained.
	const canSubmit = $derived(
		method === 'backup' ? code.trim().length > 0 : code.trim().length === 6
	);

	/**
	 * Ask better-auth to mail a code. Kept separate from `verify` because it is the
	 * one action here that costs something real (an email), so it never happens as
	 * a side effect of switching tabs — only when asked for.
	 */
	async function sendOtp() {
		if (sendingOtp || resendIn > 0) return;

		error = '';
		sendingOtp = true;
		try {
			const result = await authClient.twoFactor.sendOtp();
			if (result.error) {
				if (result.error.code === 'INVALID_TWO_FACTOR_COOKIE') {
					expired = true;
					error = 'This sign-in attempt expired. Enter your password again to get a new code.';
				} else {
					error = result.error.message || 'Could not send the code. Try your authenticator app.';
				}
				return;
			}

			otpSent = true;
			resendIn = RESEND_COOLDOWN;
			const timer = setInterval(() => {
				resendIn -= 1;
				if (resendIn <= 0) clearInterval(timer);
			}, 1000);
		} catch (err) {
			error = err instanceof Error ? err.message : 'Could not send the code';
		} finally {
			sendingOtp = false;
		}
	}

	function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		verify();
	}

	async function verify() {
		// `onComplete` fires the moment the sixth digit lands, so this can be
		// re-entered while a request is already in flight.
		if (loading || !canSubmit) return;

		error = '';
		loading = true;

		try {
			const result =
				method === 'totp'
					? await authClient.twoFactor.verifyTotp({ code: code.trim(), trustDevice })
					: method === 'otp'
						? await authClient.twoFactor.verifyOtp({ code: code.trim(), trustDevice })
						: await authClient.twoFactor.verifyBackupCode({ code: code.trim(), trustDevice });

			if (result.error) {
				// The challenge itself is only good for ten minutes, and it can lapse
				// while this form sits open. better-auth reports that as "Invalid two
				// factor cookie", which reads like a broken browser rather than "you
				// took too long" — so it gets its own message and a way out.
				if (result.error.code === 'INVALID_TWO_FACTOR_COOKIE') {
					expired = true;
					error = 'This sign-in attempt expired. Enter your password again to get a new code.';
				} else if (method === 'totp') {
					error =
						result.error.message ||
						'That code is not valid. Codes expire every 30 seconds — try the current one.';
				} else if (method === 'otp') {
					error = result.error.message || 'That code is not valid, or it has expired.';
				} else {
					error =
						result.error.message || 'That backup code is not valid, or has already been used.';
				}
				code = '';
			} else {
				await goto(callbackUrl || '/admin');
			}
		} catch (err) {
			error = err instanceof Error ? err.message : 'An error occurred';
		} finally {
			loading = false;
		}
	}

	function switchMethod(next: Method) {
		method = next;
		code = '';
		error = '';
		// Switching *to* email sends the first code, since arriving at a six-digit
		// field with nothing in your inbox is a dead end. Coming back to it later
		// doesn't re-send — the cooldown gate in sendOtp handles that.
		if (next === 'otp' && !otpSent) sendOtp();
	}
</script>

<svelte:head>
	<title>Aphex CMS - Two-Factor Authentication</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="bg-muted/40 flex min-h-screen items-center justify-center px-4 py-12">
	<div class="w-full max-w-md">
		<Card.Root class="shadow-lg">
			<!-- Roomier than the card default (`px-6`) on both header and content, so the
			     six code boxes aren't crowded against the card edge. -->
			<Card.Header class="space-y-4 px-8">
				<!-- The lockup instead of a "Two-Factor Authentication" heading. Anyone who
				     reaches this screen just typed their password a second ago and knows
				     what they're doing here; the logo says *whose* account it is, which is
				     the part that isn't obvious — and the wordmark earns its place because
				     this can also be the first screen someone sees from an email link. -->
				<Logo variant="lockup" class="text-foreground mx-auto h-8 w-auto" />
				<div class="space-y-1.5 text-center">
					<Card.Title class="text-lg">Confirm it's you</Card.Title>
					<Card.Description class="text-sm">
						{#if method === 'totp'}
							Enter the 6-digit code from your authenticator app
						{:else if method === 'otp'}
							{otpSent ? 'We emailed you a 6-digit code' : 'Sending a code to your email…'}
						{:else}
							Enter one of the backup codes you saved
						{/if}
					</Card.Description>
				</div>
			</Card.Header>

			<Card.Content class="px-8">
				{#if expired}
					<div class="space-y-5">
						<div class="border-destructive/50 bg-destructive/10 rounded-lg border p-3">
							<p class="text-destructive text-sm font-medium">{error}</p>
						</div>
						<Button class="w-full" onclick={() => goto('/login')}>Back to Sign In</Button>
					</div>
				{:else}
					<!-- The gaps are deliberately uneven: `space-y-5` separates the distinct
					     groups (code, trust toggle, actions), while the three buttons sit in
					     their own tighter stack so they still read as one block. -->
					<form onsubmit={handleSubmit} class="space-y-5">
						{#if error}
							<div class="border-destructive/50 bg-destructive/10 rounded-lg border p-3">
								<p class="text-destructive text-sm font-medium">{error}</p>
							</div>
						{/if}

						<div class="space-y-2">
							<!--
								Visually hidden, not deleted: the card description above already
								says what to type, so a visible "Enter code" label just repeated
								it — but the field still needs a name for screen readers.
							-->
							<Label for="code" class="sr-only">
								{method === 'backup' ? 'Backup code' : 'Verification code'}
							</Label>
							{#if method !== 'backup'}
								<InputOTP.Root
									inputId="code"
									maxlength={6}
									value={code}
									onValueChange={(next) => (code = next.replace(/\D/g, ''))}
									onComplete={verify}
									pasteTransformer={(text) => text.replace(/\D/g, '')}
									disabled={loading}
									inputmode="numeric"
									autocomplete="one-time-code"
									class="w-full"
								>
									{#snippet children({ cells })}
										<!-- Full-bleed rather than the component's fixed-size default, so the
									     row lines up with the Verify button beneath it. `flex-1` sets a
									     zero flex-basis, which is what lets the slots outgrow their own
									     `size-11` width.

									     Split 3 + 3 because that's how the code is read aloud and how
									     authenticator apps print it — six evenly-spaced boxes give the
									     eye nothing to count against. -->
										<div class="flex w-full items-center gap-2">
											<InputOTP.Group class="flex-1">
												{#each cells.slice(0, 3) as cell, i (i)}
													<InputOTP.Slot {cell} class="h-12 flex-1" />
												{/each}
											</InputOTP.Group>
											<div class="bg-border h-px w-2 shrink-0"></div>
											<InputOTP.Group class="flex-1">
												{#each cells.slice(3) as cell, i (i)}
													<InputOTP.Slot {cell} class="h-12 flex-1" />
												{/each}
											</InputOTP.Group>
										</div>
									{/snippet}
								</InputOTP.Root>
								{#if method === 'otp'}
									<div class="flex items-center justify-between gap-2">
										<p class="text-muted-foreground text-xs">
											{otpSent ? 'The code expires in a few minutes.' : 'Sending…'}
										</p>
										<button
											type="button"
											class="text-xs underline underline-offset-2 disabled:no-underline disabled:opacity-60"
											disabled={sendingOtp || resendIn > 0}
											onclick={sendOtp}
										>
											{resendIn > 0 ? `Resend in ${resendIn}s` : 'Resend code'}
										</button>
									</div>
								{/if}
							{:else}
								<Input
									id="code"
									type="text"
									autocomplete="off"
									spellcheck={false}
									placeholder="xxxxx-xxxxx"
									bind:value={code}
									required
									disabled={loading}
									class="text-center font-mono"
								/>
								<p class="text-muted-foreground text-xs">
									Each backup code works once. Generate a new set from Account settings after you
									sign in.
								</p>
							{/if}
						</div>

						<div class="flex items-center gap-2">
							<Checkbox
								id="trust-device"
								checked={trustDevice}
								onCheckedChange={(checked) => (trustDevice = checked === true)}
								disabled={loading}
							/>
							<Label for="trust-device" class="text-sm font-normal">
								Trust this device for 30 days
							</Label>
						</div>

						<Button type="submit" class="w-full" disabled={loading || !canSubmit}>
							{loading ? 'Verifying…' : 'Verify'}
						</Button>

						<!--
							The alternatives are demoted to a labelled row of text links rather
							than a stack of full-width buttons. Three buttons carrying the same
							visual weight as Verify turned the card into a menu, when only one of
							these is the thing you came here to do — the rest are for when it
							didn't work.

							Listed rather than cycled through: with three methods a single toggle
							can only ever reach one of them, and which one would depend on where
							you already were.
						-->
						<div class="space-y-3 border-t pt-4">
							<p class="text-muted-foreground text-center text-xs">Can't use that?</p>
							<div
								class="text-muted-foreground flex flex-wrap justify-center gap-x-4 gap-y-2 text-sm"
							>
								{#if data.totpAvailable && method !== 'totp'}
									<button
										type="button"
										class="hover:text-foreground underline underline-offset-4 disabled:opacity-50"
										disabled={loading}
										onclick={() => switchMethod('totp')}
									>
										Use authenticator app
									</button>
								{/if}

								{#if data.otpAvailable && method !== 'otp'}
									<button
										type="button"
										class="hover:text-foreground underline underline-offset-4 disabled:opacity-50"
										disabled={loading}
										onclick={() => switchMethod('otp')}
									>
										Email me a code
									</button>
								{/if}

								{#if method !== 'backup'}
									<button
										type="button"
										class="hover:text-foreground underline underline-offset-4 disabled:opacity-50"
										disabled={loading}
										onclick={() => switchMethod('backup')}
									>
										Use a backup code
									</button>
								{/if}
							</div>
						</div>
					</form>
				{/if}
			</Card.Content>
		</Card.Root>

		<!-- Leaving is a footer concern, not a step in the flow, so it sits outside
		     the card with the other ambient text. -->
		<div class="text-muted-foreground mt-6 flex flex-col items-center gap-2 text-xs">
			<button
				type="button"
				class="hover:text-foreground underline underline-offset-4"
				onclick={() => goto('/login')}
			>
				← Back to sign in
			</button>
			<p>Aphex CMS</p>
		</div>
	</div>
</div>
