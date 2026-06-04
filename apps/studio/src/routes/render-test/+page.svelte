<script lang="ts">
	import { PortableText } from '@portabletext/svelte';
	import Callout from './Callout.svelte';
	import CodeBlock from './CodeBlock.svelte';
	import YouTube from './YouTube.svelte';
	import PortableTextImage from './PortableTextImage.svelte';
	import InlineNote from './InlineNote.svelte';
	import FootnoteMark from './FootnoteMark.svelte';
	import InternalLinkMark from './InternalLinkMark.svelte';
	import BlockHeading from './BlockHeading.svelte';
	import BlockNormal from './BlockNormal.svelte';
	import BlockQuote from './BlockQuote.svelte';
	import MarkCode from './MarkCode.svelte';
	import MarkLink from './MarkLink.svelte';
	import ListBullet from './ListBullet.svelte';
	import ListItem from './ListItem.svelte';

	let { data } = $props();

	const components = {
		types: {
			callout: Callout,
			codeBlock: CodeBlock,
			youtube: YouTube,
			image: PortableTextImage,
			inlineNote: InlineNote
		},
		marks: {
			footnote: FootnoteMark,
			internalLink: InternalLinkMark,
			code: MarkCode,
			link: MarkLink
		},
		block: {
			normal: BlockNormal,
			h1: BlockHeading,
			h2: BlockHeading,
			h3: BlockHeading,
			h4: BlockHeading,
			h5: BlockHeading,
			h6: BlockHeading,
			blockquote: BlockQuote
		},
		list: {
			bullet: ListBullet,
			number: ListBullet
		},
		listItem: {
			bullet: ListItem,
			number: ListItem
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
			No published simple_document documents found. Create and publish one with block content first.
		</p>
	{/if}

	{#each data.documents as doc}
		<div class="mb-12 rounded-lg border p-6">
			<span
				class="mb-2 inline-block rounded bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-600 uppercase"
				>{(doc as any)._collectionName || (doc as any)._meta?.type}</span
			>
			<h2 class="mb-2 text-xl font-semibold">{doc.title || (doc as any).name || 'Untitled'}</h2>
			{#if doc.description}
				<p class="mb-4 text-sm text-gray-500">{doc.description}</p>
			{/if}

			{#if doc.content && Array.isArray(doc.content)}
				<div class="max-w-none">
					<PortableText value={doc.content} {components} />
				</div>
			{:else}
				<p class="text-sm text-gray-400 italic">No block content</p>
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
