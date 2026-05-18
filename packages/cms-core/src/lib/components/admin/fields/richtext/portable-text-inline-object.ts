import { Node, mergeAttributes } from '@tiptap/core';
import { SvelteInlineNodeViewRenderer } from './svelte-inline-node-view';

export interface PortableTextInlineObjectOptions {
	onEdit: (attrs: { _type: string; _key: string; data: Record<string, unknown> }) => void;
	onDelete: (key: string) => void;
}

export const PortableTextInlineObject = Node.create<PortableTextInlineObjectOptions>({
	name: 'portableTextInlineObject',
	group: 'inline',
	inline: true,
	atom: true,
	selectable: true,

	addOptions() {
		return {
			onEdit: () => {},
			onDelete: () => {}
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
		return [{ tag: 'span[data-portable-text-inline]' }];
	},

	renderHTML({ HTMLAttributes }) {
		return ['span', mergeAttributes(HTMLAttributes, { 'data-portable-text-inline': '' }), 0];
	},

	addNodeView() {
		return SvelteInlineNodeViewRenderer(this.options.onEdit, this.options.onDelete);
	}
});
