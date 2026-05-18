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
		Link as LinkIcon,
		Unlink,
		Undo2,
		Redo2,
		Plus,
		ChevronDown,
		X,
		Copy,
		Pencil
	} from '@lucide/svelte';
	import {
		tiptapToPortableText,
		portableTextToTiptap,
		type PortableTextValue
	} from './portable-text-serializer';
	import { PortableTextObject } from './portable-text-object-node';
	import { PortableTextInlineObject } from './portable-text-inline-object';
	import { createAnnotationMark } from './custom-annotation-mark';
	import type { ArrayField as ArrayFieldType, SchemaType } from '../../../../types/schemas';
	import { getSchemaContext } from '../../../../schema-context.svelte';
	import { getSchemaByName } from '../../../../schema-utils/utils';
	import ObjectModal from '../../ObjectModal.svelte';
	import AssetBrowserModal from '../../AssetBrowserModal.svelte';
	import * as Tooltip from '@aphexcms/ui/shadcn/tooltip';
	import { Image as ImageIcon } from '@lucide/svelte';

	interface Props {
		field: ArrayFieldType;
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
	let editorState = $state(0);
	let internalVersion = 0;

	let insertMenuOpen = $state(false);
	let modalOpen = $state(false);
	let editingSchema = $state<SchemaType | null>(null);
	let editingValue = $state<Record<string, any>>({});
	let editingNodeKey = $state<string | null>(null);
	let editingIsInline = $state(false);

	const blockDef = $derived(field.of.find((ref) => ref.type === 'block'));
	const styles = $derived(
		blockDef?.styles?.map((s) => s.value) ?? ['normal', 'h1', 'h2', 'h3', 'blockquote']
	);
	const decorators = $derived(
		blockDef?.marks?.decorators?.map((d) => d.value) ?? [
			'strong',
			'em',
			'underline',
			'strike-through',
			'code'
		]
	);
	const lists = $derived(blockDef?.lists?.map((l) => l.value) ?? ['bullet', 'number']);

	const customAnnotations = $derived(
		(blockDef?.marks?.annotations ?? []).map((a) => ({
			name: a.name,
			title: a.title || a.name,
			icon: a.icon,
			fields: a.fields || []
		}))
	);
	const hasAnnotations = $derived(customAnnotations.length > 0);
	const hasLink = true;

	const hasImageBlock = $derived(field.of.some((ref) => ref.type === 'image'));
	const customTypes = $derived(
		field.of
			.filter((ref) => ref.type !== 'block' && ref.type !== 'image')
			.map((t) => {
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

	const inlineTypes = $derived(
		(blockDef?.of ?? []).map((t) => {
			const registered = getSchemaByName(schemas, t.type);
			return {
				type: t.type,
				title: t.title || registered?.title || t.type,
				fields: t.fields || registered?.fields || [],
				schema: registered
			};
		})
	);
	const hasInlineTypes = $derived(inlineTypes.length > 0);

	const hasDecorator = (d: string) => decorators.includes(d);
	const hasList = (l: string) => lists.includes(l);
	const hasStyle = (s: string) => styles.includes(s);

	let styleMenuOpen = $state(false);

	const styleLabels: Record<string, string> = {
		normal: 'Normal',
		h1: 'Heading 1',
		h2: 'Heading 2',
		h3: 'Heading 3',
		h4: 'Heading 4',
		h5: 'Heading 5',
		h6: 'Heading 6',
		blockquote: 'Quote'
	};

	const activeStyle = $derived.by(() => {
		void editorState;
		if (!editor) return 'normal';
		for (const s of styles) {
			if (s === 'blockquote' && editor.isActive('blockquote')) return 'blockquote';
			if (s.startsWith('h') && editor.isActive('heading', { level: parseInt(s.slice(1), 10) }))
				return s;
		}
		return 'normal';
	});

	function applyStyle(style: string) {
		if (!editor) return;
		if (style === 'normal') {
			editor.chain().focus().setParagraph().run();
		} else if (style === 'blockquote') {
			editor.chain().focus().toggleBlockquote().run();
		} else if (style.startsWith('h')) {
			const level = parseInt(style.slice(1), 10) as 1 | 2 | 3 | 4 | 5 | 6;
			editor.chain().focus().toggleHeading({ level }).run();
		}
		styleMenuOpen = false;
	}

	function genKey(): string {
		return Math.random().toString(36).slice(2, 8);
	}

	function handleEditBlock(attrs: { _type: string; _key: string; data: Record<string, unknown> }) {
		if (attrs._type === 'image') {
			editingNodeKey = attrs._key;
			showAssetBrowser = true;
			return;
		}
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
		editingIsInline = false;
		modalOpen = true;
	}

	function handleDeleteBlock(key: string) {
		if (!editor) return;
		const { state } = editor;
		const { tr } = state;
		state.doc.descendants((node, pos) => {
			if (
				(node.type.name === 'portableTextObject' ||
					node.type.name === 'portableTextInlineObject') &&
				node.attrs._key === key
			) {
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
		editingIsInline = false;
		modalOpen = true;
		insertMenuOpen = false;
	}

	function handleEditInline(attrs: { _type: string; _key: string; data: Record<string, unknown> }) {
		const typeDef = inlineTypes.find((t) => t.type === attrs._type);
		if (!typeDef) return;
		editingSchema = {
			type: 'object',
			name: attrs._type,
			title: typeDef.title,
			fields: typeDef.fields as any
		};
		editingValue = { ...attrs.data };
		editingNodeKey = attrs._key;
		editingIsInline = true;
		modalOpen = true;
	}

	function handleInsertInline(typeName: string) {
		if (!editor) return;
		const typeDef = inlineTypes.find((t) => t.type === typeName);
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
		editingIsInline = true;
		modalOpen = true;
		insertMenuOpen = false;
	}

	let showAssetBrowser = $state(false);

	function handleInsertImageBlock() {
		editingNodeKey = null;
		insertMenuOpen = false;
		showAssetBrowser = true;
	}

	function handleAssetSelected(asset: any) {
		if (!editor || !asset) return;

		const existing = editingNodeKey ? findNodeByKey(editingNodeKey) : null;
		if (existing) {
			const { tr } = editor.state;
			tr.setNodeMarkup(existing.pos, undefined, {
				_type: 'image',
				_key: editingNodeKey,
				data: { asset: { _type: 'reference', _ref: asset.id } }
			});
			editor.view.dispatch(tr);
		} else {
			editor
				.chain()
				.focus()
				.insertContent({
					type: 'portableTextObject',
					attrs: {
						_type: 'image',
						_key: genKey(),
						data: { asset: { _type: 'reference', _ref: asset.id } }
					}
				})
				.run();
		}

		showAssetBrowser = false;
		editingNodeKey = null;
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
			const nodeType = editingIsInline ? 'portableTextInlineObject' : 'portableTextObject';
			editor
				.chain()
				.focus()
				.insertContent({
					type: nodeType,
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
		editingIsInline = false;
	}

	function findNodeByKey(key: string): { pos: number; node: any } | null {
		if (!editor) return null;
		let found: { pos: number; node: any } | null = null;
		editor.state.doc.descendants((node, pos) => {
			if (
				(node.type.name === 'portableTextObject' ||
					node.type.name === 'portableTextInlineObject') &&
				node.attrs._key === key
			) {
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
		const starterKitConfig: Record<string, any> = {
			heading: {
				levels: [1, 2, 3, 4, 5, 6].filter((l) => hasStyle(`h${l}`))
			},
			bulletList: hasList('bullet') ? {} : false,
			orderedList: hasList('number') ? {} : false,
			blockquote: hasStyle('blockquote') ? {} : false,
			bold: hasDecorator('strong') ? {} : false,
			italic: hasDecorator('em') ? {} : false,
			strike: hasDecorator('strike-through') ? {} : false,
			code: hasDecorator('code') ? {} : false
		};
		// Prevent duplicates — StarterKit may bundle these in newer versions
		if (hasDecorator('underline')) starterKitConfig.underline = false;
		if (hasLink) starterKitConfig.link = false;

		const extensions = [
			StarterKit.configure(starterKitConfig),
			...(hasDecorator('underline') ? [Underline] : []),
			...(hasLink
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
			...(hasInlineTypes
				? [
						PortableTextInlineObject.configure({
							onEdit: handleEditInline,
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
				queueMicrotask(() => {
					editorState++;
				});
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

	onMount(() => {
		createEditor();
		document.addEventListener('click', handleClickOutside);
	});

	onDestroy(() => {
		editor?.destroy();
		document.removeEventListener('click', handleClickOutside);
	});

	function handleClickOutside(e: MouseEvent) {
		const target = e.target as HTMLElement;
		if (styleMenuOpen && !target.closest('.richtext-editor')) {
			styleMenuOpen = false;
		}
		if (insertMenuOpen && !target.closest('.richtext-editor')) {
			insertMenuOpen = false;
		}
	}

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
</script>

{#snippet toolbarBtn(onclick: () => void, label: string, active: boolean, icon: any)}
	<Tooltip.Root openDelay={400}>
		<Tooltip.Trigger
			type="button"
			class="rounded p-1.5 transition-colors {active
				? 'bg-muted text-foreground'
				: 'text-muted-foreground hover:bg-muted hover:text-foreground'}"
			onmousedown={(e: MouseEvent) => {
				e.preventDefault();
				onclick();
			}}
		>
			{@const Icon = icon}
			<Icon class="h-4 w-4" />
		</Tooltip.Trigger>
		<Tooltip.Content side="bottom" sideOffset={4}>{label}</Tooltip.Content>
	</Tooltip.Root>
{/snippet}

<div class="richtext-editor {validationClasses}">
	{#if editor && !readonly}
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<Tooltip.Provider>
			<div
				class="border-rule bg-muted/30 flex flex-wrap items-center gap-0.5 border-b px-2 py-1.5"
				onmousedown={(e) => e.preventDefault()}
			>
				{#if styles.length > 1}
					<div class="relative">
						<button
							type="button"
							class="text-muted-foreground hover:bg-muted hover:text-foreground flex items-center gap-1 rounded px-2 py-1 text-xs font-medium transition-colors"
							onclick={() => (styleMenuOpen = !styleMenuOpen)}
						>
							<span>{styleLabels[activeStyle] ?? 'Normal'}</span>
							<ChevronDown class="h-3 w-3" />
						</button>
						{#if styleMenuOpen}
							<div
								class="bg-popover border-rule absolute top-full left-0 z-40 mt-1 min-w-[140px] rounded-md border py-1 shadow-lg"
							>
								{#each styles as s}
									<button
										type="button"
										class="flex w-full items-center px-3 py-1.5 text-left text-sm transition-colors {activeStyle ===
										s
											? 'bg-muted text-foreground font-medium'
											: 'text-muted-foreground hover:bg-muted hover:text-foreground'}"
										onclick={() => applyStyle(s)}
									>
										{styleLabels[s] ?? s}
									</button>
								{/each}
							</div>
						{/if}
					</div>
					<div class="bg-border mx-1 h-4 w-px"></div>
				{/if}

				{#if hasDecorator('strong')}
					{@render toolbarBtn(
						() => editor?.chain().focus().toggleBold().run(),
						'Bold',
						editor.isActive('bold'),
						Bold
					)}
				{/if}
				{#if hasDecorator('em')}
					{@render toolbarBtn(
						() => editor?.chain().focus().toggleItalic().run(),
						'Italic',
						editor.isActive('italic'),
						Italic
					)}
				{/if}
				{#if hasDecorator('underline')}
					{@render toolbarBtn(
						() => editor?.chain().focus().toggleUnderline().run(),
						'Underline',
						editor.isActive('underline'),
						UnderlineIcon
					)}
				{/if}
				{#if hasDecorator('strike-through')}
					{@render toolbarBtn(
						() => editor?.chain().focus().toggleStrike().run(),
						'Strikethrough',
						editor.isActive('strike'),
						Strikethrough
					)}
				{/if}
				{#if hasDecorator('code')}
					{@render toolbarBtn(
						() => editor?.chain().focus().toggleCode().run(),
						'Inline code',
						editor.isActive('code'),
						Code
					)}
				{/if}

				{#if (hasDecorator('strong') || hasDecorator('em')) && (hasList('bullet') || hasList('number') || hasLink)}
					<div class="bg-border mx-1 h-4 w-px"></div>
				{/if}

				{#if hasList('bullet')}
					{@render toolbarBtn(
						() => editor?.chain().focus().toggleBulletList().run(),
						'Bullet list',
						editor.isActive('bulletList'),
						List
					)}
				{/if}
				{#if hasList('number')}
					{@render toolbarBtn(
						() => editor?.chain().focus().toggleOrderedList().run(),
						'Numbered list',
						editor.isActive('orderedList'),
						ListOrdered
					)}
				{/if}

				{#if hasLink}
					{#if hasList('bullet') || hasList('number')}
						<div class="bg-border mx-1 h-4 w-px"></div>
					{/if}
					{@render toolbarBtn(
						openLinkEdit,
						editor.isActive('link') ? 'Edit link' : 'Add link',
						editor.isActive('link') || linkMode !== 'closed',
						LinkIcon
					)}
				{/if}

				{#if hasImageBlock}
					<div class="bg-border mx-1 h-4 w-px"></div>
					{@render toolbarBtn(handleInsertImageBlock, 'Insert image', false, ImageIcon)}
				{/if}

				{#if hasCustomTypes || hasInlineTypes}
					<div class="bg-border mx-1 h-4 w-px"></div>
					<div class="relative">
						<Tooltip.Root openDelay={400}>
							<Tooltip.Trigger
								type="button"
								class="text-muted-foreground hover:bg-muted hover:text-foreground rounded p-1.5 transition-colors"
								onmousedown={(e: MouseEvent) => {
									e.preventDefault();
									insertMenuOpen = !insertMenuOpen;
								}}
							>
								<Plus class="h-4 w-4" />
							</Tooltip.Trigger>
							<Tooltip.Content side="bottom" sideOffset={4}>Insert block</Tooltip.Content>
						</Tooltip.Root>
						{#if insertMenuOpen}
							<div
								class="bg-popover border-rule absolute top-full left-0 z-40 mt-1 min-w-[160px] rounded-md border py-1 shadow-lg"
							>
								{#if hasCustomTypes}
									<div class="text-muted-foreground px-3 py-1 text-[10px] font-medium uppercase">
										Blocks
									</div>
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
								{/if}
								{#if hasInlineTypes}
									{#if hasCustomTypes}
										<div class="bg-border mx-2 my-1 h-px"></div>
									{/if}
									<div class="text-muted-foreground px-3 py-1 text-[10px] font-medium uppercase">
										Inline
									</div>
									{#each inlineTypes as it}
										<button
											type="button"
											class="hover:bg-muted flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors"
											onclick={() => handleInsertInline(it.type)}
										>
											<span
												class="bg-primary/20 text-primary flex h-5 w-5 shrink-0 items-center justify-center rounded text-[10px] font-medium uppercase"
												>{it.type.slice(0, 2)}</span
											>
											<span class="capitalize">{it.title}</span>
										</button>
									{/each}
								{/if}
							</div>
						{/if}
					</div>
				{/if}

				{#if hasAnnotations}
					<div class="bg-border mx-1 h-4 w-px"></div>
					{#each customAnnotations as ann}
						<Tooltip.Root openDelay={400}>
							<Tooltip.Trigger
								type="button"
								class="rounded p-1.5 text-xs font-medium transition-colors {editor.isActive(
									`annotation_${ann.name}`
								)
									? 'bg-muted text-foreground'
									: 'text-muted-foreground hover:bg-muted hover:text-foreground'}"
								onmousedown={(e: MouseEvent) => {
									e.preventDefault();
									openAnnotation(ann.name);
								}}
							>
								{ann.title.slice(0, 2).toUpperCase()}
							</Tooltip.Trigger>
							<Tooltip.Content side="bottom" sideOffset={4}>{ann.title}</Tooltip.Content>
						</Tooltip.Root>
					{/each}
				{/if}

				<div class="flex-1"></div>

				{@render toolbarBtn(() => editor?.chain().focus().undo().run(), 'Undo', false, Undo2)}
				{@render toolbarBtn(() => editor?.chain().focus().redo().run(), 'Redo', false, Redo2)}
			</div>
		</Tooltip.Provider>
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
				<Copy class="h-3.5 w-3.5" />
			</button>
			<button
				type="button"
				class="text-muted-foreground hover:text-foreground rounded p-0.5 transition-colors"
				onclick={openLinkEdit}
				title="Edit link"
			>
				<Pencil class="h-3.5 w-3.5" />
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
				<X class="h-3.5 w-3.5" />
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

<AssetBrowserModal
	bind:open={showAssetBrowser}
	onOpenChange={(v) => (showAssetBrowser = v)}
	assetTypeFilter="image"
	onSelect={handleAssetSelected}
/>

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

	.richtext-content :global(.tiptap [data-portable-text-inline]) {
		display: inline;
	}
</style>
