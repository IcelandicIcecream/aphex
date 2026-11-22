/**
 * The key a skimmed list item carries its label under (`mcp/document-view.ts`).
 * Every skimmed item has it, so a skimmed copy sent back on a save is refused
 * (`validateDocumentData`) rather than replacing the item with its summary.
 */
export const SKIM_MARK = '_skim';
