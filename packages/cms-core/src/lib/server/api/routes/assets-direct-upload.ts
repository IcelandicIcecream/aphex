import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { cmsLogger } from '../../../utils/logger';
import { confirmUploadRequest, createUploadUrlRequest } from '../../../api/schemas/assets';
import { resolveFieldPrivacy } from '../../../utils/asset-privacy';
import {
	isAcceptedFileType,
	resolveFieldAcceptedFileTypes,
	resolveGlobalAllowedMimeTypes
} from '../../../utils/file-accept';
import { hasCapability } from '../../../types/capabilities';
import { resolveMaxUploadBytes, formatMegabytes } from '../../../api/limits';
import { buildOriginalKey, extensionFor } from '../../../storage/keys';
import { encryptSecret, decryptSecret } from '../../../security/secret-crypto';
import type { AphexEnv } from '../index';

/**
 * Direct-to-storage upload.
 *
 * Exists because of a hard platform limit, not for speed: a serverless host
 * caps the *request* body it accepts (Vercel Functions: 4.5 MB) and, unlike
 * responses, there is no streaming escape. An ordinary large photo therefore
 * cannot reach the app at all. The browser PUTs it to the bucket instead, and
 * the app only ever handles the intent and the confirmation.
 *
 * Two steps, both authorized:
 *
 *   POST /assets/upload-url  → { assetId, uploadUrl, ticket }
 *   PUT  <uploadUrl>         → browser to bucket, app not involved
 *   POST /assets/confirm     → { ticket } → the asset row
 *
 * The `ticket` is the upload intent, sealed with the app's own encryption key.
 * It exists because `confirm` must not trust the client about *what was
 * uploaded* — the key, filename and mime type all decide where bytes live and
 * how they're served — and a serverless deployment cannot keep that intent in
 * process memory, since a different instance will handle the confirmation.
 * Sealing it means no table, no shared cache, and no trust.
 */

/** Write grants are short-lived by design; this is only long enough to upload. */
const UPLOAD_URL_TTL_SECONDS = 15 * 60;

/** How long a ticket stays redeemable. Slightly beyond the URL's own life. */
const TICKET_TTL_MS = 20 * 60 * 1000;

interface UploadTicket {
	assetId: string;
	key: string;
	finalKey: string;
	originalFilename: string;
	mimeType: string;
	organizationId: string;
	schemaType?: string;
	fieldPath?: string;
	exp: number;
}

