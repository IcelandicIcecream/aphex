/**
 * Live data of a document other than the one a preview belongs to — a form open in
 * a stacked editor over the page that renders it. The page's preview receives it as
 * `aphex:related-data` and `ve.live(value, { type, id })` reads it.
 */
export interface RelatedPreviewData {
	documentType: string;
	documentId: string;
	document: Record<string, unknown>;
}
