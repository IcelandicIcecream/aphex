import type { ImageField, FileField, SchemaType } from '../types/schemas';
import { findFieldByPath } from './asset-privacy';

export type AcceptedFileTypes = string | readonly string[];

const MIME_TYPE_PATTERN = /^[\w!#$&^_.+-]+\/(?:\*|[\w!#$&^_.+-]+)$/i;

/** Conservative installation-wide policy used when an app does not provide one. */
export const DEFAULT_ALLOWED_MIME_TYPES: readonly string[] = [
	'image/jpeg',
	'image/png',
	'image/gif',
	'image/webp',
	'image/avif',
	'image/heic',
	'image/heif',
	'application/pdf',
	'text/plain',
	'text/csv',
	'text/markdown',
	'application/json',
	'application/msword',
	'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
	'application/vnd.ms-excel',
	'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
	'application/vnd.ms-powerpoint',
	'application/vnd.openxmlformats-officedocument.presentationml.presentation',
	'application/vnd.oasis.opendocument.text',
	'application/vnd.oasis.opendocument.spreadsheet',
	'application/vnd.oasis.opendocument.presentation',
	'application/zip',
	'audio/mpeg',
	'audio/mp4',
	'audio/wav',
	'audio/ogg',
	'audio/aac',
	'audio/flac',
	'video/mp4',
	'video/webm',
	'video/quicktime',
	'video/ogg',
	'font/woff',
	'font/woff2',
	'font/ttf',
	'font/otf'
];

/** Normalize native input syntax and schema arrays to individual accept tokens. */
export function normalizeAcceptedFileTypes(accept: AcceptedFileTypes | undefined): string[] {
	if (!accept) return [];
	const values = typeof accept === 'string' ? [accept] : accept;
	return [
		...new Set(
			values
				.flatMap((value) => value.split(','))
				.map((value) => value.trim().toLowerCase())
				.filter(Boolean)
		)
	];
}

export function acceptedFileTypesInputValue(
	accept: AcceptedFileTypes | undefined
): string | undefined {
	const accepted = normalizeAcceptedFileTypes(accept);
	return accepted.length > 0 ? accepted.join(',') : undefined;
}

/**
 * Extension → MIME fallback for files the browser hands over with an empty
 * `File.type`. Chrome and Firefox report `''` for HEIC/HEIF because they have no
 * decoder registered for the format — Safari, which does, reports `image/heic` —
 * so an `image/*` field would turn away a photo straight off an iPhone while the
 * server was perfectly willing to take it.
 */
const EXTENSION_MIME_FALLBACK: Record<string, string> = {
	'.heic': 'image/heic',
	'.heif': 'image/heif',
	'.avif': 'image/avif'
};

/**
 * The MIME type to match a file against in the browser: what it reported, or a
 * guess from the extension when it reported nothing.
 *
 * Deliberately **not** used inside `isAcceptedFileType`, and never on the server.
 * This is a picker hint, not a security rule: it can only ever get a file as far
 * as the upload endpoint, which re-derives the type from magic bytes in
 * `validateFile` and rejects it there if the extension was lying. Wiring it into
 * the shared matcher would let a `.heic` full of garbage past a server-side
 * allow-list, which is exactly the check that shouldn't trust a filename.
 */
export function effectiveFileType(filename: string, mimeType: string): string {
	if (mimeType) return mimeType;
	const name = filename.toLowerCase();
	const match = Object.keys(EXTENSION_MIME_FALLBACK).find((ext) => name.endsWith(ext));
	return match ? EXTENSION_MIME_FALLBACK[match]! : '';
}

export function isAcceptedFileType(
	filename: string,
	mimeType: string,
	accept: AcceptedFileTypes | undefined
): boolean {
	const accepted = normalizeAcceptedFileTypes(accept);
	if (accepted.length === 0) return true;

	const normalizedMimeType = mimeType.toLowerCase();
	const normalizedFilename = filename.toLowerCase();
	return accepted.some((value) => {
		if (value.startsWith('.')) return normalizedFilename.endsWith(value);
		if (value.endsWith('/*')) return normalizedMimeType.startsWith(`${value.slice(0, -1)}`);
		return normalizedMimeType === value;
	});
}

export function validateGlobalAllowedMimeTypes(
	allowedMimeTypes: readonly string[] | undefined
): void {
	if (allowedMimeTypes === undefined) return;
	const normalized = normalizeAcceptedFileTypes(allowedMimeTypes);
	if (normalized.length === 0) {
		throw new Error('upload.allowedMimeTypes must contain at least one MIME type');
	}
	const invalid = normalized.find((value) => !MIME_TYPE_PATTERN.test(value));
	if (invalid) {
		throw new Error(
			`upload.allowedMimeTypes contains invalid MIME type "${invalid}"; filename extensions are not security rules`
		);
	}
}

export function resolveGlobalAllowedMimeTypes(instances?: {
	config?: { upload?: { allowedMimeTypes?: string[] } };
}): string[] {
	const configured = instances?.config?.upload?.allowedMimeTypes;
	return configured === undefined
		? [...DEFAULT_ALLOWED_MIME_TYPES]
		: normalizeAcceptedFileTypes(configured);
}

/** Resolve the effective rule for a schema field. Images default to image-only. */
export function resolveFieldAcceptedFileTypes(
	schema: SchemaType | null | undefined,
	fieldPath: string | undefined
): string[] | undefined {
	if (!schema?.fields || !fieldPath) return undefined;
	const field = findFieldByPath(schema.fields, fieldPath);
	if (!field) return undefined;
	if (field.type === 'image') {
		return normalizeAcceptedFileTypes((field as ImageField).accept ?? 'image/*');
	}
	if (field.type === 'file') {
		const accepted = normalizeAcceptedFileTypes((field as FileField).accept);
		return accepted.length > 0 ? accepted : undefined;
	}
	return undefined;
}
