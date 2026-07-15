/**
 * Rich-text block preview registry (client-side context).
 *
 * By default a custom Portable Text block renders in the editor as a generic card
 * (title/subtitle from its `preview` config). That's fine for data-ish blocks, but for
 * visual ones — an embed, a gallery, a button — authors expect to see the real thing
 * inline while writing (the Ghost/Sanity "what you see is what you get" editor).
 *
 * An app registers a preview per block `_type`; RichtextField resolves it and the
 * ProseMirror node view mounts it INSTEAD of the generic card. The preview still gets
 * `onEdit`/`onDelete` so the block stays editable and removable.
 *
 * Deliberately separate from the field-component registry: that one supplies *inputs*
 * (`field`/`value`/`onUpdate`); this one supplies *renderers* (`data`/`onEdit`). Same
 * idea, different contract.
 */
import { getContext, setContext, type Component } from 'svelte';
import type { PreviewSource } from '../utils/preview';

/**
 * The stable props a block preview component receives.
 *
 * Also the contract for core's own built-in views (the generic card and the image
 * view), so all three are mountable by the node view through one type.
 */
export interface BlockPreviewProps {
	/** The block's `_type`. */
	type: string;
	/** The block's `_key` — its stable identity within the field's array. */
	nodeKey: string;
	/** The block's stored data (its fields). */
	data: Record<string, unknown>;
	/** The block type's schema, for reading its `preview` config if useful. */
	schema?: PreviewSource;
	/** True while the block is selected in the editor. */
	selected?: boolean;
	/** Open the block's edit modal — wire this to a click/edit affordance. */
	onEdit: () => void;
	/** Remove the block. */
	onDelete: () => void;
}

export type BlockPreviewLookup = (type: string) => Component<BlockPreviewProps> | undefined;

const BLOCK_PREVIEWS_KEY = Symbol.for('aphex.admin.block-previews');

/** Publish the block-preview lookup to descendants (call in the admin shell). */
export function setBlockPreviews(lookup: BlockPreviewLookup): void {
	setContext(BLOCK_PREVIEWS_KEY, lookup);
}

/** Resolve the lookup. Returns a no-op lookup outside the admin shell. */
export function useBlockPreviews(): BlockPreviewLookup {
	return getContext<BlockPreviewLookup | undefined>(BLOCK_PREVIEWS_KEY) ?? (() => undefined);
}
