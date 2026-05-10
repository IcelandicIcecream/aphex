/**
 * Detect MIME type from file magic bytes (file signatures).
 * Returns the detected MIME type, or null if unknown.
 */
export function detectMimeType(buffer: Buffer): string | null {
	if (buffer.length < 4) return null;

	// PDF: %PDF
	if (buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46) {
		return 'application/pdf';
	}

	// PNG: 89 50 4E 47
	if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
		return 'image/png';
	}

	// JPEG: FF D8 FF
	if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
		return 'image/jpeg';
	}

	// GIF: GIF87a or GIF89a
	if (
		buffer[0] === 0x47 &&
		buffer[1] === 0x49 &&
		buffer[2] === 0x46 &&
		buffer[3] === 0x38 &&
		(buffer[4] === 0x37 || buffer[4] === 0x39) &&
		buffer[5] === 0x61
	) {
		return 'image/gif';
	}

	// WebP: RIFF....WEBP
	if (
		buffer.length >= 12 &&
		buffer[0] === 0x52 &&
		buffer[1] === 0x49 &&
		buffer[2] === 0x46 &&
		buffer[3] === 0x46 &&
		buffer[8] === 0x57 &&
		buffer[9] === 0x45 &&
		buffer[10] === 0x42 &&
		buffer[11] === 0x50
	) {
		return 'image/webp';
	}

	// AVIF: ....ftypavif
	if (buffer.length >= 12) {
		const ftypStr = buffer.subarray(4, 8).toString('ascii');
		if (ftypStr === 'ftyp') {
			const brand = buffer.subarray(8, 12).toString('ascii');
			if (brand === 'avif') return 'image/avif';
			if (brand === 'heic' || brand === 'heix') return 'image/heic';
			if (brand.startsWith('mp4') || brand === 'isom') return 'video/mp4';
		}
	}

	// SVG: starts with < and contains <svg (check first 256 bytes)
	const head = buffer.subarray(0, Math.min(buffer.length, 256)).toString('utf-8');
	if (head.trimStart().startsWith('<') && head.includes('<svg')) {
		return 'image/svg+xml';
	}

	// ZIP-based formats: PK\x03\x04
	if (buffer[0] === 0x50 && buffer[1] === 0x4b && buffer[2] === 0x03 && buffer[3] === 0x04) {
		return detectZipFormat(buffer);
	}

	// Microsoft Compound Binary (old .doc, .xls, .ppt): D0 CF 11 E0
	if (buffer[0] === 0xd0 && buffer[1] === 0xcf && buffer[2] === 0x11 && buffer[3] === 0xe0) {
		return 'application/msword'; // Could also be .xls or .ppt
	}

	// WASM: \0asm
	if (buffer[0] === 0x00 && buffer[1] === 0x61 && buffer[2] === 0x73 && buffer[3] === 0x6d) {
		return 'application/wasm';
	}

	// ELF executable: \x7fELF
	if (buffer[0] === 0x7f && buffer[1] === 0x45 && buffer[2] === 0x4c && buffer[3] === 0x46) {
		return 'application/x-executable';
	}

	// Mach-O executable (macOS): CF FA ED FE or CE FA ED FE or FE ED FA CF/CE
	if (
		(buffer[0] === 0xcf && buffer[1] === 0xfa && buffer[2] === 0xed && buffer[3] === 0xfe) ||
		(buffer[0] === 0xce && buffer[1] === 0xfa && buffer[2] === 0xed && buffer[3] === 0xfe) ||
		(buffer[0] === 0xfe && buffer[1] === 0xed && buffer[2] === 0xfa && buffer[3] === 0xcf) ||
		(buffer[0] === 0xfe && buffer[1] === 0xed && buffer[2] === 0xfa && buffer[3] === 0xce)
	) {
		return 'application/x-executable';
	}

	// PE executable (Windows .exe, .dll): MZ
	if (buffer[0] === 0x4d && buffer[1] === 0x5a) {
		return 'application/x-executable';
	}

	// Shell script: #!
	if (buffer[0] === 0x23 && buffer[1] === 0x21) {
		return 'application/x-shellscript';
	}

	return null;
}

/**
 * Detect specific format within a ZIP container.
 */
function detectZipFormat(buffer: Buffer): string {
	const content = buffer.subarray(0, Math.min(buffer.length, 2000)).toString('binary');

	if (content.includes('word/'))
		return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
	if (content.includes('xl/'))
		return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
	if (content.includes('ppt/'))
		return 'application/vnd.openxmlformats-officedocument.presentationml.presentation';

	return 'application/zip';
}

/**
 * Blocked MIME types that should never be uploaded.
 */
