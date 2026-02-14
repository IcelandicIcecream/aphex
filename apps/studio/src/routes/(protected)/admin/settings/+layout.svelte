<script lang="ts">
	import { page } from '$app/state';

	let { children } = $props();

	const basePath = '/admin/settings';

	const orgTabs = [
		{ label: 'General', href: basePath },
		{ label: 'Members', href: `${basePath}/members` }
	];

	const accountTabs = [
		{ label: 'Profile', href: `${basePath}/account` },
		{ label: 'API Keys', href: `${basePath}/api-keys` }
	];

	function isActive(href: string) {
		if (href === basePath) return page.url.pathname === basePath;
		return page.url.pathname.startsWith(href);
	}
</script>

<div class="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
	<div class="mx-auto grid w-full max-w-6xl gap-2">
		<h1 class="text-3xl font-semibold">Settings</h1>
		<p class="text-muted-foreground">Manage your organization and account</p>
	</div>
	<div
		class="mx-auto grid w-full max-w-6xl items-start gap-6 md:grid-cols-[180px_1fr] lg:grid-cols-[250px_1fr]"
	>
		<nav class="grid gap-1 text-sm text-muted-foreground">
			<p
				class="text-muted-foreground/60 px-1 pb-1 pt-2 text-xs font-semibold uppercase tracking-wider"
			>
				Organization
			</p>
			{#each orgTabs as tab}
				<a
					href={tab.href}
					class="rounded-md px-2 py-1.5 {isActive(tab.href)
						? 'text-primary bg-muted font-semibold'
						: ''}"
				>
					{tab.label}
				</a>
			{/each}
			<p
				class="text-muted-foreground/60 px-1 pb-1 pt-4 text-xs font-semibold uppercase tracking-wider"
			>
				Account
			</p>
			{#each accountTabs as tab}
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
		{@render children()}
	</div>
</div>
