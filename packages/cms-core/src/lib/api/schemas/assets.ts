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
	status: z.string().nullable()
});

// ---------- GET /assets (list) ----------

export const listAssetsQuery = z.object({
	assetType: z.enum(['image', 'file']).optional(),
	mimeType: z.string().optional(),
	search: z.string().optional(),
	includeSystem: z
		.union([z.boolean(), z.enum(['true', 'false']).transform((value) => value === 'true')])
		.optional(),
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