export const assetsDirectUploadRouter: Hono<AphexEnv> = new Hono<AphexEnv>()
	.post(
		'/upload-url',
		zValidator('json', createUploadUrlRequest, (result, c) => {
			if (!result.success) {
				return c.json(
					{ success: false, error: 'Invalid request body', issues: result.error.issues },
					400
				);
			}
		}),
		async (c) => {
			try {
				const { storageAdapter, config } = c.var.aphexCMS;
				const auth = c.var.auth;

				if (!auth || auth.type === 'partial_session') {
					return c.json({ success: false, error: 'Unauthorized' }, 401);
				}
				if (!hasCapability(auth, 'asset.upload')) {
					return c.json(
						{ success: false, error: 'Forbidden: asset.upload capability required' },
						403
					);
				}

				// Unavailable rather than broken: an adapter that can't sign, or an
				// app with no encryption key, simply doesn't offer this path, and the
				// client falls back to uploading through the app. 404 keeps it from
				// looking like a transient failure worth retrying.
				const secret = config.security?.secretEncryptionKey;
				if (
					!storageAdapter?.getSignedUploadUrl ||
					!storageAdapter.resolvePath ||
					!storageAdapter.copyObject ||
					!secret
				) {
					return c.json({ success: false, error: 'Direct upload is not available' }, 404);
				}

				const { filename, mimeType, size, schemaType, fieldPath } = c.req.valid('json');
				const acceptedFileTypes = resolveFieldAcceptedFileTypes(
					schemaType ? c.var.aphexCMS.cmsEngine.getSchemaTypeByName(schemaType) : undefined,
					fieldPath
				);
				const globalAllowedMimeTypes = resolveGlobalAllowedMimeTypes(c.var.aphexCMS);
				if (!isAcceptedFileType(filename, mimeType, globalAllowedMimeTypes)) {
					return c.json(
						{
							success: false,
							error: `File type "${mimeType}" is not allowed by the global upload policy`
						},
						400
					);
				}
				if (!isAcceptedFileType(filename, mimeType, acceptedFileTypes)) {
					return c.json(
						{
							success: false,
							error: `File type "${mimeType}" is not allowed. Accepted: ${acceptedFileTypes?.join(', ')}`
						},
						400
					);
				}

				const maxBytes = resolveMaxUploadBytes(c.var.aphexCMS);
				if (size > maxBytes) {
					// Refused before a write grant is issued at all. The declared size
					// is only a claim — the real one is checked on confirm — but there
					// is no reason to hand out a URL for an upload already known to be
					// too large.
					return c.json(
						{ success: false, error: `File exceeds the ${formatMegabytes(maxBytes)} limit` },
						413
					);
				}

				// The id, and therefore the key, is minted here. Accepting a
				// client-supplied key would let anyone holding `asset.upload` write
				// anywhere in the bucket, including over an existing asset's original.
				const assetId = crypto.randomUUID();
				const finalKey = buildOriginalKey(assetId, filename, mimeType);
				const key = `${assetId}/pending-${crypto.randomUUID()}.${extensionFor(filename, mimeType)}`;
				const path = storageAdapter.resolvePath(key);

				const uploadUrl = await storageAdapter.getSignedUploadUrl(
					path,
					UPLOAD_URL_TTL_SECONDS,
					mimeType
				);

				const ticket: UploadTicket = {
					assetId,
					key,
					finalKey,
					originalFilename: filename,
					mimeType,
					organizationId: auth.organizationId,
					schemaType,
					fieldPath,
					exp: Date.now() + TICKET_TTL_MS
				};

				return c.json({
					success: true,
					data: {
						assetId,
						uploadUrl,
						// The browser must send the same Content-Type the URL was signed
						// with, or the storage service rejects the PUT.
						headers: { 'Content-Type': mimeType },
						ticket: encryptSecret(JSON.stringify(ticket), secret)
					}
				});
			} catch (error) {
				cmsLogger.error('[Asset API] Could not create upload URL:', error);
				return c.json({ success: false, error: 'Could not create upload URL' }, 500);
			}
		}
	)
	.post(
		'/confirm',
		zValidator('json', confirmUploadRequest, (result, c) => {
			if (!result.success) {
				return c.json(
					{ success: false, error: 'Invalid request body', issues: result.error.issues },
					400
				);
			}
		}),
		async (c) => {
			try {
				const { assetService, config } = c.var.aphexCMS;
				const auth = c.var.auth;

				if (!auth || auth.type === 'partial_session') {
					return c.json({ success: false, error: 'Unauthorized' }, 401);
				}
				if (!hasCapability(auth, 'asset.upload')) {
					return c.json(
						{ success: false, error: 'Forbidden: asset.upload capability required' },
						403
					);
				}

				const secret = config.security?.secretEncryptionKey;
				if (!secret) {
					return c.json({ success: false, error: 'Direct upload is not available' }, 404);
				}

				const body = c.req.valid('json');
				const rawTicket = c.req.header('x-upload-ticket');
				if (!rawTicket) {
					return c.json({ success: false, error: 'Missing upload ticket' }, 400);
				}

				let ticket: UploadTicket;
				try {
					ticket = JSON.parse(decryptSecret(rawTicket, secret)) as UploadTicket;
				} catch {
					// AES-GCM is authenticated, so a failure here means the ticket was
					// forged or tampered with, not merely malformed.
					return c.json({ success: false, error: 'Invalid upload ticket' }, 400);
				}

				if (!ticket.exp || ticket.exp < Date.now()) {
					return c.json({ success: false, error: 'Upload ticket has expired' }, 400);
				}
				if (!ticket.finalKey) {
					return c.json({ success: false, error: 'Invalid upload ticket' }, 400);
				}
				if (ticket.assetId !== body.assetId) {
					return c.json({ success: false, error: 'Upload ticket does not match' }, 400);
				}
				// A ticket is bound to the organization that requested it. Without
				// this, a user who switched organizations — or a stolen ticket — could
				// land an asset in an organization that never authorized the upload.
				if (ticket.organizationId !== auth.organizationId) {
					return c.json({ success: false, error: 'Upload ticket does not match' }, 403);
				}

				const asset = await assetService.finalizeDirectUpload(auth.organizationId, ticket, {
					maxBytes: resolveMaxUploadBytes(c.var.aphexCMS),
					title: body.title,
					description: body.description,
					alt: body.alt,
					creditLine: body.creditLine,
					createdBy: auth.type === 'session' ? auth.user.id : auth.keyId,
					// Resolved here because this route has the schema and the service
					// does not; stamped so a later field rename can't publish the asset.
					private: ticket.schemaType
						? (resolveFieldPrivacy(
								c.var.aphexCMS.cmsEngine.getSchemaTypeByName(ticket.schemaType),
								ticket.fieldPath
							) ?? undefined)
						: undefined,
					allowedMimeTypes: resolveFieldAcceptedFileTypes(
						ticket.schemaType
							? c.var.aphexCMS.cmsEngine.getSchemaTypeByName(ticket.schemaType)
							: undefined,
						ticket.fieldPath
					)
				});

				return c.json({ success: true, data: asset });
			} catch (error) {
				const message = error instanceof Error ? error.message : 'Could not confirm upload';
				cmsLogger.error('[Asset API] Could not confirm direct upload:', error);
				// Verification failures are the caller's problem (nothing was
				// uploaded, or it was too large), not a server fault.
				const isClientFault =
					/not found in storage|exceeds the|not allowed|does not match|cannot inspect|already been confirmed/i.test(
						message
					);
				return c.json({ success: false, error: message }, isClientFault ? 400 : 500);
			}
		}
	);
