<script lang="ts">
	import { page } from '$app/state';
	import { ModeWatcher } from 'mode-watcher';

	let { children } = $props();

	const basePath = '/god-mode';

	const tabs = [
		{ label: 'General', href: basePath },
		{ label: 'Organizations', href: `${basePath}/organizations` }
	];

	function isActive(href: string) {
		if (href === basePath) return page.url.pathname === basePath;
		return page.url.pathname.startsWith(href);
	}
</script>

<ModeWatcher />
<div class="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
	<div class="mx-auto grid w-full max-w-6xl gap-2">
		<h1 class="text-3xl font-semibold">God Mode</h1>
		<p class="text-muted-foreground">Instance administration</p>
	</div>

	<div
		class="mx-auto grid w-full max-w-6xl items-start gap-6 md:grid-cols-[180px_1fr] lg:grid-cols-[250px_1fr]"
	>
		<nav class="grid gap-1 text-sm text-muted-foreground">
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
			<div class="border-t my-2"></div>
			<a href="/admin" class="rounded-md px-2 py-1.5 text-muted-foreground/60 hover:text-muted-foreground">
				Back to Dashboard
			</a>
		</nav>
		<div>
			{@render children()}
		</div>
	</div>
</div>
