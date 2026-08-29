import type { RequestHandler } from '@sveltejs/kit';
import { cmsLogger } from '../utils/logger';
import { parseVariantFilename, VARIANT_FORMAT } from '../storage/keys';
import { configHashFor, pickVariant, resolveImageConfig } from '../images/variants';
import { generateVariant } from '../images/generate';

/**
 * HTTP headers are ByteString-restricted, so a raw non-ASCII character in a
 * filename throws when the Response is constructed. Callers pair this with a
 * `filename*=UTF-8''` parameter for clients that understand it.
 */
function asciiFilename(name: string): string {
	return name.replace(/[^\x20-\x7E]/g, '_').replace(/["\\]/g, '');
}

function stripExtension(name: string): string {
	const lastDot = name.lastIndexOf('.');
	return lastDot > 0 ? name.slice(0, lastDot) : name;
}

function toArrayBuffer(buffer: Buffer): ArrayBuffer {
	return buffer.buffer.slice(
		buffer.byteOffset,
		buffer.byteOffset + buffer.byteLength
	) as ArrayBuffer;
}

/**
 * Lifetime of a signed URL when `signedDownloads.expiresIn` isn't set.
 *
 * Long enough to start and finish a large download, short enough that a leaked
 * URL stops working quickly — the redirect is the one path where the file is
 * reachable without passing back through this route's access checks.
 */
const DEFAULT_SIGNED_URL_TTL_SECONDS = 900;

export const GET: RequestHandler = async ({ params, locals, setHeaders, request }) => {
	try {
		const { assetService, databaseAdapter, storageAdapter, cmsEngine, config } = locals.aphexCMS;
		let auth = locals.auth;
		const { id, filename } = params;

		cmsLogger.debug('[Asset CDN]', 'Request for asset:', id, filename);

		// If no session auth, check for API key in headers
		if (!auth) {
			const apiKey = request.headers.get('x-api-key');
			if (apiKey && config.auth?.provider) {
				try {
					const apiKeyAuth = await config.auth.provider.validateApiKey(request, databaseAdapter);
					if (apiKeyAuth) {
						auth = apiKeyAuth;
						cmsLogger.debug('[Asset CDN]', 'Authenticated via API key');
					}
				} catch (err) {
					cmsLogger.warn('[Asset CDN]', 'API key validation failed:', err);
				}
			}
		}

		if (!id) {
			return new Response('Asset ID is required', { status: 400 });
		}

		// Try to fetch asset globally first (bypasses RLS for public assets)
		const asset = await assetService.findAssetByIdGlobal(id);

		if (!asset) {
			cmsLogger.warn('[Asset CDN]', 'Asset not found:', id);
			return new Response('Asset not found', { status: 404 });
		}

		const organizationId =
			auth && auth.type !== 'partial_session' ? auth.organizationId : undefined;

		// Check if this asset is used in a private field
		// The field metadata (schemaType and fieldPath) is stored when the asset is uploaded
		let isPrivate = false;

		const schemaType = asset.metadata?.schemaType;
		const fieldPath = asset.metadata?.fieldPath;

		if (schemaType && fieldPath) {
			// Get the schema definition from IN-MEMORY config (always up-to-date with code changes)
			const schema = cmsEngine.getSchemaTypeByName(schemaType);

			if (schema && schema.fields) {
				// Navigate the field path to find the field definition
				const findField = (fields: any[], path: string): any => {
					const parts = path.split('.');
					let current: any = null;

					for (let i = 0; i < parts.length; i++) {
						const part = parts[i];
						current = fields.find((f) => f.name === part);

						if (!current) return null;

						// If not the last part, navigate into nested fields
						if (i < parts.length - 1) {
							if (current.type === 'object' && current.fields) {
								fields = current.fields;
							} else {
								return null;
							}
						}
					}

					return current;
				};

				const field = findField(schema.fields, fieldPath);

				if (field && field.type === 'image') {
					isPrivate = field.private === true;
				} else {
					cmsLogger.warn('[Asset CDN]', `Could not find field: ${schemaType}.${fieldPath}`);
				}
			}
		}

		cmsLogger.debug('[Asset CDN]', 'Asset privacy:', { isPrivate, schemaType, fieldPath });

		// If asset is private, require auth
		if (isPrivate && !organizationId) {
			cmsLogger.warn('[Asset CDN]', 'Private asset accessed without auth');
			return new Response('Unauthorized - This asset is private', { status: 401 });
		}

		// If asset is private, verify user has access to the asset's org
		// This includes exact match OR parent org accessing child org asset (hierarchy)
		if (isPrivate && organizationId) {
			let hasAccess = organizationId === asset.organizationId; // Same org

			// If not same org, check if asset's org is a child of user's org (hierarchy)
			if (!hasAccess && databaseAdapter.getChildOrganizations) {
				const childOrgs = await databaseAdapter.getChildOrganizations(organizationId);
				hasAccess = childOrgs.includes(asset.organizationId);
			}

			if (!hasAccess) {
				cmsLogger.warn('[Asset CDN]', 'Forbidden: org mismatch for private asset');
				return new Response('Forbidden', { status: 403 });
			}
		}

		// --- Serving ---------------------------------------------------------
		//
		// Everything above decided whether this caller may read the file. Only
		// now do we fetch it, and by default we fetch it *through* the app rather
		// than redirecting to the bucket.
		//
		// This route used to 302 straight to `asset.url` whenever it looked like
		// an absolute URL — which meant the privacy checks above decided nothing
		// for S3/R2-backed assets (anyone with the id got the public URL) and
		// broke outright against a private bucket, where the redirect target
		// isn't readable. Proxying is what makes those checks real.
		if (!storageAdapter) {
			cmsLogger.error('[Asset CDN]', 'No storage adapter configured');
			return new Response('No storage adapter configured', { status: 500 });
		}

		// Opt out per-file: large downloads shouldn't tie up a server process, so
		// they can be handed to the bucket as a short-lived signed URL. The
		// access checks have already passed, so this only ever signs a request
		// that was allowed. Falls through to the proxy when the adapter can't
		// sign, since serving the file beats refusing to.
		const signedDownloads = config.signedDownloads;
		if (signedDownloads && storageAdapter.getSignedUrl) {
			let useSigned = false;
			try {
				useSigned = await signedDownloads.shouldUseSignedURL(asset);
			} catch (err) {
				cmsLogger.warn('[Asset CDN]', 'shouldUseSignedURL threw; proxying instead:', err);
			}
			if (useSigned) {
				const signedUrl = await storageAdapter.getSignedUrl(
					asset.path,
					signedDownloads.expiresIn ?? DEFAULT_SIGNED_URL_TTL_SECONDS
				);
				return new Response(null, {
					status: 302,
					headers: {
						Location: signedUrl,
						// The URL expires, so it must never be cached by a shared proxy.
						'Cache-Control': 'private, no-store'
					}
				});
			}
		}

		// Stream when the adapter can, buffer when it can't.
		//
		// Not just an optimisation: a serverless host caps the *response body* it
		// will return (Vercel Functions: 4.5 MB, then a 413), and a streamed
		// response is exempt. Buffering an ordinary 5 MB photo there is a hard
		// failure, not a slow request — so the streaming path is the correct one
		// wherever it's available, and buffering is the fallback.
		// --- Variants --------------------------------------------------------
		//
		// Reached only after every check above has passed, which is the entire
		// reason derivatives live on this route instead of their own. A separate
		// image endpoint would have to repeat the privacy and organization logic,
		// and if it ever drifted the result would be a public derivative of a
		// private original, cached at the edge under a guessable key.
		const variantRequest = filename ? parseVariantFilename(filename) : null;
		const imageConfig = resolveImageConfig(config.images);

		if (variantRequest && imageConfig && asset.assetType === 'image') {
			const configHash = configHashFor(imageConfig);

			// A width outside the ladder, or a request under a superseded config,
			// falls through and serves the original. The ladder being a closed set
			// is what stops arbitrary dimensions turning into unbounded CPU and
			// storage, so an unknown width must never trigger generation.
			const servable =
				variantRequest.configHash === configHash &&
				imageConfig.widths.includes(variantRequest.width);

			if (servable) {
				const existing = pickVariant(asset, variantRequest.width, configHash);

				// A saved copy should get a readable name, not `w800-a1b2c3.webp`.
				// The variant's *URL* keeps the generated name — it has to, since
				// that's what makes it addressable and immutable — but what the
				// browser writes to disk is this route's business.
				const downloadName = `${stripExtension(asset.originalFilename || asset.filename)}.${VARIANT_FORMAT}`;

				setHeaders({
					'Content-Type': `image/${VARIANT_FORMAT}`,
					// Every variant URL embeds the config hash, so a change of ladder
					// or quality produces a different URL rather than new bytes at the
					// same one. That is what makes a year-long immutable cache safe.
					'Cache-Control': isPrivate ? 'private, no-store' : 'public, max-age=31536000, immutable',
					'Content-Disposition': `inline; filename="${asciiFilename(downloadName)}"; filename*=UTF-8''${encodeURIComponent(downloadName)}`,
					'X-Content-Type-Options': 'nosniff'
				});

				if (existing) {
					try {
						const buffer = await storageAdapter.getObject(existing.path);
						return new Response(toArrayBuffer(buffer), {
							headers: { 'Content-Length': String(buffer.length) }
						});
					} catch (err) {
						// Recorded but unreadable — the object was pruned, or the
						// record outlived it. Fall through and regenerate rather
						// than 404 on something we promised exists.
						cmsLogger.warn('[Asset CDN]', 'Recorded variant unreadable; regenerating:', err);
					}
				}

				try {
					const { buffer } = await generateVariant({
						asset,
						width: variantRequest.width,
						config: imageConfig,
						configHash,
						storage: storageAdapter,
						database: databaseAdapter
					});
					return new Response(toArrayBuffer(buffer), {
						headers: { 'Content-Length': String(buffer.length) }
					});
				} catch (err) {
					// A derivative that can't be produced must not break the page.
					// Serving the original is heavier but correct, and the next
					// request retries — which is the whole retry story for
					// generate-on-miss.
					cmsLogger.warn('[Asset CDN]', 'Variant generation failed; serving original:', err);
				}
			}
		}

		//
		// The body and its length are resolved together because they're only
		// knowable together: a stream doesn't carry a length, so it has to borrow
		// the row's `size`, while a buffer knows its own and shouldn't trust the
		// row. Omit the header rather than guess when neither is available — a
		// wrong Content-Length truncates the response or hangs the client, both
		// worse than sending none.
		let body: ReadableStream<Uint8Array> | ArrayBuffer;
		let contentLength: number | null;

		if (storageAdapter.getStream) {
			body = await storageAdapter.getStream(asset.path);
			contentLength = asset.size ?? null;
		} else {
			const fileBuffer = await storageAdapter.getObject(asset.path);
			body = toArrayBuffer(fileBuffer);
			contentLength = fileBuffer.length;
		}

		// RFC 6266 Content-Disposition: dual-encode the filename so it survives
		// non-ASCII characters in HTTP headers. HTTP headers are ByteString-
		// restricted (codepoints 0–255), so a raw character like U+202F NARROW
		// NO-BREAK SPACE — which macOS inserts before AM/PM in default
		// screenshot filenames — would otherwise crash the Response
		// constructor. We provide:
		//   filename="..."        — ASCII fallback for legacy clients
		//   filename*=UTF-8''...  — percent-encoded UTF-8 for modern clients
		const rawFilename = asset.originalFilename || asset.filename;
		const asciiFallback = rawFilename
			.replace(/[^\x20-\x7E]/g, '_') // strip anything outside printable ASCII
			.replace(/["\\]/g, ''); // drop quotes and backslashes that'd break the quoted-string
		const utf8Encoded = encodeURIComponent(rawFilename);

		const safeInlineTypes = ['image/', 'application/pdf', 'video/', 'audio/'];
		const canInline =
			asset.mimeType &&
			asset.mimeType !== 'image/svg+xml' &&
			safeInlineTypes.some((t) => asset.mimeType!.startsWith(t));
		const disposition = canInline ? 'inline' : 'attachment';

		setHeaders({
			'Content-Type': asset.mimeType || 'application/octet-stream',
			...(contentLength != null && { 'Content-Length': contentLength.toString() }),
			// A private asset must never land in a shared cache. Now that these
			// bytes flow through the app instead of coming from the bucket, an
			// unconditional `public, immutable` would let any CDN or proxy in front
			// of the app hand the file to the next caller without the checks above
			// ever running again.
			'Cache-Control': isPrivate ? 'private, no-store' : 'public, max-age=31536000, immutable',
			'Content-Disposition': `${disposition}; filename="${asciiFallback}"; filename*=UTF-8''${utf8Encoded}`,
			'X-Content-Type-Options': 'nosniff',
			...(asset.mimeType?.startsWith('image/') && {
				'Accept-Ranges': 'bytes'
			})
		});

		return new Response(body);
	} catch (error) {
		cmsLogger.error('[Asset CDN]', 'Error serving asset:', error);
		return new Response('Failed to serve asset', { status: 500 });
	}
};
