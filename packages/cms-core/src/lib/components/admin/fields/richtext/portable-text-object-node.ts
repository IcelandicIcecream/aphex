import { Node, mergeAttributes } from '@tiptap/core';
import { SvelteNodeViewRenderer } from './svelte-node-view';
import type { Component } from 'svelte';
import type { PreviewSource } from '../../../../utils/preview';
import type { BlockPreviewProps } from '../../../../admin/block-previews.svelte';

export interface PortableTextObjectOptions {
	onEdit: (attrs: { _type: string; _key: string; data: Record<string, unknown> }) => void;
	onDelete: (key: string) => void;
	/** Resolve a block type's schema so its card can honour the type's `preview` config. */
	resolveSchema?: (type: string) => PreviewSource;
	/** Resolve a custom preview component, rendered inline instead of the generic card. */
	resolveComponent?: (type: string) => Component<BlockPreviewProps> | undefined;
}

export const PortableTextObject = Node.create<PortableTextObjectOptions>({
	name: 'portableTextObject',
	group: 'block',
	atom: true,
	draggable: true,
	selectable: true,

	addOptions() {
		return {
			onEdit: () => {},
			onDelete: () => {},
			resolveSchema: undefined,
			resolveComponent: undefined
		};
	},

	addAttributes() {
		return {
			_type: { default: null },
			_key: { default: null },
			data: { default: {} }
		};
	},

	parseHTML() {
		return [{ tag: 'div[data-portable-text-object]' }];
	},

	renderHTML({ HTMLAttributes }) {
		return ['div', mergeAttributes(HTMLAttributes, { 'data-portable-text-object': '' }), 0];
	},

	addNodeView() {
		return SvelteNodeViewRenderer(
			this.options.onEdit,
			this.options.onDelete,
			this.options.resolveSchema,
			this.options.resolveComponent
		);
	}
});
