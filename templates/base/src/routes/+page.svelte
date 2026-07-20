<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<main>
	<div class="header">
		<h1>Pages</h1>
		<a class="studio-btn" href="/admin">Go to Studio →</a>
	</div>
	<p>Content read from the CMS via the Local API — see <code>src/routes/+page.server.ts</code>.</p>

	{#if data.pages.length === 0}
		<div class="empty">
			<p>No published pages yet.</p>
			<p>
				Go to <a href="/admin">/admin</a>, create a <code>page</code> document, and publish it — it'll
				show up here.
			</p>
		</div>
	{:else}
		<ul>
			{#each data.pages as page (page.id)}
				<li>
					<h2>{page.title ?? 'Untitled'}</h2>
					{#if page.slug}<p class="slug">/{page.slug}</p>{/if}
					{#if page.body}<p>{page.body}</p>{/if}
				</li>
			{/each}
		</ul>
	{/if}
</main>

<style>
	main {
		max-width: 42rem;
		margin: 0 auto;
		padding: 3rem 1.5rem;
		font-family: system-ui, sans-serif;
		line-height: 1.6;
	}
	.header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
	}
	h1 {
		margin-bottom: 0.25rem;
	}
	.studio-btn {
		flex-shrink: 0;
		padding: 0.5rem 1rem;
		background: #18181b;
		color: #fff;
		border-radius: 0.5rem;
		text-decoration: none;
		font-size: 0.9rem;
		font-weight: 500;
	}
	.studio-btn:hover {
		background: #333;
	}
	.empty {
		margin-top: 2rem;
		padding: 1.5rem;
		border: 1px dashed #ccc;
		border-radius: 0.5rem;
	}
	ul {
		list-style: none;
		padding: 0;
		margin-top: 2rem;
	}
	li {
		padding: 1rem 0;
		border-bottom: 1px solid #eee;
	}
	h2 {
		margin: 0;
	}
	.slug {
		color: #888;
		font-size: 0.85rem;
		margin: 0.15rem 0;
	}
</style>
