import type { NodeViewRendererProps } from '@tiptap/core';
import type { NodeView as ProseMirrorNodeView } from '@tiptap/pm/view';
import { mount, unmount } from 'svelte';
import PortableTextObjectView from './PortableTextObjectView.svelte';
import PortableTextImageView from './PortableTextImageView.svelte';

export function SvelteNodeViewRenderer(
	onEdit: (attrs: { _type: string; _key: string; data: Record<string, unknown> }) => void,
	onDelete: (key: string) => void
) {
	return (props: NodeViewRendererProps): ProseMirrorNodeView => {
		const wrapper = document.createElement('div');
		wrapper.setAttribute('data-portable-text-object', '');
		wrapper.setAttribute('data-node-view-wrapper', '');
		wrapper.contentEditable = 'false';

		let nodeAttrs = props.node.attrs;

		function getViewComponent() {
			return nodeAttrs._type === 'image' ? PortableTextImageView : PortableTextObjectView;
		}

		function mountView() {
			return mount(getViewComponent(), {
				target: wrapper,
				props: {
					type: nodeAttrs._type,
					nodeKey: nodeAttrs._key,
					data: nodeAttrs.data,
					selected: false,
					onEdit: () => {
						onEdit({
							_type: nodeAttrs._type,
							_key: nodeAttrs._key,
							data: nodeAttrs.data
						});
					},
					onDelete: () => {
						onDelete(nodeAttrs._key);
					}
				}
			});
		}

		let currentComponent = mountView();

		return {
			dom: wrapper,
			update(node) {
				if (node.type.name !== 'portableTextObject') return false;
				nodeAttrs = node.attrs;
				unmount(currentComponent);
				currentComponent = mountView();
				return true;
			},
			selectNode() {
				wrapper.classList.add('ProseMirror-selectednode');
			},
			deselectNode() {
				wrapper.classList.remove('ProseMirror-selectednode');
			},
			destroy() {
				unmount(currentComponent);
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
