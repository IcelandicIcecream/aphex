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
		Redo2,
		Plus
	} from '@lucide/svelte';
	import {
		tiptapToPortableText,
		portableTextToTiptap,
		type PortableTextValue
	} from './portable-text-serializer';
	import { PortableTextObject } from './portable-text-object-node';
	import { createAnnotationMark } from './custom-annotation-mark';
	import type {
		RichtextField as RichtextFieldType,
		SchemaType,
		AnnotationDefinition
	} from '../../../../types/schemas';
	import { getSchemaContext } from '../../../../schema-context.svelte';
	import { getSchemaByName } from '../../../../schema-utils/utils';
	import ObjectModal from '../../ObjectModal.svelte';

	interface Props {
		field: RichtextFieldType;
		value: PortableTextValue | null | undefined;
		onUpdate: (value: PortableTextValue) => void;
		validationClasses?: string;
		readonly?: boolean;
		onOpenReference?: (documentId: string, documentType: string) => void;
		organizationId?: string;
	}

	let {
		field,
		value,
		onUpdate,
		validationClasses = '',
		readonly = false,
		onOpenReference,
		organizationId
	}: Props = $props();

	const schemas = getSchemaContext();

	let element = $state<HTMLElement>();
	let editor = $state<Editor | null>(null);
	let internalVersion = 0;

	let insertMenuOpen = $state(false);
	let modalOpen = $state(false);
	let editingSchema = $state<SchemaType | null>(null);
	let editingValue = $state<Record<string, any>>({});
	let editingNodeKey = $state<string | null>(null);

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

	const customTypes = $derived(
		(field.of || []).map((t) => {
			const registered = getSchemaByName(schemas, t.type);
			return {
				type: t.type,
				title: t.title || registered?.title || t.type,
				fields: t.fields || registered?.fields || [],
				schema: registered
			};
		})
	);
	const hasCustomTypes = $derived(customTypes.length > 0);

	const builtinMarks = marks.filter((m): m is string => typeof m === 'string');
	const customAnnotations = $derived(
		marks
			.filter((m): m is AnnotationDefinition => typeof m === 'object' && 'name' in m)
			.map((a) => ({
				name: a.name,
				title: a.title || a.name,
				icon: a.icon,
				fields: a.fields || []
			}))
	);
	const hasAnnotations = $derived(customAnnotations.length > 0);

	const hasDecorator = (d: string) => decorators.includes(d as any);
	const hasList = (l: string) => lists.includes(l as any);
	const hasMark = (m: string) => builtinMarks.includes(m);
	const hasStyle = (s: string) => styles.includes(s as any);

	function genKey(): string {
		return Math.random().toString(36).slice(2, 8);
	}

	function handleEditBlock(attrs: { _type: string; _key: string; data: Record<string, unknown> }) {
		const typeDef = customTypes.find((t) => t.type === attrs._type);
		if (!typeDef) return;
		editingSchema = {
			type: 'object',
			name: attrs._type,
			title: typeDef.title,
			fields: typeDef.fields as any
		};
		editingValue = { ...attrs.data };
		editingNodeKey = attrs._key;
		modalOpen = true;
	}

	function handleDeleteBlock(key: string) {
		if (!editor) return;
		const { state } = editor;
		const { tr } = state;
		state.doc.descendants((node, pos) => {
			if (node.type.name === 'portableTextObject' && node.attrs._key === key) {
				tr.delete(pos, pos + node.nodeSize);
				return false;
			}
		});
		editor.view.dispatch(tr);
	}

	function handleInsertBlock(typeName: string) {
		if (!editor) return;
		const typeDef = customTypes.find((t) => t.type === typeName);
		if (!typeDef) return;
		const key = genKey();
		editingSchema = {
			type: 'object',
			name: typeName,
			title: typeDef.title,
			fields: typeDef.fields as any
		};
		editingValue = {};
		editingNodeKey = key;
		modalOpen = true;
		insertMenuOpen = false;
	}

	function handleModalUpdate(updatedData: Record<string, any>) {
		editingValue = updatedData;
		if (!editor || !editingSchema || !editingNodeKey) return;
		const existing = findNodeByKey(editingNodeKey);
		if (existing) {
			const { tr } = editor.state;
			tr.setNodeMarkup(existing.pos, undefined, {
				_type: editingSchema.name,
				_key: editingNodeKey,
				data: editingValue
			});
			editor.view.dispatch(tr);
		}
	}

	function handleModalClose() {
		if (!editor || !editingSchema || !editingNodeKey) {
			modalOpen = false;
			return;
		}
		const existing = findNodeByKey(editingNodeKey);
		if (existing) {
			const { tr } = editor.state;
			tr.setNodeMarkup(existing.pos, undefined, {
				_type: editingSchema.name,
				_key: editingNodeKey,
				data: editingValue
			});
			editor.view.dispatch(tr);
		} else {
			editor
				.chain()
				.focus()
				.insertContent({
					type: 'portableTextObject',
					attrs: {
						_type: editingSchema.name,
						_key: editingNodeKey,
						data: editingValue
					}
				})
				.run();
		}
		modalOpen = false;
		editingSchema = null;
		editingValue = {};
		editingNodeKey = null;
	}

	function findNodeByKey(key: string): { pos: number; node: any } | null {
		if (!editor) return null;
		let found: { pos: number; node: any } | null = null;
		editor.state.doc.descendants((node, pos) => {
			if (node.type.name === 'portableTextObject' && node.attrs._key === key) {
				found = { pos, node };
				return false;
			}
		});
		return found;
	}

	function createEditor() {
		editor?.destroy();
		if (!element) return;
		const tiptapDoc = portableTextToTiptap(value || []);
		const extensions = [
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
				: []),
			...(hasCustomTypes
				? [
						PortableTextObject.configure({
							onEdit: handleEditBlock,
							onDelete: handleDeleteBlock
						})
					]
				: []),
			...customAnnotations.map((a) => createAnnotationMark(a.name))
		];
		editor = new Editor({
			element,
			editable: !readonly,
			extensions,
			content: tiptapDoc,
			onUpdate: ({ editor: e }) => {
				internalVersion++;
				const json = e.getJSON();
				const pt = tiptapToPortableText(json);
				onUpdate(pt);
			},
			onTransaction: ({ editor: e }) => {
				editor = e as any;
				if (linkMode === 'edit') return;
				if (e.isActive('link') && e.state.selection.empty) {
					showLinkPreview();
				} else if (linkMode === 'preview') {
					linkMode = 'closed';
				}
			},
			injectCSS: false
		});
	}

	onMount(() => createEditor());

	onDestroy(() => {
		editor?.destroy();
	});

	// Sync value → editor when value changes externally. Track a version
	// counter so we can tell the difference between "parent echoed our
	// own change back" vs "parent loaded a different document."
	let lastSyncedVersion = 0;
	$effect(() => {
		const v = value;
		if (!editor) return;
		if (internalVersion !== lastSyncedVersion) {
			lastSyncedVersion = internalVersion;
			return;
		}
		const tiptapDoc = portableTextToTiptap(v || []);
		editor.commands.setContent(tiptapDoc);
	});

	let linkMode = $state<'closed' | 'preview' | 'edit'>('closed');
	let linkUrl = $state('');
	let linkInputRef = $state<HTMLInputElement>();
	let linkPopoverPos = $state({ top: 0, left: 0 });
	let linkPreviewHref = $state('');

	function positionLinkPopover() {
		if (!editor || !element) return;
		const { from, to } = editor.state.selection;
		const start = editor.view.coordsAtPos(from);
		const end = editor.view.coordsAtPos(to);
		const editorRect = element.getBoundingClientRect();
		linkPopoverPos = {
			top: end.bottom - editorRect.top + 4,
			left: Math.max(0, Math.min(start.left, end.left) - editorRect.left)
		};
	}

	function openLinkEdit() {
		if (!editor || !element) return;
		if (editor.isActive('link')) {
			linkUrl = editor.getAttributes('link').href || '';
		} else {
			linkUrl = '';
		}
		positionLinkPopover();
		linkMode = 'edit';
		queueMicrotask(() => linkInputRef?.focus());
	}

	function showLinkPreview() {
		if (!editor || !element) return;
		const attrs = editor.getAttributes('link');
		if (!attrs.href) return;
		linkPreviewHref = attrs.href;
		positionLinkPopover();
		linkMode = 'preview';
	}

	function applyLink() {
		if (!editor) return;
		if (linkUrl.trim()) {
			let href = linkUrl.trim();
			if (
				!/^https?:\/\//.test(href) &&
				!href.startsWith('/') &&
				!href.startsWith('#') &&
				!href.startsWith('mailto:')
			) {
				href = 'https://' + href;
			}
			editor.chain().focus().setLink({ href }).run();
		} else {
			editor.chain().focus().unsetLink().run();
		}
		linkMode = 'closed';
		linkUrl = '';
	}

	function removeLink() {
		if (!editor) return;
		editor.chain().focus().unsetLink().run();
		linkMode = 'closed';
		linkUrl = '';
	}

	function closeLinkPopover() {
		linkMode = 'closed';
		editor?.chain().focus().run();
	}

	function handleLinkKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			e.preventDefault();
			applyLink();
		} else if (e.key === 'Escape') {
			closeLinkPopover();
		}
	}

	// Annotation state
	let annotationModalOpen = $state(false);
	let annotationDef = $state<{ name: string; title: string; fields: any[] } | null>(null);
	let annotationValue = $state<Record<string, any>>({});
	let annotationKey = $state<string | null>(null);
	let annotationIsNew = $state(false);

	function openAnnotation(name: string) {
		if (!editor) return;
		const def = customAnnotations.find((a) => a.name === name);
		if (!def) return;

		const markName = `annotation_${name}`;
		if (editor.isActive(markName)) {
			const attrs = editor.getAttributes(markName);
			annotationValue = { ...(attrs.data || {}) };
			annotationKey = attrs._key || genKey();
			annotationIsNew = false;
		} else {
			annotationValue = {};
			annotationKey = genKey();
			annotationIsNew = true;
		}
		annotationDef = def;
		annotationModalOpen = true;
	}

	function handleAnnotationUpdate(updatedData: Record<string, any>) {
		annotationValue = updatedData;
		if (!editor || !annotationDef || !annotationKey) return;
		const markName = `annotation_${annotationDef.name}`;
		editor
			.chain()
			.focus()
			.extendMarkRange(markName)
			.setMark(markName, { _key: annotationKey, data: annotationValue })
			.run();
	}

	function handleAnnotationClose() {
		if (!editor || !annotationDef || !annotationKey) {
			annotationModalOpen = false;
			return;
		}
		const markName = `annotation_${annotationDef.name}`;
		if (annotationIsNew) {
			editor
				.chain()
				.focus()
				.setMark(markName, { _key: annotationKey, data: annotationValue })
				.run();
		} else {
			editor
				.chain()
				.focus()
				.extendMarkRange(markName)
				.setMark(markName, { _key: annotationKey, data: annotationValue })
				.run();
		}
		annotationModalOpen = false;
		annotationDef = null;
		annotationValue = {};
		annotationKey = null;
	}

	function removeAnnotation(name: string) {
		if (!editor) return;
		editor.chain().focus().unsetMark(`annotation_${name}`).run();
		annotationModalOpen = false;
		annotationDef = null;
	}
