<script lang="ts">
	import PageRender from '$lib/components/PageRender.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const siteName = $derived(data.settings?.title || 'Aphex');
</script>

{#if data.page}
	<PageRender page={data.page} {siteName} signedIn={data.signedIn} />
{:else}
	<!--
		The state every new install sees at minute zero. Written to get you into
		the studio and back out again, not to apologise for being empty.
	-->
	<section class="container py-24">
		<div class="max-w-2xl">
			<h1 class="text-4xl font-semibold tracking-tight text-balance md:text-5xl">
				Your CMS and your site are the same app.
			</h1>
			<p class="text-muted-foreground mt-6 text-lg leading-relaxed">
				This page is server-rendered from the Local API — no HTTP round trip, no separate frontend
				to deploy. Create a page called <code class="bg-muted rounded px-1.5 py-0.5">home</code> and it
				appears here.
			</p>
		</div>

		<ol class="mt-14 grid gap-8 sm:grid-cols-3">
			<li>
				<p class="text-muted-foreground font-mono text-xs">01</p>
				<h2 class="mt-2 font-semibold">Open the studio</h2>
				<p class="text-muted-foreground mt-1 text-sm">
					<a href="/admin" class="underline underline-offset-4">/admin</a> — the first account you create
					becomes super admin.
				</p>
			</li>
			<li>
				<p class="text-muted-foreground font-mono text-xs">02</p>
				<h2 class="mt-2 font-semibold">Create a page</h2>
				<p class="text-muted-foreground mt-1 text-sm">
					Slug it <code class="bg-muted rounded px-1 py-0.5">home</code>, pick a hero, and stack a
					few blocks under it.
				</p>
			</li>
			<li>
				<p class="text-muted-foreground font-mono text-xs">03</p>
				<h2 class="mt-2 font-semibold">Fill in the chrome</h2>
				<p class="text-muted-foreground mt-1 text-sm">
					Header, Footer and Site Settings are singletons — one each, already waiting in the
					sidebar.
				</p>
			</li>
		</ol>

		<p class="text-muted-foreground mt-14 max-w-xl text-sm">
			The content model lives in <code class="bg-muted rounded px-1 py-0.5"
				>src/lib/schemaTypes/</code
			>, and the blocks a page can contain in
			<code class="bg-muted rounded px-1 py-0.5">schemaTypes/objects/blocks.ts</code>. Each has a
			matching component under <code class="bg-muted rounded px-1 py-0.5">src/lib/blocks/</code>.
		</p>
	</section>
{/if}
