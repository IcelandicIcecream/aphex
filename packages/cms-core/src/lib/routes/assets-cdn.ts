import type { RequestHandler } from '@sveltejs/kit';
import { cmsLogger } from '../utils/logger';

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

		// If asset has a direct URL (S3/R2), redirect to it
		if (asset.url && asset.url.startsWith('http')) {
			return new Response(null, {
				status: 302,
				headers: { Location: asset.url }
			});
		}

		// Otherwise, serve from local storage
		if (!storageAdapter?.getObject) {
			cmsLogger.error('[Asset CDN]', 'Storage adapter does not support getObject');
			return new Response('Storage adapter does not support file serving', { status: 500 });
		}

		const fileBuffer = await storageAdapter.getObject(asset.path);

		// Set appropriate headers for the asset
		setHeaders({
			'Content-Type': asset.mimeType || 'application/octet-stream',
			'Content-Length': fileBuffer.length.toString(),
			'Cache-Control': 'public, max-age=31536000, immutable', // Cache for 1 year
			'Content-Disposition': `inline; filename="${encodeURIComponent(asset.originalFilename || asset.filename)}"`,
			...(asset.mimeType?.startsWith('image/') && {
				'Accept-Ranges': 'bytes'
			})
		});

		// Convert Buffer to ArrayBuffer for Response
		const arrayBuffer = fileBuffer.buffer.slice(
			fileBuffer.byteOffset,
			fileBuffer.byteOffset + fileBuffer.byteLength
		) as ArrayBuffer;

		return new Response(arrayBuffer);
	} catch (error) {
		cmsLogger.error('[Asset CDN]', 'Error serving asset:', error);
		return new Response('Failed to serve asset', { status: 500 });
	}
};
