<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { Editor } from '@tiptap/core';
	import { StarterKit } from '@tiptap/starter-kit';
	import Link from '@tiptap/extension-link';
	import Underline from '@tiptap/extension-underline';
	import {
		Bold,
		Italic,
		Underline as UnderlineIcon,
		Strikethrough,
		Code,
		List,
		ListOrdered,
		Heading1,
		Heading2,
		Heading3,
		Quote,
		Link as LinkIcon,
		Unlink,
		Undo2,
		Redo2
	} from '@lucide/svelte';
	import {
		tiptapToPortableText,
		portableTextToTiptap,
		type PortableTextValue
	} from './portable-text-serializer';
	import type { RichtextField as RichtextFieldType } from '../../../../types/schemas';

	interface Props {
		field: RichtextFieldType;
		value: PortableTextValue | null | undefined;
		onUpdate: (value: PortableTextValue) => void;
		validationClasses?: string;
		readonly?: boolean;
	}

	let { field, value, onUpdate, validationClasses = '', readonly = false }: Props = $props();

	let element = $state<HTMLElement>();
	let editor = $state<Editor | null>(null);
	let skipNextUpdate = false;

	const styles = field.options?.styles ?? ['normal', 'h1', 'h2', 'h3', 'blockquote'];
	const decorators = field.options?.decorators ?? [
		'strong',
		'em',
		'underline',
		'strike-through',
		'code'
	];
	const lists = field.options?.lists ?? ['bullet', 'number'];
	const marks = field.options?.marks ?? ['link'];

	const hasDecorator = (d: string) => decorators.includes(d as any);
	const hasList = (l: string) => lists.includes(l as any);
	const hasMark = (m: string) => marks.includes(m as any);
	const hasStyle = (s: string) => styles.includes(s as any);

	onMount(() => {
		if (!element) return;

		const tiptapDoc = portableTextToTiptap(value || []);

		editor = new Editor({
			element,
			editable: !readonly,
			extensions: [
				StarterKit.configure({
					heading: {
						levels: [1, 2, 3, 4, 5, 6].filter((l) => hasStyle(`h${l}`)) as any
					},
					bulletList: hasList('bullet') ? {} : false,
					orderedList: hasList('number') ? {} : false,
					blockquote: hasStyle('blockquote') ? {} : false,
					bold: hasDecorator('strong') ? {} : false,
					italic: hasDecorator('em') ? {} : false,
					strike: hasDecorator('strike-through') ? {} : false,
					code: hasDecorator('code') ? {} : false
				}),
				...(hasDecorator('underline') ? [Underline] : []),
				...(hasMark('link')
					? [
							Link.configure({
								openOnClick: false,
								HTMLAttributes: { class: 'richtext-link' }
							})
						]
					: [])
			],
			content: tiptapDoc,
			onUpdate: ({ editor: e }) => {
				if (skipNextUpdate) {
					skipNextUpdate = false;
					return;
				}
				const json = e.getJSON();
				const pt = tiptapToPortableText(json);
				onUpdate(pt);
			},
			onTransaction: () => {
				editor = editor;
			},
			injectCSS: false
		});
	});

	onDestroy(() => {
		editor?.destroy();
	});

	$effect(() => {
		if (!editor || !value) return;
		const currentPt = tiptapToPortableText(editor.getJSON());
		if (JSON.stringify(currentPt) !== JSON.stringify(value)) {
			skipNextUpdate = true;
			const tiptapDoc = portableTextToTiptap(value);
			editor.commands.setContent(tiptapDoc);
		}
	});

	function toggleLink() {
		if (!editor) return;
		if (editor.isActive('link')) {
			editor.chain().focus().unsetLink().run();
			return;
		}
		const url = window.prompt('URL');
		if (url) {
			editor.chain().focus().setLink({ href: url }).run();
		}
	}
</script>

