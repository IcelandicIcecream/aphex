import type { NodeViewRendererProps } from '@tiptap/core';
import type { NodeView as ProseMirrorNodeView } from '@tiptap/pm/view';
import { mount, unmount } from 'svelte';
import PortableTextObjectView from './PortableTextObjectView.svelte';

export function SvelteNodeViewRenderer(
	onEdit: (attrs: { _type: string; _key: string; data: Record<string, unknown> }) => void,
	onDelete: (key: string) => void
) {
	return (props: NodeViewRendererProps): ProseMirrorNodeView => {
		const wrapper = document.createElement('div');
		wrapper.setAttribute('data-portable-text-object', '');
		wrapper.setAttribute('data-node-view-wrapper', '');
		wrapper.contentEditable = 'false';

		const component = mount(PortableTextObjectView, {
			target: wrapper,
			props: {
				type: props.node.attrs._type,
				nodeKey: props.node.attrs._key,
				data: props.node.attrs.data,
				selected: false,
				onEdit: () => {
					onEdit({
						_type: props.node.attrs._type,
						_key: props.node.attrs._key,
						data: props.node.attrs.data
					});
				},
				onDelete: () => {
					onDelete(props.node.attrs._key);
				}
			}
		});

		return {
			dom: wrapper,
			update(node) {
				if (node.type.name !== 'portableTextObject') return false;
				return true;
			},
			selectNode() {
				wrapper.classList.add('ProseMirror-selectednode');
			},
			deselectNode() {
				wrapper.classList.remove('ProseMirror-selectednode');
			},
			destroy() {
				unmount(component);
			},
			stopEvent() {
				return true;
			},
			ignoreMutation() {
				return true;
			}
		};
	};
}