</script>

<div class="richtext-editor {validationClasses}">
	{#if editor && !readonly}
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			class="border-rule bg-muted/30 flex flex-wrap items-center gap-0.5 border-b px-2 py-1.5"
			onmousedown={(e) => e.preventDefault()}
		>
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
					title="Bold"
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
					title="Italic"
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
					title="Underline"
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
					class="rounded p-1.5 transition-colors {editor.isActive('link') || linkMode !== 'closed'
						? 'bg-muted text-foreground'
						: 'text-muted-foreground hover:bg-muted hover:text-foreground'}"
					onclick={openLinkEdit}
					title={editor.isActive('link') ? 'Edit link' : 'Add link'}
				>
					<LinkIcon class="h-4 w-4" />
				</button>
			{/if}

			{#if hasCustomTypes}
				<div class="bg-border mx-1 h-4 w-px"></div>
				<div class="relative">
					<button
						type="button"
						class="text-muted-foreground hover:bg-muted hover:text-foreground rounded p-1.5 transition-colors"
						onclick={() => (insertMenuOpen = !insertMenuOpen)}
						title="Insert block"
					>
						<Plus class="h-4 w-4" />
					</button>
					{#if insertMenuOpen}
						<div
							class="bg-popover border-rule absolute top-full left-0 z-40 mt-1 min-w-[160px] rounded-md border py-1 shadow-lg"
						>
							{#each customTypes as ct}
								<button
									type="button"
									class="hover:bg-muted flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors"
									onclick={() => handleInsertBlock(ct.type)}
								>
									<span
										class="bg-muted text-muted-foreground flex h-5 w-5 shrink-0 items-center justify-center rounded text-[10px] font-medium uppercase"
										>{ct.type.slice(0, 2)}</span
									>
									<span class="capitalize">{ct.title}</span>
								</button>
							{/each}
						</div>
					{/if}
				</div>
			{/if}

			{#if hasAnnotations}
				<div class="bg-border mx-1 h-4 w-px"></div>
				{#each customAnnotations as ann}
					<button
						type="button"
						class="rounded p-1.5 text-xs font-medium transition-colors {editor.isActive(
							`annotation_${ann.name}`
						)
							? 'bg-muted text-foreground'
							: 'text-muted-foreground hover:bg-muted hover:text-foreground'}"
						onclick={() => openAnnotation(ann.name)}
						title={ann.title}
					>
						{ann.title.slice(0, 2).toUpperCase()}
					</button>
				{/each}
			{/if}

			<div class="flex-1"></div>

			<button
				type="button"
				class="text-muted-foreground hover:text-foreground rounded p-1.5 transition-colors disabled:opacity-30"
				onclick={() => editor?.chain().focus().undo().run()}
				disabled={!editor.can().undo()}
				title="Undo"
			>
				<Undo2 class="h-4 w-4" />
			</button>
			<button
				type="button"
				class="text-muted-foreground hover:text-foreground rounded p-1.5 transition-colors disabled:opacity-30"
				onclick={() => editor?.chain().focus().redo().run()}
				disabled={!editor.can().redo()}
				title="Redo"
			>
				<Redo2 class="h-4 w-4" />
			</button>
		</div>
	{/if}

	<div bind:this={element} class="richtext-content"></div>

	{#if linkMode === 'preview'}
		<div
			class="border-rule bg-popover absolute z-40 flex items-center gap-1.5 rounded-md border px-2 py-1.5 shadow-lg"
			style="top: {linkPopoverPos.top}px; left: {linkPopoverPos.left}px;"
		>
			<a
				href={linkPreviewHref}
				target="_blank"
				rel="noopener noreferrer"
				class="text-primary max-w-[200px] truncate text-xs underline"
				title={linkPreviewHref}
			>
				{linkPreviewHref.replace(/^https?:\/\//, '')}
			</a>
			<div class="bg-border mx-0.5 h-3 w-px"></div>
			<button
				type="button"
				class="text-muted-foreground hover:text-foreground rounded p-0.5 transition-colors"
				onclick={() => {
					navigator.clipboard.writeText(linkPreviewHref);
				}}
				title="Copy URL"
			>
				<svg
					class="h-3.5 w-3.5"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
					stroke-width="2"
				>
					<rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
					<path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
				</svg>
			</button>
			<button
				type="button"
				class="text-muted-foreground hover:text-foreground rounded p-0.5 transition-colors"
				onclick={openLinkEdit}
				title="Edit link"
			>
				<svg
					class="h-3.5 w-3.5"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
					stroke-width="2"
				>
					<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
				</svg>
			</button>
			<button
				type="button"
				class="text-muted-foreground hover:text-destructive rounded p-0.5 transition-colors"
				onclick={removeLink}
				title="Remove link"
			>
				<Unlink class="h-3.5 w-3.5" />
			</button>
		</div>
	{:else if linkMode === 'edit'}
		<div
			class="border-rule bg-popover absolute z-40 flex items-center gap-2 rounded-md border px-3 py-2 shadow-lg"
			style="top: {linkPopoverPos.top}px; left: {linkPopoverPos.left}px;"
		>
			<LinkIcon class="text-muted-foreground h-4 w-4 shrink-0" />
			<input
				bind:this={linkInputRef}
				type="text"
				class="text-foreground placeholder:text-muted-foreground w-52 bg-transparent text-sm outline-none"
				placeholder="example.com"
				bind:value={linkUrl}
				onkeydown={handleLinkKeydown}
				onkeypress={(e) => {
					if (e.key === 'Enter') {
						e.preventDefault();
						applyLink();
					}
				}}
			/>
			<button
				type="button"
				class="bg-primary text-primary-foreground rounded px-2.5 py-1 text-xs font-medium whitespace-nowrap transition-colors"
				onclick={applyLink}
			>
				{editor?.isActive('link') ? 'Update' : 'Apply'}
			</button>
			{#if editor?.isActive('link')}
				<button
					type="button"
					class="text-muted-foreground hover:text-destructive rounded p-1 transition-colors"
					onclick={removeLink}
					title="Remove link"
				>
					<Unlink class="h-3.5 w-3.5" />
				</button>
			{/if}
			<button
				type="button"
				class="text-muted-foreground hover:text-foreground rounded p-1 transition-colors"
				onclick={closeLinkPopover}
				title="Cancel"
			>
				<svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M6 18L18 6M6 6l12 12"
					/>
				</svg>
			</button>
		</div>
	{/if}
</div>

{#if modalOpen && editingSchema}
	<ObjectModal
		open={modalOpen}
		schema={editingSchema}
		value={editingValue}
		onClose={handleModalClose}
		onUpdate={handleModalUpdate}
		{onOpenReference}
		{readonly}
		{organizationId}
	/>
{/if}

{#if annotationModalOpen && annotationDef}
	<ObjectModal
		open={annotationModalOpen}
		schema={{
			type: 'object',
			name: annotationDef.name,
			title: annotationDef.title,
			fields: annotationDef.fields
		}}
		value={annotationValue}
		onClose={handleAnnotationClose}
		onUpdate={handleAnnotationUpdate}
		{onOpenReference}
		{readonly}
		{organizationId}
	/>
{/if}

<style>
	.richtext-editor {
		position: relative;
		border: 1px solid var(--border);
		border-radius: var(--radius);
		overflow: visible;
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

	.richtext-content :global(.tiptap ul) {
		list-style: disc;
		padding-left: 1.5rem;
		margin: 0.5em 0;
	}

	.richtext-content :global(.tiptap ol) {
		list-style: decimal;
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

	.richtext-content :global(.tiptap [data-portable-text-object]) {
		margin: 0.5em 0;
	}

	.richtext-content :global(.tiptap .ProseMirror-selectednode [data-portable-text-object] > div) {
		ring: 2px solid var(--primary);
	}
</style>