const BLOCKED_MIME_TYPES = new Set([
	'application/x-executable',
	'application/x-shellscript',
	'application/wasm',
	'application/x-msdos-program',
	'application/x-msdownload',
	'text/html',
	'application/xhtml+xml',
	'text/xml',
	'application/xml',
	'image/svg+xml'
]);

/**
 * Blocked file extensions (regardless of MIME type).
 */
const BLOCKED_EXTENSIONS = new Set([
	'.exe',
	'.dll',
	'.bat',
	'.cmd',
	'.com',
	'.msi',
	'.scr',
	'.pif',
	'.sh',
	'.bash',
	'.zsh',
	'.csh',
	'.ksh',
	'.app',
	'.command',
	'.action',
	'.ps1',
	'.psm1',
	'.psd1',
	'.vbs',
	'.vbe',
	'.js',
	'.jse',
	'.wsf',
	'.wsh',
	'.reg',
	'.inf',
	'.hta',
	'.wasm',
	'.html',
	'.htm',
	'.xhtml',
	'.shtml',
	'.xml',
	'.xsl',
	'.mhtml',
	'.svg'
]);

export interface FileValidationOptions {
	/** Allowed MIME types (e.g., ['application/pdf', 'image/*']). If empty/undefined, all non-blocked types allowed. */
	allowedMimeTypes?: string[];
	/** Max file size in bytes */
	maxSize?: number;
}

export interface FileValidationResult {
	valid: boolean;
	error?: string;
	detectedMimeType: string | null;
}

/**
 * Validate an uploaded file's actual content against allowed types.
 * Checks magic bytes, not just the client-provided MIME type.
 */
export function validateFile(
	buffer: Buffer,
	filename: string,
	clientMimeType: string,
	options: FileValidationOptions = {}
): FileValidationResult {
	const lowerName = filename.toLowerCase();
	const ext = lowerName.substring(lowerName.lastIndexOf('.'));
	const detectedMimeType = detectMimeType(buffer);

	// 1. Block dangerous extensions (check all extensions to prevent double-extension bypass)
	const allExts = lowerName.match(/\.[^.]+/g) || [];
	for (const e of allExts) {
		if (BLOCKED_EXTENSIONS.has(e)) {
			return { valid: false, error: `File type "${e}" is not allowed`, detectedMimeType };
		}
	}

	// 2. Block dangerous MIME types (detected from actual content)
	if (detectedMimeType && BLOCKED_MIME_TYPES.has(detectedMimeType)) {
		return {
			valid: false,
			error: `File content detected as "${detectedMimeType}" which is not allowed`,
			detectedMimeType
		};
	}

	// 3. Check for MIME type mismatch (potential spoofing)
	if (detectedMimeType && clientMimeType) {
		const detectedBase = detectedMimeType.split('/')[0];
		const clientBase = clientMimeType.split('/')[0];

		// If we detected an executable but client says it's something else, block it
		if (detectedMimeType === 'application/x-executable' && clientBase !== 'application') {
			return {
				valid: false,
				error: 'File content does not match the declared type',
				detectedMimeType
			};
		}

		// If client says image but we detect it's not an image
		if (clientBase === 'image' && detectedBase !== 'image' && detectedMimeType !== null) {
			return {
				valid: false,
				error: `File content is "${detectedMimeType}" but was uploaded as an image`,
				detectedMimeType
			};
		}
	}

	// 4. Check against allowed MIME types (from schema field `accept`)
	if (options.allowedMimeTypes && options.allowedMimeTypes.length > 0) {
		const mimeToCheck = detectedMimeType || clientMimeType;
		const isAllowed = options.allowedMimeTypes.some((allowed) => {
			if (allowed.endsWith('/*')) {
				// Wildcard match: 'image/*' matches 'image/png'
				const prefix = allowed.slice(0, -2);
				return mimeToCheck.startsWith(prefix);
			}
			if (allowed.startsWith('.')) {
				// Extension match: '.pdf' matches filename
				return ext === allowed.toLowerCase();
			}
			return mimeToCheck === allowed;
		});

		if (!isAllowed) {
			return {
				valid: false,
				error: `File type "${mimeToCheck}" is not allowed. Accepted: ${options.allowedMimeTypes.join(', ')}`,
				detectedMimeType
			};
		}
	}

	// 5. Check file size
	if (options.maxSize && buffer.length > options.maxSize) {
		const maxMB = (options.maxSize / (1024 * 1024)).toFixed(1);
		return {
			valid: false,
			error: `File exceeds maximum size of ${maxMB} MB`,
			detectedMimeType
		};
	}

	return { valid: true, detectedMimeType };
}
