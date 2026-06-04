<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		children: Snippet;
	}

	let { children }: Props = $props();
</script>

<div class="min-h-screen bg-white">
	<header class="border-b border-gray-100">
		<div class="mx-auto flex max-w-3xl items-center justify-between px-6 py-5">
			<a href="/blog" class="text-xl font-semibold tracking-tight text-gray-900">Blog</a>
			<nav class="flex items-center gap-6 text-sm text-gray-500">
				<a href="/" class="transition-colors hover:text-gray-900">Home</a>
				<a href="/admin" class="transition-colors hover:text-gray-900">Admin</a>
			</nav>
		</div>
	</header>

	<main>
		{@render children()}
	</main>

	<footer class="mt-24 border-t border-gray-100">
		<div class="mx-auto max-w-3xl px-6 py-8 text-sm text-gray-400">Powered by AphexCMS</div>
	</footer>
</div>
