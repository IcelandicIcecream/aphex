import type { RequestHandler } from '@sveltejs/kit';
import { verifyAssetSignature } from '../utils/asset-url-signing';
import { isAssetPrivate, resolveFieldPrivacy } from '../utils/asset-privacy';
import { cmsLogger } from '../utils/logger';
import {
	parseVariantFilename,
	VARIANT_FORMAT,
	POSTER_FILENAME,
	buildPosterKey
} from '../storage/keys';
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

/**
 * Parse a single byte range against a known object size.
 *
 * Returns `null` when there is nothing to honour — no header, a form we don't
 * serve, or an unknown size — in which case the caller answers `200` with the
 * whole body. That is a legal response to any `Range` request, which is what
 * makes ignoring multipart ranges (`bytes=0-99,200-299`) acceptable: they are
 * fiddly to emit, essentially nothing sends them, and a full body is correct.
 *
 * `'unsatisfiable'` is different from `null`: the range is well-formed but lies
 * outside the object, which must be answered `416`, not `200`. A client that
 * seeks past the end otherwise receives a full file it did not ask for.
 *
 * Both bounds in the result are **inclusive**, as in the header itself.
 */
export function parseByteRange(
	header: string | null,
	size: number | null
): { start: number; end: number } | 'unsatisfiable' | null {
	if (!header || size == null || size <= 0) return null;

	const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
	if (!match) return null;

	const [, rawStart, rawEnd] = match;
	if (rawStart === '' && rawEnd === '') return null;

	// `bytes=-500` is a *suffix* range: the last 500 bytes, not "from 500 on".
	// Reading it as a start offset is the classic way to serve the wrong half of
	// a file to a player seeking near the end.
	if (rawStart === '') {
		const suffixLength = Number(rawEnd);
		if (!Number.isFinite(suffixLength) || suffixLength <= 0) return 'unsatisfiable';
		return { start: Math.max(0, size - suffixLength), end: size - 1 };
	}

	const start = Number(rawStart);
	if (!Number.isFinite(start) || start >= size) return 'unsatisfiable';

	// An open-ended `bytes=500-` runs to the last byte, and an end past the object
	// is clamped rather than rejected — RFC 9110 treats an over-long end as the
	// whole remainder, and players routinely ask for more than exists.
	const requestedEnd = rawEnd === '' ? size - 1 : Number(rawEnd);
	if (!Number.isFinite(requestedEnd)) return 'unsatisfiable';
	const end = Math.min(requestedEnd, size - 1);
	if (end < start) return 'unsatisfiable';

	return { start, end };
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

		// Is this asset private?
		//
		// The asset stores a pointer to the field it was uploaded into, and the
		// answer is recomputed from the live schema each time — so flipping
		// `private: true` in code applies immediately, with no migration.
		//
		// When that pointer no longer resolves (the field was renamed or removed)
		// we fall back to the value stamped on the asset at upload. Without that
		// fallback an unresolvable pointer read as "public", so renaming a private
		// field quietly published everything behind it.
		const schemaType = asset.metadata?.schemaType;
		const fieldPath = asset.metadata?.fieldPath;

		const resolved = resolveFieldPrivacy(
			schemaType ? cmsEngine.getSchemaTypeByName(schemaType) : null,
			fieldPath
		);
		const { isPrivate, usedFallback } = isAssetPrivate(resolved, asset.metadata?.private);

		if (usedFallback) {
			cmsLogger.warn(
				'[Asset CDN]',
				`Field ${schemaType}.${fieldPath} no longer resolves; treating asset ${asset.id} as private ` +
					'from the value recorded at upload. Re-upload it through the current field to clear this.'
			);
		}

		cmsLogger.debug('[Asset CDN]', 'Asset privacy:', { isPrivate, schemaType, fieldPath });

		// A signed URL stands in for a session.
		//
		// That is the whole point of it: a private asset has to stay reachable in
		// an <img>, a <video>, or an emailed link, none of which carry the admin's
		// cookie. The signature is minted server-side by code that has already
		// decided this viewer may see the asset, and it expires, so it grants
		// exactly one asset for a bounded window rather than standing access.
		//
		// Checked before the session rules below, and sufficient on its own — a
		// caller holding a valid signature needs no org membership, because org
		// membership is not what a public site visitor has.
		const signedAccess = verifyAssetSignature(
			config.security?.assetSigningSecret,
			new URL(request.url).searchParams,
			asset.id
		);

		// If asset is private, require auth
		if (isPrivate && !signedAccess && !organizationId) {
			cmsLogger.warn('[Asset CDN]', 'Private asset accessed without auth');
			return new Response('Unauthorized - This asset is private', { status: 401 });
		}

		// If asset is private, verify user has access to the asset's org
		// This includes exact match OR parent org accessing child org asset (hierarchy)
		if (isPrivate && !signedAccess && organizationId) {
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
		// A video's poster frame. Served from this route, behind the same checks,
		// for the reason stated above: a private video must not have a public
		// thumbnail sitting at a guessable URL.
		if (filename === POSTER_FILENAME) {
			try {
				const poster = await storageAdapter.getObject(buildPosterKey(asset.id));
				setHeaders({
					'Content-Type': 'image/webp',
					'Content-Length': String(poster.length),
					'Cache-Control': isPrivate ? 'private, no-store' : 'public, max-age=31536000, immutable',
					'X-Content-Type-Options': 'nosniff'
				});
				return new Response(toArrayBuffer(poster));
			} catch {
				// No poster (an API upload, or a codec the browser couldn't decode).
				// 404 rather than falling through to the video: a <img> asking for a
				// poster must not receive 30MB of MP4.
				return new Response('No poster for this asset', { status: 404 });
			}
		}

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

		// Byte ranges, which is what makes media usable. Without them a browser can
		// only reach the middle of a recording by transferring everything before
		// it, so seeking a large video costs a full download and the egress to
		// match. Small files hide this — a few MB over localhost feels instant —
		// which is why it reads as "fine in dev, expensive in production".
		//
		// The total has to be the object's real size, since it goes out in
		// `Content-Range` and a client trusts it. `asset.size` is the row's claim
		// and can be stale, so ask storage when it can tell us.
		let totalSize: number | null = asset.size ?? null;
		if (storageAdapter.getObjectMetadata) {
			try {
				const metadata = await storageAdapter.getObjectMetadata(asset.path);
				if (typeof metadata?.size === 'number') totalSize = metadata.size;
			} catch (err) {
				// Reporting-only: a metadata failure must not fail the download.
				cmsLogger.debug('[Asset CDN]', 'Could not read object metadata for range:', err);
			}
		}

		const range = parseByteRange(request.headers.get('range'), totalSize);

		if (range === 'unsatisfiable') {
			// 416 must carry the true size so the client can correct itself.
			return new Response(null, {
				status: 416,
				headers: {
					'Content-Range': `bytes */${totalSize}`,
					'Accept-Ranges': 'bytes'
				}
			});
		}

		if (range) {
			const rangeLength = range.end - range.start + 1;

			if (storageAdapter.getObjectRange) {
				body = await storageAdapter.getObjectRange(asset.path, range.start, range.end);
			} else {
				// Correct, but reads the whole object to return part of it. Adapters
				// should implement getObjectRange; both first-party ones do.
				const fileBuffer = await storageAdapter.getObject(asset.path);
				body = toArrayBuffer(fileBuffer.subarray(range.start, range.end + 1));
			}

			setHeaders({
				'Content-Type': asset.mimeType || 'application/octet-stream',
				// The *range* length, never the file's. A Content-Length that
				// disagrees with the body truncates the response or hangs the client.
				'Content-Length': String(rangeLength),
				'Content-Range': `bytes ${range.start}-${range.end}/${totalSize}`,
				'Accept-Ranges': 'bytes',
				'Cache-Control': isPrivate ? 'private, no-store' : 'public, max-age=31536000, immutable',
				'X-Content-Type-Options': 'nosniff'
			});

			return new Response(body, { status: 206 });
		}

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
			// Advertised for every type, not just images. It used to be image-only
			// while the route ignored `Range` entirely — so it was both a promise
			// nothing kept and a promise withheld from video, the one type that
			// actually needs it. Ranges are served above for anything whose size we
			// know, falling back to a buffered slice when the adapter has no ranged
			// read, so this is now true wherever it is sent.
			...(totalSize != null && { 'Accept-Ranges': 'bytes' })
		});

		return new Response(body);
	} catch (error) {
		cmsLogger.error('[Asset CDN]', 'Error serving asset:', error);
		return new Response('Failed to serve asset', { status: 500 });
	}
};
