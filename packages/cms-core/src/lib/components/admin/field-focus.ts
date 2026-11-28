/**
 * A field to take the editor to: which field, and where inside it. The shape of
 * the visual-editing preview's `aphex:field-click`, minus the document, so a click
 * on something that belongs to another document (an invoice's client name) can
 * open that document *at the field* rather than at its top.
 */
export interface FieldFocusTarget {
	fieldPath: string;
	blockIndex?: number;
	blockKey?: string;
	arrayIndex?: number;
	objectPath?: string;
	linkHref?: string;
}
