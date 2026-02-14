<script lang="ts">
	import { authClient } from '$lib/auth-client';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { Button } from '@aphexcms/ui/shadcn/button';
	import { Input } from '@aphexcms/ui/shadcn/input';
	import { Label } from '@aphexcms/ui/shadcn/label';
	import * as Card from '@aphexcms/ui/shadcn/card';
	import { resolve } from '$app/paths';

	type Mode = 'signin' | 'signup' | 'reset-password';

	let email = $state('');
	let password = $state('');
	let error = $state('');
	let loading = $state(false);
	let mode: Mode = $state('signin');
	let resetSuccess = $state('');
	let signupSuccess = $state(false);
	let devResetUrl = $state(''); // Store dev reset URL separately

	// Get callback URL for post-login redirect (used by invite flow)
	let callbackUrl = $derived(page.url.searchParams.get('callbackUrl'));

	// Error messages mapping
	const errorMessages: Record<string, string> = {
		session_expired: 'Your session has expired. Please log in again.',
		no_organization:
			'No organization found. Please contact an administrator to be invited to an organization.',
		unauthorized: 'You do not have permission to access this resource.',
		kicked_from_org:
			'Your access to the organization has been revoked. Please contact your administrator.',
		no_session: 'Please log in to continue.'
	};

	// Read error from URL reactively (Svelte 5)
	$effect(() => {
		const errorCode = page.url.searchParams.get('error');
		if (errorCode && errorMessages[errorCode]) {
			error = errorMessages[errorCode];
			// Clear error from URL
			const url = new URL(window.location.href);
			url.searchParams.delete('error');
			window.history.replaceState({}, '', url);
		}
	});

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		error = '';
		resetSuccess = '';
		loading = true;

		try {
			if (mode === 'reset-password') {
				const response = await fetch('/api/user/request-password-reset', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({
						email,
						redirectTo: `${window.location.origin}/reset-password`
					})
				});

				const result = await response.json();

				if (!response.ok || result.error) {
					error = result.message || 'Failed to send reset email';
				} else {
					if (result.resetUrl) {
						// In development, show the reset URL for testing
						devResetUrl = result.resetUrl;
						resetSuccess = `✨ Dev Mode: Reset link generated (check below)`;
					} else {
						resetSuccess = 'Check your email for the password reset link';
					}
				}
			} else if (mode === 'signin') {
				const result = await authClient.signIn.email({
					email,
					password
				});

				if (result.error) {
					if (result.error.code === 'EMAIL_NOT_VERIFIED') {
						error = 'Please verify your email address before signing in. Check your inbox for a verification link.';
					} else {
						error = result.error.message || 'Failed to sign in';
					}
				} else {
					goto(callbackUrl || '/admin');
				}
			} else {
				// mode === 'signup'
				const result = await authClient.signUp.email({
					email,
					password,
					name: email.split('@')[0] // Use email username as name
				});

				if (result.error) {
					error = result.error.message || 'Failed to sign up';
				} else {
					// Email verification is enabled — show confirmation instead of redirecting
					signupSuccess = true;
				}
			}
		} catch (err) {
			error = err instanceof Error ? err.message : 'An error occurred';
		} finally {
			loading = false;
		}
	}

	function setMode(newMode: Mode) {
		mode = newMode;
		error = '';
		resetSuccess = '';
	}
</script>

<svelte:head>
	<title>{mode === 'signin' ? 'Aphex CMS - Sign In' : 'Aphex CMS - Sign Up'}</title>
	<meta
		name="description"
		content={mode === 'signin'
			? 'Sign in to your Aphex CMS dashboard to manage your content and organizations.'
			: 'Create a new account to get started with Aphex CMS and manage your content.'}
	/>
</svelte:head>

