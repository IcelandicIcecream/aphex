import { Mark, mergeAttributes } from '@tiptap/core';

export interface CustomAnnotationOptions {
	annotationType: string;
	onEdit: (attrs: Record<string, unknown>) => void;
}

export function createAnnotationMark(name: string) {
	return Mark.create<CustomAnnotationOptions>({
		name: `annotation_${name}`,
		inclusive: false,
		excludes: '',

		addOptions() {
			return {
				annotationType: name,
				onEdit: () => {}
			};
		},

		addAttributes() {
			return {
				_key: { default: null },
				data: { default: {} }
			};
		},

		parseHTML() {
			return [{ tag: `span[data-annotation="${name}"]` }];
		},

		renderHTML({ HTMLAttributes }) {
			return [
				'span',
				mergeAttributes(HTMLAttributes, {
					'data-annotation': name,
					class: 'richtext-annotation',
					style: 'border-bottom: 2px dashed currentColor; cursor: pointer;'
				}),
				0
			];
		}
	});
}
