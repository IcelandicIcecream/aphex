import { getContext, setContext } from 'svelte';

/**
 * Lets an input change other top-level fields of the document it's in, as one
 * change: a style picker that also clears the hand-set look, a template picker
 * that fills several fields. Provided by the document editor; undefined where a
 * form isn't a document (a dialog of its own, a read-only view).
 */
export type SetDocumentFields = (fields: Record<string, unknown>) => void;

const DOCUMENT_WRITER_KEY = Symbol('aphex-document-writer');

export function setDocumentWriter(write: SetDocumentFields): void {
	setContext(DOCUMENT_WRITER_KEY, write);
}

export function useDocumentWriter(): SetDocumentFields | undefined {
	return getContext<SetDocumentFields | undefined>(DOCUMENT_WRITER_KEY);
}
