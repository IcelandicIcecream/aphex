<script lang="ts">
	import { PortableText } from '@portabletext/svelte';
	import Callout from './Callout.svelte';
	import CodeBlock from './CodeBlock.svelte';
	import YouTube from './YouTube.svelte';
	import FootnoteMark from './FootnoteMark.svelte';
	import InternalLinkMark from './InternalLinkMark.svelte';

	let { data } = $props();

	const components = {
		types: {
			callout: Callout,
			codeBlock: CodeBlock,
			youtube: YouTube
		},
		marks: {
			footnote: FootnoteMark,
			internalLink: InternalLinkMark
		}
	};
</script>

<div
	class="mx-auto max-w-3xl overflow-y-auto p-8"
	style="height: 100%; -webkit-overflow-scrolling: touch;"
>
	<h1 class="mb-8 text-3xl font-bold">Portable Text Render Test</h1>

	{#if data.documents.length === 0}
		<p class="text-gray-500">
			No published simple_document documents found. Create and publish one with richtext content
			first.
		</p>
	{/if}

	{#each data.documents as doc}
		<div class="mb-12 rounded-lg border p-6">
			<span
				class="mb-2 inline-block rounded bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-600 uppercase"
				>{doc._collectionName || doc._meta?.type}</span
			>
			<h2 class="mb-2 text-xl font-semibold">{doc.title || doc.name || 'Untitled'}</h2>
			{#if doc.description}
				<p class="mb-4 text-sm text-gray-500">{doc.description}</p>
			{/if}

			{#if doc.content && Array.isArray(doc.content)}
				<div class="pt-render max-w-none">
					<PortableText value={doc.content} {components} />
				</div>
			{:else}
				<p class="text-sm text-gray-400 italic">No richtext content</p>
			{/if}

			<details class="mt-4">
				<summary class="cursor-pointer text-xs text-gray-400">Raw JSON</summary>
				<pre class="mt-2 overflow-auto rounded bg-gray-100 p-3 text-xs">{JSON.stringify(
						doc.content,
						null,
						2
					)}</pre>
			</details>
		</div>
	{/each}
</div>

<style>
	.pt-render :global(h1) {
		font-size: 2rem;
		font-weight: 700;
		margin: 0.75em 0 0.25em;
	}
	.pt-render :global(h2) {
		font-size: 1.5rem;
		font-weight: 600;
		margin: 0.75em 0 0.25em;
	}
	.pt-render :global(h3) {
		font-size: 1.25rem;
		font-weight: 600;
		margin: 0.75em 0 0.25em;
	}
	.pt-render :global(p) {
		margin: 0.5em 0;
	}
	.pt-render :global(ul) {
		list-style: disc;
		padding-left: 1.5rem;
		margin: 0.5em 0;
	}
	.pt-render :global(ol) {
		list-style: decimal;
		padding-left: 1.5rem;
		margin: 0.5em 0;
	}
	.pt-render :global(li) {
		margin: 0.25em 0;
	}
	.pt-render :global(blockquote) {
		border-left: 3px solid #ccc;
		padding-left: 1rem;
		margin: 0.75em 0;
		color: #666;
	}
	.pt-render :global(strong) {
		font-weight: 600;
	}
	.pt-render :global(em) {
		font-style: italic;
	}
	.pt-render :global(code) {
		background: #f3f4f6;
		border-radius: 3px;
		padding: 0.15em 0.3em;
		font-size: 0.85em;
	}
	.pt-render :global(a) {
		color: #2563eb;
		text-decoration: underline;
	}
</style>
