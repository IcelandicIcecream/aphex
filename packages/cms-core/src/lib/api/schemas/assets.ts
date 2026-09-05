import { z } from 'zod';

// ---------- Shared shapes ----------

export const assetSchema = z
	.object({
		id: z.string(),
		organizationId: z.string(),
		assetType: z.string(),
		filename: z.string(),
		originalFilename: z.string(),
		mimeType: z.string(),
		size: z.number(),
		url: z.string(),
		path: z.string(),
		storageAdapter: z.string(),
		width: z.number().nullable(),
		height: z.number().nullable(),
		metadata: z.unknown().nullable().optional(),
		title: z.string().nullable(),
		description: z.string().nullable(),
		alt: z.string().nullable(),
		creditLine: z.string().nullable(),
		createdBy: z.string().nullable(),
		createdAt: z.union([z.string(), z.date()]).nullable(),
		updatedAt: z.union([z.string(), z.date()]).nullable()
	})
	.passthrough();

export const assetReferenceSchema = z.object({
	documentId: z.string(),
	type: z.string(),
	title: z.string(),
	status: z.string().nullable(),
	/**
	 * Where in the document the asset is used (`coverImage`,
	 * `content[13].images[0]`). Annotated from the asset-reference index, so it is
	 * absent when the index has no row — the reference itself is still authoritative.
	 */
	fieldPaths: z.array(z.string()).optional()
});

// ---------- GET /assets (list) ----------

export const listAssetsQuery = z.object({
	assetType: z.enum(['image', 'file']).optional(),
	mimeType: z.string().optional(),
	/**
	 * Coarse media kind, resolved against `mimeType` in SQL. A separate axis from
	 * `assetType` ('image' | 'file'), which records how the upload pipeline treated
	 * the file rather than what the editor is hunting for — hence `svg` being its
	 * own bucket rather than an image.
	 */
	category: z.enum(['image', 'svg', 'video', 'audio', 'document']).optional(),
	/** Matches filename, title, alt and description. Case-insensitive. */
	search: z.string().optional(),
	/**
	 * Whether the asset is referenced by any document, answered from the
	 * asset-reference index as an indexed EXISTS. Impossible to offer before that
	 * index existed: references were resolved by scanning every document's JSON,
	 * so a *filter* cost assets x documents.
	 */
	usage: z.enum(['in-use', 'unused']).optional(),
	includeSystem: z
		.union([z.boolean(), z.enum(['true', 'false']).transform((value) => value === 'true')])
		.optional(),
	/**
	 * Ordering, applied in SQL over the whole collection.
	 *
	 * It has to be a query parameter: the admin used to sort the loaded page in
	 * the browser, which meant "Name: A–Z" on page 2 of 300 assets alphabetised
	 * those 30 rows and nothing else. The result looked sorted and wasn't, which
	 * is the failure mode that never gets reported as a bug.
	 */
	sort: z.enum(['newest', 'oldest', 'name-asc', 'name-desc']).optional(),
	limit: z.coerce.number().int().min(1).max(500).optional(),
	offset: z.coerce.number().int().min(0).optional()
});

export const listAssetsResponse = z.object({
	success: z.literal(true),
	data: z.array(assetSchema),
	pagination: z.object({
		total: z.number(),
		page: z.number(),
		pageSize: z.number(),
		totalPages: z.number(),
		hasNextPage: z.boolean(),
		hasPrevPage: z.boolean()
	})
});

// ---------- GET /assets/[id] ----------

export const getAssetResponse = z.object({
	success: z.literal(true),
	data: assetSchema
});

// ---------- PATCH /assets/[id] ----------

/**
 * Metadata patch. Every field is a tri-state: omitted leaves the column alone,
 * `null` clears it, a string sets it.
 *
 * `.nullable()` is the load-bearing part. Without it an emptied input could only
 * be sent as `undefined`, which `JSON.stringify` drops from the body entirely —
 * so metadata could be added but never removed.
 */
export const updateAssetRequest = z.object({
	/**
	 * Display filename. Not nullable — an asset always has a name, so there is no
	 * "clear it" state; omit the field to leave it alone.
	 */
	originalFilename: z.string().trim().min(1).max(255).optional(),
	title: z.string().nullable().optional(),
	description: z.string().nullable().optional(),
	alt: z.string().nullable().optional(),
	creditLine: z.string().nullable().optional()
});

export const updateAssetResponse = z.object({
	success: z.literal(true),
	data: assetSchema
});

// ---------- DELETE /assets/[id] ----------

export const deleteAssetResponse = z.object({
	success: z.literal(true)
});