<div class="bg-muted/40 flex min-h-screen items-center justify-center px-4 py-12">
	<div class="w-full max-w-md">
		<Card.Root class="shadow-lg">
			<Card.Header class="space-y-1">
				<Card.Title class="text-center text-2xl font-bold">
					{mode === 'reset-password'
						? 'Reset Password'
						: mode === 'signin'
							? 'Sign In'
							: 'Create Account'}
				</Card.Title>
				<Card.Description class="text-center">
					{mode === 'reset-password'
						? 'Enter your email to receive a reset link'
						: mode === 'signin'
							? 'Access your CMS dashboard'
							: 'Get started with Aphex CMS'}
				</Card.Description>
			</Card.Header>

			<Card.Content>
				{#if signupSuccess}
					<div class="space-y-4">
						<div class="rounded-lg border border-green-500/50 bg-green-500/10 p-4 text-center">
							<p class="font-medium text-green-700 dark:text-green-400">
								Account created! Check your email to verify your address.
							</p>
							<p class="text-muted-foreground mt-2 text-sm">
								We sent a verification link to <strong>{email}</strong>
							</p>
						</div>
						<Button variant="outline" class="w-full" onclick={() => { signupSuccess = false; setMode('signin'); }}>
							Back to Sign In
						</Button>
					</div>
				{:else}
				<form onsubmit={handleSubmit} class="space-y-4">
					<!-- Success Alert -->
					{#if resetSuccess}
						<div class="rounded-lg border border-green-500/50 bg-green-500/10 p-3">
							<p class="text-sm font-medium text-green-700 dark:text-green-400">{resetSuccess}</p>
						</div>
					{/if}

					<!-- Dev-only Reset URL -->
					{#if devResetUrl}
						<div class="space-y-2 rounded-lg border border-blue-500/50 bg-blue-500/10 p-3">
							<p class="font-mono text-xs text-blue-700 dark:text-blue-400">
								DEV MODE - Reset URL:
							</p>
							<div class="rounded border bg-white p-2 dark:bg-gray-900">
								<code class="select-all break-all text-xs text-blue-600 dark:text-blue-400"
									>{devResetUrl}</code
								>
							</div>
							<button
								type="button"
								class="text-xs text-blue-600 hover:underline dark:text-blue-400"
								onclick={() => {
									navigator.clipboard.writeText(devResetUrl);
								}}
							>
								📋 Copy to clipboard
							</button>
						</div>
					{/if}

					<!-- Error Alert -->
					{#if error}
						<div class="border-destructive/50 bg-destructive/10 rounded-lg border p-3">
							<p class="text-destructive text-sm font-medium">{error}</p>
						</div>
					{/if}

					<!-- Email Field -->
					<div class="space-y-2">
						<Label for="email">Email</Label>
						<Input
							id="email"
							type="email"
							placeholder="you@example.com"
							bind:value={email}
							required
							autocomplete="email"
						/>
					</div>

					<!-- Password Field (hidden in reset mode) -->
					{#if mode !== 'reset-password'}
						<div class="space-y-2">
							<div class="flex items-center justify-between">
								<Label for="password">Password</Label>
								{#if mode === 'signin'}
									<button
										type="button"
										class="text-primary text-xs hover:underline"
										onclick={() => setMode('reset-password')}
									>
										Forgot password?
									</button>
								{/if}
							</div>
							<Input
								id="password"
								type="password"
								placeholder="••••••••"
								bind:value={password}
								required
								autocomplete={mode === 'signin' ? 'current-password' : 'new-password'}
							/>
							{#if mode === 'signup'}
								<p class="text-muted-foreground text-xs">Must be at least 8 characters long</p>
							{/if}
						</div>
					{/if}

					<!-- Submit Button -->
					<Button type="submit" class="w-full" disabled={loading}>
						{#if loading}
							<svg
								class="mr-2 h-4 w-4 animate-spin"
								xmlns="http://www.w3.org/2000/svg"
								fill="none"
								viewBox="0 0 24 24"
							>
								<circle
									class="opacity-25"
									cx="12"
									cy="12"
									r="10"
									stroke="currentColor"
									stroke-width="4"
								></circle>
								<path
									class="opacity-75"
									fill="currentColor"
									d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
								></path>
							</svg>
						{/if}
						{mode === 'reset-password'
							? 'Send Reset Link'
							: mode === 'signin'
								? 'Sign In'
								: 'Sign Up'}
					</Button>

					<!-- Back to Sign In (in reset mode) -->
					{#if mode === 'reset-password'}
						<Button type="button" variant="ghost" class="w-full" onclick={() => setMode('signin')}>
							← Back to Sign In
						</Button>
					{/if}
				</form>
				{/if}
			</Card.Content>

			<Card.Footer class="flex flex-col space-y-4">
				{#if !signupSuccess && mode !== 'reset-password'}
					<div class="relative">
						<div class="absolute inset-0 flex items-center">
							<span class="w-full border-t"></span>
						</div>
						<div class="relative flex justify-center text-xs uppercase">
							<span class="bg-card text-muted-foreground px-2">
								{mode === 'signin' ? 'New to Aphex?' : 'Already have an account?'}
							</span>
						</div>
					</div>

					<Button
						type="button"
						variant="outline"
						class="w-full"
						onclick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
					>
						{mode === 'signin' ? 'Create an account' : 'Sign in instead'}
					</Button>
				{/if}
			</Card.Footer>
		</Card.Root>

		<!-- Footer -->
		<p class="text-muted-foreground mt-6 text-center text-xs">Aphex CMS - Built with SvelteKit</p>

		<!-- Footer Logo -->
		<div class="mt-2 flex justify-center opacity-20">
			<svg
				class="h-8 w-8 fill-black dark:fill-white"
				version="1.1"
				xmlns="http://www.w3.org/2000/svg"
				viewBox="0 0 512 512"
			>
				<path
					d="M0 0 C17.1474496 14.16905616 25.92496627 35.45820085 34.56640625 55.4140625 C35.34334316 57.19720923 36.12053079 58.98024674 36.89794922 60.76318359 C51.78722595 94.97195072 66.32335778 129.32882671 80.31640625 163.9140625 C80.6444928 164.72450012 80.97257935 165.53493774 81.31060791 166.36993408 C99.98913061 212.53216334 117.78569191 259.01293728 134.00390625 306.1015625 C134.36190811 307.13669983 134.36190811 307.13669983 134.72714233 308.19274902 C137.32766526 315.72906515 139.80262285 323.3004011 142.1171875 330.9296875 C142.43800545 331.95940926 142.43800545 331.95940926 142.76530457 333.00993347 C145.2565569 341.39135358 146.09964488 351.05219488 142.44140625 359.23046875 C139.92789443 362.992009 136.34564423 365.89944351 132.31640625 367.9140625 C124.8558052 368.61421121 118.36839373 368.62364314 112.31640625 363.9140625 C105.53664487 356.69699976 100.652558 348.68983785 95.94140625 340.0390625 C90.47619491 330.29913602 84.93335438 322.05287151 77.31640625 313.9140625 C75.27331056 311.57880549 73.26394666 309.2152832 71.25390625 306.8515625 C70.24519648 305.67152884 69.23608749 304.49183631 68.2265625 303.3125 C67.73816895 302.74112305 67.24977539 302.16974609 66.74658203 301.58105469 C65.40017275 300.01169952 64.04454028 298.45078423 62.6875 296.890625 C48.81582552 280.69615056 38.44623629 261.89870442 27.89111328 243.45849609 C-8.42360388 178.69858879 -8.42360388 178.69858879 -68.08203125 137.78515625 C-79.11186673 135.11741947 -89.899608 136.09230489 -99.68359375 141.9140625 C-115.46806791 152.47947666 -122.3076261 172.13261849 -126.43359375 189.7890625 C-126.73185059 191.06136719 -126.73185059 191.06136719 -127.03613281 192.359375 C-130.16760015 206.71148601 -131.06828893 221.08194412 -130.99609375 235.7265625 C-130.9939386 236.51966827 -130.99178345 237.31277405 -130.98956299 238.12991333 C-131.31394288 266.6844263 -131.31394288 266.6844263 -123.23828125 293.5859375 C-112.95312656 315.60340432 -111.26097095 345.34400812 -119.5 368.0390625 C-124.86779615 381.07766965 -132.78250397 390.79435644 -145.68359375 396.9140625 C-155.27731384 400.41943083 -164.20346687 401.56551213 -174.37109375 401.4140625 C-176.32958252 401.39702271 -176.32958252 401.39702271 -178.32763672 401.37963867 C-197.70054192 400.99323331 -215.16231823 397.0095896 -230.68359375 384.9140625 C-231.37066406 384.41519531 -232.05773437 383.91632813 -232.765625 383.40234375 C-244.80767188 373.97296976 -251.15090869 358.63090674 -253.68359375 343.9140625 C-253.9270261 339.66653687 -253.91464574 335.41789154 -253.93359375 331.1640625 C-253.96453125 329.45089844 -253.96453125 329.45089844 -253.99609375 327.703125 C-254.00125 326.58164062 -254.00640625 325.46015625 -254.01171875 324.3046875 C-254.02106445 323.29438477 -254.03041016 322.28408203 -254.04003906 321.24316406 C-253.25260131 313.88871121 -250.02140677 307.08532381 -247.0859375 300.359375 C-246.73986954 299.55749252 -246.39380157 298.75561005 -246.0372467 297.9294281 C-245.29136983 296.20150738 -244.54396437 294.47424582 -243.79516602 292.74758911 C-241.75797546 288.04789133 -239.73451175 283.34229198 -237.7109375 278.63671875 C-237.0834108 277.17808662 -237.0834108 277.17808662 -236.44320679 275.68998718 C-232.12759637 265.64489937 -227.89599701 255.56528394 -223.68359375 245.4765625 C-223.31303864 244.58933502 -222.94248352 243.70210754 -222.56069946 242.78799438 C-221.05624911 239.1852842 -219.55230259 235.58236459 -218.04930115 231.97904968 C-215.45620988 225.7624217 -212.85713855 219.54832537 -210.25390625 213.3359375 C-199.87599396 188.56875674 -189.53860671 163.78483086 -179.21582031 138.99462891 C-176.70326253 132.96093438 -174.18966694 126.92767262 -171.67578125 120.89453125 C-171.2632309 119.90436005 -170.85068054 118.91418884 -170.42562866 117.89401245 C-168.35461551 112.92351005 -166.28304289 107.95324201 -164.21044922 102.98339844 C-160.33953189 93.69973915 -156.47385511 84.41400336 -152.62658691 75.12051392 C-150.82992691 70.78139762 -149.03030349 66.44351312 -147.23046875 62.10571289 C-146.38199036 60.05847127 -145.53492768 58.01064218 -144.68945312 55.9621582 C-140.72547669 46.35880091 -136.72273166 36.78723512 -132.3203125 27.375 C-132.00310242 26.69433975 -131.68589233 26.0136795 -131.35906982 25.31239319 C-123.25124472 8.26154126 -109.39227096 -6.16254505 -91.68359375 -13.0859375 C-59.99340229 -22.6620319 -26.67593546 -20.59334511 0 0 Z "
					transform="translate(308.68359375,64.0859375)"
				/>
				<path
					d="M0 0 C18.24717952 9.79342293 31.4582424 26.28742033 37.6171875 45.97265625 C39.90862161 58.10790422 38.62948747 76.77026254 32.3125 87.5625 C31.23887442 89.06398132 30.13305826 90.54284625 29 92 C28.04867187 93.39798828 28.04867187 93.39798828 27.078125 94.82421875 C22.05477616 102.1158627 16.59613089 108.96607145 8 112 C-4.55244493 113.74100692 -12.66496084 107.03937869 -22.140625 99.87890625 C-25.14482573 97.61370274 -28.2068393 95.46853473 -31.33056641 93.37231445 C-44.35072813 84.61921656 -53.55106508 73.69367426 -57 58 C-59.27762162 41.63399726 -53.36243485 19.43955677 -44.1875 5.9375 C-32.8352893 -8.66127096 -15.43371672 -7.37348527 0 0 Z "
					transform="translate(254,240)"
				/>
			</svg>
		</div>
	</div>
</div>