<div class="richtext-editor {validationClasses}">
	{#if editor && !readonly}
		<div class="border-rule bg-muted/30 flex flex-wrap items-center gap-0.5 border-b px-2 py-1.5">
			{#if hasStyle('h1') || hasStyle('h2') || hasStyle('h3')}
				{#if hasStyle('h1')}
					<button
						type="button"
						class="rounded p-1.5 transition-colors {editor.isActive('heading', { level: 1 })
							? 'bg-muted text-foreground'
							: 'text-muted-foreground hover:bg-muted hover:text-foreground'}"
						onclick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
						title="Heading 1"
					>
						<Heading1 class="h-4 w-4" />
					</button>
				{/if}
				{#if hasStyle('h2')}
					<button
						type="button"
						class="rounded p-1.5 transition-colors {editor.isActive('heading', { level: 2 })
							? 'bg-muted text-foreground'
							: 'text-muted-foreground hover:bg-muted hover:text-foreground'}"
						onclick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
						title="Heading 2"
					>
						<Heading2 class="h-4 w-4" />
					</button>
				{/if}
				{#if hasStyle('h3')}
					<button
						type="button"
						class="rounded p-1.5 transition-colors {editor.isActive('heading', { level: 3 })
							? 'bg-muted text-foreground'
							: 'text-muted-foreground hover:bg-muted hover:text-foreground'}"
						onclick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
						title="Heading 3"
					>
						<Heading3 class="h-4 w-4" />
					</button>
				{/if}
				<div class="bg-border mx-1 h-4 w-px"></div>
			{/if}

			{#if hasDecorator('strong')}
				<button
					type="button"
					class="rounded p-1.5 transition-colors {editor.isActive('bold')
						? 'bg-muted text-foreground'
						: 'text-muted-foreground hover:bg-muted hover:text-foreground'}"
					onclick={() => editor?.chain().focus().toggleBold().run()}
					title="Bold (⌘B)"
				>
					<Bold class="h-4 w-4" />
				</button>
			{/if}
			{#if hasDecorator('em')}
				<button
					type="button"
					class="rounded p-1.5 transition-colors {editor.isActive('italic')
						? 'bg-muted text-foreground'
						: 'text-muted-foreground hover:bg-muted hover:text-foreground'}"
					onclick={() => editor?.chain().focus().toggleItalic().run()}
					title="Italic (⌘I)"
				>
					<Italic class="h-4 w-4" />
				</button>
			{/if}
			{#if hasDecorator('underline')}
				<button
					type="button"
					class="rounded p-1.5 transition-colors {editor.isActive('underline')
						? 'bg-muted text-foreground'
						: 'text-muted-foreground hover:bg-muted hover:text-foreground'}"
					onclick={() => editor?.chain().focus().toggleUnderline().run()}
					title="Underline (⌘U)"
				>
					<UnderlineIcon class="h-4 w-4" />
				</button>
			{/if}
			{#if hasDecorator('strike-through')}
				<button
					type="button"
					class="rounded p-1.5 transition-colors {editor.isActive('strike')
						? 'bg-muted text-foreground'
						: 'text-muted-foreground hover:bg-muted hover:text-foreground'}"
					onclick={() => editor?.chain().focus().toggleStrike().run()}
					title="Strikethrough"
				>
					<Strikethrough class="h-4 w-4" />
				</button>
			{/if}
			{#if hasDecorator('code')}
				<button
					type="button"
					class="rounded p-1.5 transition-colors {editor.isActive('code')
						? 'bg-muted text-foreground'
						: 'text-muted-foreground hover:bg-muted hover:text-foreground'}"
					onclick={() => editor?.chain().focus().toggleCode().run()}
					title="Inline code"
				>
					<Code class="h-4 w-4" />
				</button>
			{/if}

			{#if (hasDecorator('strong') || hasDecorator('em')) && (hasList('bullet') || hasList('number') || hasStyle('blockquote') || hasMark('link'))}
				<div class="bg-border mx-1 h-4 w-px"></div>
			{/if}

			{#if hasList('bullet')}
				<button
					type="button"
					class="rounded p-1.5 transition-colors {editor.isActive('bulletList')
						? 'bg-muted text-foreground'
						: 'text-muted-foreground hover:bg-muted hover:text-foreground'}"
					onclick={() => editor?.chain().focus().toggleBulletList().run()}
					title="Bullet list"
				>
					<List class="h-4 w-4" />
				</button>
			{/if}
			{#if hasList('number')}
				<button
					type="button"
					class="rounded p-1.5 transition-colors {editor.isActive('orderedList')
						? 'bg-muted text-foreground'
						: 'text-muted-foreground hover:bg-muted hover:text-foreground'}"
					onclick={() => editor?.chain().focus().toggleOrderedList().run()}
					title="Numbered list"
				>
					<ListOrdered class="h-4 w-4" />
				</button>
			{/if}
			{#if hasStyle('blockquote')}
				<button
					type="button"
					class="rounded p-1.5 transition-colors {editor.isActive('blockquote')
						? 'bg-muted text-foreground'
						: 'text-muted-foreground hover:bg-muted hover:text-foreground'}"
					onclick={() => editor?.chain().focus().toggleBlockquote().run()}
					title="Blockquote"
				>
					<Quote class="h-4 w-4" />
				</button>
			{/if}

			{#if hasMark('link')}
				{#if hasList('bullet') || hasList('number') || hasStyle('blockquote')}
					<div class="bg-border mx-1 h-4 w-px"></div>
				{/if}
				<button
					type="button"
					class="rounded p-1.5 transition-colors {editor.isActive('link')
						? 'bg-muted text-foreground'
						: 'text-muted-foreground hover:bg-muted hover:text-foreground'}"
					onclick={toggleLink}
					title={editor.isActive('link') ? 'Remove link' : 'Add link'}
				>
					{#if editor.isActive('link')}
						<Unlink class="h-4 w-4" />
					{:else}
						<LinkIcon class="h-4 w-4" />
					{/if}
				</button>
			{/if}

			<div class="flex-1"></div>

			<button
				type="button"
				class="text-muted-foreground hover:text-foreground rounded p-1.5 transition-colors disabled:opacity-30"
				onclick={() => editor?.chain().focus().undo().run()}
				disabled={!editor.can().undo()}
				title="Undo (⌘Z)"
			>
				<Undo2 class="h-4 w-4" />
			</button>
			<button
				type="button"
				class="text-muted-foreground hover:text-foreground rounded p-1.5 transition-colors disabled:opacity-30"
				onclick={() => editor?.chain().focus().redo().run()}
				disabled={!editor.can().redo()}
				title="Redo (⌘⇧Z)"
			>
				<Redo2 class="h-4 w-4" />
			</button>
		</div>
	{/if}

	<div bind:this={element} class="richtext-content"></div>
</div>

<style>
	.richtext-editor {
		border: 1px solid var(--border);
		border-radius: var(--radius);
		overflow: hidden;
	}

	.richtext-content :global(.tiptap) {
		padding: 0.75rem 1rem;
		min-height: 150px;
		outline: none;
		font-size: 0.875rem;
		line-height: 1.625;
	}

	.richtext-content :global(.tiptap p) {
		margin: 0.5em 0;
	}

	.richtext-content :global(.tiptap p:first-child) {
		margin-top: 0;
	}

	.richtext-content :global(.tiptap p:last-child) {
		margin-bottom: 0;
	}

	.richtext-content :global(.tiptap h1) {
		font-size: 1.875rem;
		font-weight: 700;
		margin: 0.75em 0 0.25em;
		line-height: 1.2;
	}

	.richtext-content :global(.tiptap h2) {
		font-size: 1.5rem;
		font-weight: 600;
		margin: 0.75em 0 0.25em;
		line-height: 1.3;
	}

	.richtext-content :global(.tiptap h3) {
		font-size: 1.25rem;
		font-weight: 600;
		margin: 0.75em 0 0.25em;
		line-height: 1.4;
	}

	.richtext-content :global(.tiptap blockquote) {
		border-left: 3px solid var(--border);
		padding-left: 1rem;
		margin: 0.75em 0;
		color: var(--muted-foreground);
	}

	.richtext-content :global(.tiptap ul),
	.richtext-content :global(.tiptap ol) {
		padding-left: 1.5rem;
		margin: 0.5em 0;
	}

	.richtext-content :global(.tiptap li) {
		margin: 0.25em 0;
	}

	.richtext-content :global(.tiptap code) {
		background: var(--muted);
		border-radius: 3px;
		padding: 0.15em 0.3em;
		font-size: 0.85em;
		font-family: var(--font-mono, monospace);
	}

	.richtext-content :global(.tiptap a),
	.richtext-content :global(.tiptap .richtext-link) {
		color: var(--primary);
		text-decoration: underline;
		cursor: pointer;
	}

	.richtext-content :global(.tiptap strong) {
		font-weight: 600;
	}

	.richtext-content :global(.tiptap em) {
		font-style: italic;
	}

	.richtext-content :global(.tiptap s) {
		text-decoration: line-through;
	}

	.richtext-content :global(.tiptap u) {
		text-decoration: underline;
	}
</style>
