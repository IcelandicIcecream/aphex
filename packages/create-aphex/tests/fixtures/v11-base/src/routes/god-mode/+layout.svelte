<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { ModeWatcher } from 'mode-watcher';
	import { authClient } from '$lib/auth-client';
	import { Button } from '@aphexcms/ui/shadcn/button';

	let { children, data } = $props();

	const basePath = '/god-mode';

	const tabs = [
		{ label: 'General', href: basePath },
		{ label: 'Organizations', href: `${basePath}/organizations` }
	];

	function isActive(href: string) {
		if (href === basePath) return page.url.pathname === basePath;
		return page.url.pathname.startsWith(href);
	}

	async function handleSignOut() {
		await authClient.signOut();
		goto('/login');
	}
</script>

<ModeWatcher />

{#if data.unauthorized}
	<div class="flex min-h-screen flex-col">
		<header class="flex items-center justify-between px-6 py-4">
			<svg
				class="h-8 w-8 text-black dark:text-white"
				viewBox="0 0 512 512"
				fill="none"
				xmlns="http://www.w3.org/2000/svg"
			>
				<path
					d="M260.616 105.082C260.626 105.082 260.635 105.087 260.64 105.096C260.645 105.104 260.653 105.109 260.663 105.109L274.644 105.112C282.748 105.114 290.156 109.573 294.103 116.823L445.131 394.268C445.878 395.639 445.62 397.342 444.501 398.436L415.541 426.751C413.86 428.394 411.074 427.947 410.002 425.862L382.043 371.473C381.842 371.081 381.567 370.731 381.235 370.441L289.225 290.294C285.241 286.824 283.96 281.084 286.099 276.289L304.656 234.68C305.138 233.599 305.041 232.349 304.398 231.358L276.521 188.455C275.032 186.164 271.601 186.408 270.436 188.888L225.858 283.804C225.177 285.254 225.568 286.978 226.806 287.987L282.077 333.058C283.735 334.41 284.439 336.626 283.859 338.669C281.377 347.419 274.822 354.323 266.285 357.18L248.665 363.075C242.243 365.224 235.145 364.2 229.469 360.306L201.046 340.806C199.372 339.658 197.071 340.181 196.05 341.943L162.258 400.225C161.65 401.273 161.627 402.558 162.197 403.623L203.526 480.844C205.176 483.928 201.757 487.262 198.717 485.534L95.0729 426.613C93.4445 425.688 92.8431 423.638 93.7113 421.972L228.285 163.793C229.541 161.383 227.691 158.532 224.982 158.704L30.3807 171.043C27.4433 171.23 25.6193 167.92 27.341 165.527L69.7919 106.539C70.4501 105.624 71.5077 105.082 72.6326 105.082L260.616 105.082Z"
					fill="currentColor"
				/>
				<circle cx="256" cy="256" r="225.28" stroke="currentColor" stroke-width="61.44" />
			</svg>
			<button
				class="text-muted-foreground hover:text-foreground text-sm transition-colors"
				onclick={handleSignOut}
			>
				{data.user.email}
			</button>
		</header>

		<main class="flex flex-1 flex-col items-center justify-center px-4 pb-24">
			<div class="flex flex-col items-center text-center">
				<h2 class="text-lg font-semibold">Access Denied</h2>
				<p class="text-muted-foreground mt-2 text-sm">
					You don't have permission to access God Mode. This area is restricted to super admins.
				</p>
				<Button class="mt-6" href="/admin">Back to Dashboard</Button>
			</div>
		</main>
	</div>
{:else}
	<div class="flex min-h-screen flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
		<div class="mx-auto w-full max-w-6xl">
			<!-- Mobile breadcrumb -->
			<div class="mb-2 md:hidden">
				<a
					href="/admin"
					class="text-muted-foreground hover:text-foreground text-sm transition-colors"
				>
					Dashboard
				</a>
				<span class="text-muted-foreground/50 mx-1 text-sm">/</span>
				<span class="text-sm">God Mode</span>
			</div>
			<div class="flex items-center justify-between gap-2">
				<div>
					<h1 class="text-3xl font-semibold">God Mode</h1>
					<p class="text-muted-foreground">Instance administration</p>
				</div>
				<a
					href="/admin"
					class="text-muted-foreground hover:text-foreground hidden text-sm transition-colors md:block"
				>
					Back to Dashboard
				</a>
			</div>
		</div>

		<!-- Mobile tabs -->
		<div class="mx-auto w-full max-w-6xl md:hidden">
			<div class="border-b">
				<div class="flex gap-4">
					{#each tabs as tab}
						<a
							href={tab.href}
							class="border-b-2 px-1 pb-2 text-sm font-medium transition-colors {isActive(tab.href)
								? 'border-primary text-primary'
								: 'text-muted-foreground hover:text-foreground border-transparent'}"
						>
							{tab.label}
						</a>
					{/each}
				</div>
			</div>
		</div>

		<div
			class="mx-auto grid w-full max-w-6xl items-start gap-6 md:grid-cols-[180px_1fr] lg:grid-cols-[250px_1fr]"
		>
			<!-- Desktop sidebar nav -->
			<nav class="text-muted-foreground hidden gap-1 text-sm md:grid">
				{#each tabs as tab}
					<a
						href={tab.href}
						class="rounded-md px-2 py-1.5 {isActive(tab.href)
							? 'text-primary bg-muted font-semibold'
							: ''}"
					>
						{tab.label}
					</a>
				{/each}
			</nav>
			<div>
				{@render children()}
			</div>
		</div>

		<!-- Footer branding -->
		<div class="mx-auto mt-auto pt-8">
			<p class="text-muted-foreground text-center text-xs">Aphex CMS - Built with SvelteKit</p>
			<div class="mt-2 flex justify-center opacity-20">
				<svg
					class="h-8 w-8 text-black dark:text-white"
					viewBox="0 0 512 512"
					fill="none"
					xmlns="http://www.w3.org/2000/svg"
				>
					<path
						d="M260.616 105.082C260.626 105.082 260.635 105.087 260.64 105.096C260.645 105.104 260.653 105.109 260.663 105.109L274.644 105.112C282.748 105.114 290.156 109.573 294.103 116.823L445.131 394.268C445.878 395.639 445.62 397.342 444.501 398.436L415.541 426.751C413.86 428.394 411.074 427.947 410.002 425.862L382.043 371.473C381.842 371.081 381.567 370.731 381.235 370.441L289.225 290.294C285.241 286.824 283.96 281.084 286.099 276.289L304.656 234.68C305.138 233.599 305.041 232.349 304.398 231.358L276.521 188.455C275.032 186.164 271.601 186.408 270.436 188.888L225.858 283.804C225.177 285.254 225.568 286.978 226.806 287.987L282.077 333.058C283.735 334.41 284.439 336.626 283.859 338.669C281.377 347.419 274.822 354.323 266.285 357.18L248.665 363.075C242.243 365.224 235.145 364.2 229.469 360.306L201.046 340.806C199.372 339.658 197.071 340.181 196.05 341.943L162.258 400.225C161.65 401.273 161.627 402.558 162.197 403.623L203.526 480.844C205.176 483.928 201.757 487.262 198.717 485.534L95.0729 426.613C93.4445 425.688 92.8431 423.638 93.7113 421.972L228.285 163.793C229.541 161.383 227.691 158.532 224.982 158.704L30.3807 171.043C27.4433 171.23 25.6193 167.92 27.341 165.527L69.7919 106.539C70.4501 105.624 71.5077 105.082 72.6326 105.082L260.616 105.082Z"
						fill="currentColor"
					/>
					<circle cx="256" cy="256" r="225.28" stroke="currentColor" stroke-width="61.44" />
				</svg>
			</div>
		</div>
	</div>
{/if}
