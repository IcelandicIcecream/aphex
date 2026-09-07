const BARE_DOCUMENT_URL = /(^|\s)(\/admin\?docType=([A-Za-z0-9_.%~-]+)&docId=([A-Za-z0-9_.%~-]+))/g;

function collectionLabel(value: string): string {
	let decoded = value;
	try {
		decoded = decodeURIComponent(value);
	} catch {
		// Keep malformed percent encoding inert; the sanitizer still handles the rendered URL.
	}
	return decoded.replaceAll(/[_-]+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

/** Convert model-emitted bare editor routes into Markdown links before rendering. */
export function linkBareDocumentUrls(markdown: string): string {
	return markdown.replace(
		BARE_DOCUMENT_URL,
		(_match, prefix: string, href: string, collection: string) => {
			return `${prefix}[${collectionLabel(collection)}](${href})`;
		}
	);
}
