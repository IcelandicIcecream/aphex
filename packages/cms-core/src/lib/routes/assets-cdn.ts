import type { RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = async ({ params, locals, setHeaders, request }) => {
	console.log('[Asset CDN] ========== ROUTE HIT ==========');
	console.log('[Asset CDN] Params:', params);
	try {
		const { assetService, databaseAdapter, storageAdapter, cmsEngine, config } = locals.aphexCMS;
		let auth = locals.auth;
		const { id, filename } = params;

		console.log('[Asset CDN] Request for asset:', id, filename);
		console.log('[Asset CDN] Has auth?', !!auth);

		// If no session auth, check for API key in headers
		if (!auth) {
			const apiKey = request.headers.get('x-api-key');
			console.log('[Asset CDN] API key present?', !!apiKey);
			if (apiKey && config.auth?.provider) {
				try {
					const apiKeyAuth = await config.auth.provider.validateApiKey(request, databaseAdapter);
					if (apiKeyAuth) {
						auth = apiKeyAuth;
						console.log('[Asset CDN] Authenticated via API key, org:', apiKeyAuth.organizationId);
					}
				} catch (err) {
					console.warn('[Asset CDN] API key validation failed:', err);
				}
			}
		}

		console.log('[Asset CDN] Auth type:', auth?.type);

		if (!id) {
			return new Response('Asset ID is required', { status: 400 });
		}

		// Try to fetch asset globally first (bypasses RLS for public assets)
		const asset = await assetService.findAssetByIdGlobal(id);

		console.log('[Asset CDN] Asset found globally?', !!asset);

		if (!asset) {
			console.warn('[Asset CDN] Asset not found:', id);
			return new Response('Asset not found', { status: 404 });
		}

		const organizationId = auth?.organizationId;
		console.log('[Asset CDN] Auth object:', JSON.stringify(auth, null, 2));
		console.log('[Asset CDN] Auth organizationId:', organizationId);
		console.log('[Asset CDN] Asset organizationId:', asset.organizationId);

		// Check if this asset is used in a private field
		// The field metadata (schemaType and fieldPath) is stored when the asset is uploaded
		let isPrivate = false;

		const schemaType = asset.metadata?.schemaType;
		const fieldPath = asset.metadata?.fieldPath;

		if (schemaType && fieldPath) {
			// Get the schema definition from IN-MEMORY config (always up-to-date with code changes)
			const schema = cmsEngine.getSchemaTypeByName(schemaType);
			console.log(`[Asset CDN] Schema lookup for ${schemaType}:`, {
				found: !!schema,
				fieldCount: schema?.fields?.length
			});

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
				console.log(`[Asset CDN] Field lookup for ${fieldPath}:`, {
					found: !!field,
					type: field?.type,
					private: field?.private
				});

				if (field && field.type === 'image') {
					isPrivate = field.private === true;
					console.log(
						`[Asset CDN] Field check: ${schemaType}.${fieldPath} - private: ${isPrivate}`
					);
				} else {
					console.warn(`[Asset CDN] Could not find field: ${schemaType}.${fieldPath}`);
				}
			}
		} else {
			console.log('[Asset CDN] No field metadata - treating as public');
		}

		console.log('[Asset CDN] Asset privacy result:', { isPrivate, schemaType, fieldPath });

		// If asset is private, require auth
		if (isPrivate && !organizationId) {
			console.warn('[Asset CDN] Private asset accessed without auth - DENIED');
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
				console.log(
					`[Asset CDN] Checking hierarchy: user org ${organizationId} has ${childOrgs.length} children, asset org ${asset.organizationId} is child? ${hasAccess}`
				);
			}

			if (!hasAccess) {
				console.warn(
					`[Asset CDN] Org ${organizationId} cannot access asset from org ${asset.organizationId} - FORBIDDEN`
				);
				return new Response('Forbidden', { status: 403 });
			}

			console.log(
				`[Asset CDN] Private asset access ALLOWED - user org ${organizationId} has access to asset org ${asset.organizationId}`
			);
		} else if (!isPrivate) {
			console.log('[Asset CDN] Public asset access ALLOWED');
		}

		console.log('[Asset CDN] Asset found:', {
			id: asset.id,
			path: asset.path,
			mimeType: asset.mimeType,
			storageAdapter: asset.storageAdapter
		});

		// If asset has a direct URL (S3/R2), redirect to it
		if (asset.url && asset.url.startsWith('http')) {
			console.log('[Asset CDN] Redirecting to external URL:', asset.url);
			return new Response(null, {
				status: 302,
				headers: { Location: asset.url }
			});
		}

		// Otherwise, serve from local storage
		if (!storageAdapter?.getObject) {
			console.error('[Asset CDN] Storage adapter does not support getObject');
			return new Response('Storage adapter does not support file serving', { status: 500 });
		}

		console.log('[Asset CDN] Reading file from storage:', asset.path);
		const fileBuffer = await storageAdapter.getObject(asset.path);

		console.log('[Asset CDN] Serving file:', {
			size: fileBuffer.length,
			mimeType: asset.mimeType
		});

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
		console.error('[Asset CDN] Error serving asset:', error);
		return new Response('Failed to serve asset', { status: 500 });
	}
};
