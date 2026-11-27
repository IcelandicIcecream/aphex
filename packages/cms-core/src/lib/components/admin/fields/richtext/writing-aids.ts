// Two small aids for writing in the rich text editor, without a TipTap package
// each: a placeholder in empty lines, and spotting a "/" typed to open the
// insert menu.
import { Extension } from '@tiptap/core';
import { Plugin, PluginKey, type EditorState } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

/**
 * Grey hint text in an empty editor (`empty`), and in the empty line the cursor
 * is on (`line`) once there's other text. Drawn by CSS from `data-placeholder`,
 * so nothing is added to the document.
 */
export const Placeholder = Extension.create<{ empty: string; line: string }>({
	name: 'aphexPlaceholder',
	addOptions: () => ({ empty: '', line: '' }),
	addProseMirrorPlugins() {
		const { empty, line } = this.options;
		const editor = this.editor;
		return [
			new Plugin({
				key: new PluginKey('aphexPlaceholder'),
				props: {
					decorations: ({ doc, selection }) => {
						if (!editor.isEditable) return null;
						const first = doc.firstChild;
						const docEmpty =
							doc.childCount === 1 && !!first?.isTextblock && first.content.size === 0;
						if (docEmpty && empty) {
							return DecorationSet.create(doc, [
								Decoration.node(0, first!.nodeSize, {
									class: 'is-empty',
									'data-placeholder': empty
								})
							]);
						}
						const { $from, empty: collapsed } = selection;
						const parent = $from.parent;
						if (!line || !collapsed || !editor.isFocused) return null;
						if (parent.type.name !== 'paragraph' || parent.content.size > 0) return null;
						const start = $from.before();
						return DecorationSet.create(doc, [
							Decoration.node(start, start + parent.nodeSize, {
								class: 'is-empty',
								'data-placeholder': line
							})
						]);
					}
				}
			})
		];
	}
});

/**
 * A "/" typed at the start of a line or after a space, and the word after it:
 * `{ from, to, query }`, where from..to covers the "/" and the word, or null.
 */
export function slashAt(state: EditorState): { from: number; to: number; query: string } | null {
	const { $from, empty } = state.selection;
	if (!empty || !$from.parent.isTextblock || $from.parent.type.name === 'codeBlock') return null;
	const before = $from.parent.textBetween(0, $from.parentOffset, undefined, '￼');
	const match = /(?:^|\s)\/([^\s/]{0,24})$/.exec(before);
	if (!match) return null;
	const length = match[1]!.length + 1;
	return { from: $from.pos - length, to: $from.pos, query: match[1]! };
}
