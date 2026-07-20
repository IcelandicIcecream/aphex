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
				class="h-8 w-8 fill-black dark:fill-white"
				viewBox="0 0 40 40"
				xmlns="http://www.w3.org/2000/svg"
			>
				<path
					d="M13.956 3.43635L18.1456 3.43635L20.1641 3.43712C20.1666 3.43712 20.169 3.43842 20.1703 3.44054C20.1715 3.44258 20.1737 3.44386 20.1761 3.44396C22.062 3.5162 23.7574 4.60042 24.6713 6.33551L39.9102 35.267C40.2138 35.8434 39.7924 36.539 39.1397 36.5389L37.0679 36.5386C36.7688 36.5385 36.4919 36.3839 36.3355 36.1298L33.3801 31.3267C33.3173 31.2248 33.234 31.1371 33.1354 31.0693L24.6492 25.2343C23.457 24.4143 22.9948 22.8169 23.5659 21.4933L24.9105 18.3752C25.0235 18.1132 25.0007 17.813 24.8495 17.5726L22.392 13.664C22.0261 13.0821 21.1578 13.1443 20.8721 13.773L17.1504 21.9631C16.9899 22.3162 17.0829 22.7318 17.3781 22.9805L23.2854 27.9596C23.4723 28.1172 23.5518 28.3711 23.488 28.6038C23.2148 29.5985 22.4862 30.3843 21.5288 30.7153L19.6562 31.3627C18.9307 31.6136 18.1203 31.4916 17.4756 31.0346L14.7977 29.1361C14.3844 28.8431 13.807 28.969 13.5495 29.4083L12.1813 31.7429L10.9914 33.8867C10.8996 34.052 10.7565 34.1831 10.5839 34.26L5.47512 36.5347C4.73679 36.8634 3.99524 36.0938 4.35059 35.3675L15.9857 11.5884C16.2933 10.9599 15.7701 10.2485 15.08 10.3567L5.31911 11.8868C4.98066 11.9398 4.64386 11.7884 4.46008 11.5005L0.164217 4.77114C-0.203334 4.19538 0.213947 3.43746 0.898521 3.43741L13.956 3.43635Z"
				/>
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
					class="h-8 w-8 fill-black dark:fill-white"
					viewBox="0 0 40 40"
					xmlns="http://www.w3.org/2000/svg"
				>
					<path
						d="M13.956 3.43635L18.1456 3.43635L20.1641 3.43712C20.1666 3.43712 20.169 3.43842 20.1703 3.44054C20.1715 3.44258 20.1737 3.44386 20.1761 3.44396C22.062 3.5162 23.7574 4.60042 24.6713 6.33551L39.9102 35.267C40.2138 35.8434 39.7924 36.539 39.1397 36.5389L37.0679 36.5386C36.7688 36.5385 36.4919 36.3839 36.3355 36.1298L33.3801 31.3267C33.3173 31.2248 33.234 31.1371 33.1354 31.0693L24.6492 25.2343C23.457 24.4143 22.9948 22.8169 23.5659 21.4933L24.9105 18.3752C25.0235 18.1132 25.0007 17.813 24.8495 17.5726L22.392 13.664C22.0261 13.0821 21.1578 13.1443 20.8721 13.773L17.1504 21.9631C16.9899 22.3162 17.0829 22.7318 17.3781 22.9805L23.2854 27.9596C23.4723 28.1172 23.5518 28.3711 23.488 28.6038C23.2148 29.5985 22.4862 30.3843 21.5288 30.7153L19.6562 31.3627C18.9307 31.6136 18.1203 31.4916 17.4756 31.0346L14.7977 29.1361C14.3844 28.8431 13.807 28.969 13.5495 29.4083L12.1813 31.7429L10.9914 33.8867C10.8996 34.052 10.7565 34.1831 10.5839 34.26L5.47512 36.5347C4.73679 36.8634 3.99524 36.0938 4.35059 35.3675L15.9857 11.5884C16.2933 10.9599 15.7701 10.2485 15.08 10.3567L5.31911 11.8868C4.98066 11.9398 4.64386 11.7884 4.46008 11.5005L0.164217 4.77114C-0.203334 4.19538 0.213947 3.43746 0.898521 3.43741L13.956 3.43635Z"
					/>
				</svg>
			</div>
		</div>
	</div>
{/if}