/**
 * Body of the 409 returned when an asset is still referenced. Hand-written
 * rather than zod because it's a response shape (see the API-contracts note in
 * CLAUDE.md), and it arrives on the client as `ApiError.response`.
 *
 * `unregisteredTypes` lists the schema types among `references` that are no
 * longer registered in `schemaTypes`. Those documents cannot be opened in the
 * admin, so the reference cannot be removed by hand — a non-empty array means
 * force-delete is the user's only route.
 */
export interface AssetDeleteConflict {
	success: false;
	error: string;
	references: AssetReference[];
	unregisteredTypes: string[];
}

// ---------- DELETE /assets/bulk ----------

export const bulkDeleteAssetsRequest = z.object({
	ids: z.array(z.string()).min(1).max(100)
});

export const bulkDeleteAssetsResponse = z.object({
	success: z.literal(true),
	data: z.object({
		deleted: z.number(),
		failed: z.number()
	})
});

/**
 * Body of the 409 from a bulk delete blocked by references — the batch sibling
 * of {@link AssetDeleteConflict}.
 *
 * It reports ids rather than the references themselves: a batch of a hundred
 * assets could carry thousands of referencing documents, and the caller's next
 * move is to narrow the selection or force, not to read them all. Same
 * `unregisteredTypes` meaning, and the same implication — non-empty means force
 * is the only route, because those documents cannot be opened in the admin.
 */
export interface BulkAssetDeleteConflict {
	success: false;
	error: string;
	referencedIds: string[];
	unregisteredTypes: string[];
}

// ---------- GET /assets/[id]/references ----------

export const getAssetReferencesResponse = z.object({
	success: z.literal(true),
	data: z.object({
		references: z.array(assetReferenceSchema),
		total: z.number()
	})
});

// ---------- POST /assets/references/counts ----------

export const assetReferenceCountsRequest = z.object({
	ids: z.array(z.string())
});

export const assetReferenceCountsResponse = z.object({
	success: z.literal(true),
	data: z.record(z.string(), z.number())
});

/**
 * Ask for a URL the browser can upload directly to.
 *
 * Deliberately carries no key or path. The server mints the asset id and
 * derives the destination from it, because a caller-supplied key would let
 * anyone holding `asset.upload` write anywhere in the bucket — including over
 * an existing asset's original.
 */
export const createUploadUrlRequest = z.object({
	filename: z.string().trim().min(1).max(255),
	mimeType: z.string().trim().min(1).max(255),
	/**
	 * Declared up front so an oversized upload is refused before a write grant
	 * is issued at all. It is a claim, not proof — the size is verified against
	 * the stored object on confirm.
	 */
	size: z.number().int().positive(),
	/** Where the asset is being used, for privacy resolution. */
	schemaType: z.string().trim().max(255).optional(),
	fieldPath: z.string().trim().max(255).optional()
});

/**
 * Report that a direct upload finished, so the asset row can be created.
 *
 * Only the id is trusted. Everything describing the object — that it exists,
 * how large it is — is read back from storage, never taken from the client.
 */
export const confirmUploadRequest = z.object({
	assetId: z.string().uuid(),
	title: z.string().trim().max(255).optional(),
	description: z.string().trim().max(2000).optional(),
	alt: z.string().trim().max(1000).optional(),
	creditLine: z.string().trim().max(255).optional()
});

// ---------- Inferred TS types ----------

export type AssetDTO = z.infer<typeof assetSchema>;
export type AssetReference = z.infer<typeof assetReferenceSchema>;

export type ListAssetsQuery = z.input<typeof listAssetsQuery>;
export type ListAssetsResponse = z.infer<typeof listAssetsResponse>;

export type GetAssetResponse = z.infer<typeof getAssetResponse>;

export type UpdateAssetRequest = z.infer<typeof updateAssetRequest>;
export type UpdateAssetResponse = z.infer<typeof updateAssetResponse>;

export type DeleteAssetResponse = z.infer<typeof deleteAssetResponse>;

export type BulkDeleteAssetsRequest = z.infer<typeof bulkDeleteAssetsRequest>;
export type BulkDeleteAssetsResponse = z.infer<typeof bulkDeleteAssetsResponse>;

export type GetAssetReferencesResponse = z.infer<typeof getAssetReferencesResponse>;

export type AssetReferenceCountsRequest = z.infer<typeof assetReferenceCountsRequest>;
export type AssetReferenceCountsResponse = z.infer<typeof assetReferenceCountsResponse>;

export type CreateUploadUrlRequest = z.infer<typeof createUploadUrlRequest>;
export type ConfirmUploadRequest = z.infer<typeof confirmUploadRequest>;
