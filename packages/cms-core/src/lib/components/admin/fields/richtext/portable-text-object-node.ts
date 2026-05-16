import { Node, mergeAttributes } from '@tiptap/core';
import { SvelteNodeViewRenderer } from './svelte-node-view';

export interface PortableTextObjectOptions {
	onEdit: (attrs: { _type: string; _key: string; data: Record<string, unknown> }) => void;
	onDelete: (key: string) => void;
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
		return [{ tag: 'div[data-portable-text-object]' }];
	},

	renderHTML({ HTMLAttributes }) {
		return ['div', mergeAttributes(HTMLAttributes, { 'data-portable-text-object': '' }), 0];
	},

	addNodeView() {
		return SvelteNodeViewRenderer(this.options.onEdit, this.options.onDelete);
	}
});
