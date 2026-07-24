import { z } from 'zod';

const jsonRecord = z.record(z.string(), z.unknown());

// ---------- Shared shapes ----------

export const documentMetaSchema = z
	.object({
		status: z.enum(['draft', 'published', 'unpublished']),
		publishedAt: z.string().nullable().optional(),
		updatedAt: z.string().optional(),
		createdAt: z.string().optional(),
		publishedHash: z.string().nullable().optional(),
		draftHash: z.string().nullable().optional(),
		// CAS guard — echo back as `expectedRevision` on the next write so a stale
		// save (second tab, an agent) surfaces as a conflict instead of silently
		// overwriting a change made after this read.
		revision: z.number().optional()
	})
	.passthrough();

export const documentSchema = z
	.object({
		id: z.string(),
		type: z.string(),
		draftData: jsonRecord.nullable().optional(),
		publishedData: jsonRecord.nullable().optional(),
		_meta: documentMetaSchema.optional()
	})
	.passthrough();

export const paginationMetaSchema = z.object({
	total: z.number(),
	page: z.number(),
	pageSize: z.number(),
	totalPages: z.number(),
	hasNextPage: z.boolean(),
	hasPrevPage: z.boolean()
});

// ---------- GET /documents (list) ----------

export const listDocumentsQuery = z.object({
	type: z.string().optional(),
	docType: z.string().optional(), // legacy alias
	status: z.string().optional(),
	page: z.coerce.number().int().min(1).optional(),
	pageSize: z.coerce.number().int().min(1).max(200).optional(),
	limit: z.coerce.number().int().min(1).max(200).optional(), // legacy alias for pageSize
	depth: z.coerce.number().int().min(0).max(5).optional(),
	sort: z.union([z.string(), z.array(z.string())]).optional(),
	perspective: z.enum(['draft', 'published']).optional(),
	includeChildOrganizations: z
		.union([z.boolean(), z.enum(['true', 'false'])])
		.optional()
		.transform((v) => v === true || v === 'true')
});

export const listDocumentsResponse = z.object({
	success: z.literal(true),
	data: z.array(documentSchema),
	pagination: paginationMetaSchema
});

// ---------- GET /documents/by-ids (batch lookup) ----------
// Fetch many docs in one round-trip. Used by the publish-guard reference
// check and by ArrayField row hydration so an array of N references costs
// one HTTP call instead of N. Caller passes ids as a comma-separated list.

export const getDocumentsByIdsQuery = z.object({
	ids: z
		.string()
		.transform((v) => v.split(',').filter(Boolean))
		.refine((arr) => arr.length > 0 && arr.length <= 100, {
			message: 'ids must contain between 1 and 100 entries'
		})
});

// ---------- POST /documents (create) ----------

export const createDocumentRequest = z
	.object({
		type: z.string().min(1),
		draftData: jsonRecord.optional(),
		data: jsonRecord.optional(),
		publish: z.boolean().optional()
	})
	.refine((v) => v.draftData !== undefined || v.data !== undefined, {
		message: 'Either draftData or data is required'
	});

export const createDocumentResponse = z.object({
	success: z.literal(true),
	data: documentSchema,
	validation: z.unknown().optional()
});

// ---------- GET /documents/[id] ----------

export const getDocumentResponse = z.object({
	success: z.literal(true),
	data: documentSchema
});

// ---------- PUT /documents/[id] (update) ----------

export const updateDocumentRequest = z
	.object({
		draftData: jsonRecord.optional(),
		data: jsonRecord.optional(),
		publish: z.boolean().optional(),
		// Compare-and-swap guard: the revision the caller last read (from
		// `_meta.revision`). Omit to skip the check (last-write-wins).
		expectedRevision: z.number().optional()
	})
	.refine((v) => v.draftData !== undefined || v.data !== undefined, {
		message: 'Either draftData or data is required'
	});

export const updateDocumentResponse = z.object({
	success: z.literal(true),
	data: documentSchema,
	validation: z.unknown().optional()
});

// ---------- DELETE /documents/[id] ----------

export const deleteDocumentResponse = z.object({
	success: z.literal(true),
	message: z.string().optional()
});

// ---------- POST /documents/[id]/publish ----------

// Body is optional (a bare POST with no body is still valid) — only carries
// the CAS guard, so parse leniently rather than requiring a body at all.
export const publishDocumentRequest = z.object({
	expectedRevision: z.number().optional()
});

export const publishDocumentResponse = z.object({
	success: z.literal(true),
	data: documentSchema,
	message: z.string().optional()
});

// ---------- DELETE /documents/[id]/publish (unpublish) ----------

export const unpublishDocumentRequest = z.object({
	expectedRevision: z.number().optional()
});

export const unpublishDocumentResponse = z.object({
	success: z.literal(true),
	data: documentSchema,
	message: z.string().optional()
});

// ---------- POST /documents/query ----------

// `where` and `select` are intentionally loose — the filter DSL is complex
// and already validated by LocalAPI.find(). Zod's job here is to catch shape
// errors on the scalar fields (type, pagination, perspective, etc).
export const queryDocumentsRequest = z.object({
	type: z.string().min(1),
	where: z.unknown().optional(),
	select: z.unknown().optional(),
	sort: z.union([z.string(), z.array(z.string())]).optional(),
	page: z.coerce.number().int().min(1).optional(),
	pageSize: z.coerce.number().int().min(1).max(500).optional(),
	limit: z.coerce.number().int().min(1).max(500).optional(),
	offset: z.coerce.number().int().min(0).optional(),
	depth: z.coerce.number().int().min(0).max(5).optional(),
	perspective: z.enum(['draft', 'published']).optional(),
	includeChildOrganizations: z.boolean().optional()
});

export type QueryDocumentsRequest = z.infer<typeof queryDocumentsRequest>;

// ---------- GET /documents/[id]/versions (list) ----------

export const listVersionsQuery = z.object({
	limit: z.coerce.number().int().min(1).max(200).optional(),
	offset: z.coerce.number().int().min(0).optional()
});

export const documentVersionSchema = z
	.object({
		id: z.string(),
		documentId: z.string(),
		organizationId: z.string(),
		versionNumber: z.number(),
		eventType: z.enum(['draft', 'publish', 'restore']),
		data: jsonRecord.nullable(),
		createdBy: z.string().nullable(),
		createdByName: z.string().nullable().optional(),
		createdAt: z.union([z.string(), z.date()]).nullable()
	})
	.passthrough();

export const listVersionsResponse = z.object({
	success: z.literal(true),
	data: z.array(documentVersionSchema),
	total: z.number()
});

// ---------- GET /documents/[id]/versions/[version] ----------

export const getVersionResponse = z.object({
	success: z.literal(true),
	data: documentVersionSchema
});

// ---------- POST /documents/[id]/versions/[version]/restore ----------

export const restoreVersionRequest = z.object({
	expectedRevision: z.number().optional()
});

export const restoreVersionResponse = z.object({
	success: z.literal(true),
	data: documentSchema,
	message: z.string().optional()
});

// ---------- POST /documents/:id/schedule ----------

export const scheduleDocumentRequest = z.object({
	/** Which action to run at `runAt`. */
	action: z.enum(['publish', 'unpublish']),
	/** ISO-8601 timestamp for when the action should run. */
	runAt: z.string().datetime()
});

export const scheduleDocumentResponse = z.object({
	success: z.literal(true),
	// The scheduled job's identity + when it will run (job payload is identifiers only).
	data: z.object({
		jobId: z.string(),
		type: z.string(),
		runAt: z.string(),
		status: z.string()
	}),
	message: z.string().optional()
});

// ---------- Inferred TS types ----------

export type DocumentDTO = z.infer<typeof documentSchema>;
export type PaginationMeta = z.infer<typeof paginationMetaSchema>;

export type ListDocumentsQuery = z.input<typeof listDocumentsQuery>;
export type ListDocumentsResponse = z.infer<typeof listDocumentsResponse>;

export type CreateDocumentRequest = z.infer<typeof createDocumentRequest>;
export type CreateDocumentResponse = z.infer<typeof createDocumentResponse>;

export type GetDocumentResponse = z.infer<typeof getDocumentResponse>;

export type UpdateDocumentRequest = z.infer<typeof updateDocumentRequest>;
export type UpdateDocumentResponse = z.infer<typeof updateDocumentResponse>;

export type DeleteDocumentResponse = z.infer<typeof deleteDocumentResponse>;
export type PublishDocumentRequest = z.infer<typeof publishDocumentRequest>;
export type PublishDocumentResponse = z.infer<typeof publishDocumentResponse>;
export type UnpublishDocumentRequest = z.infer<typeof unpublishDocumentRequest>;
export type UnpublishDocumentResponse = z.infer<typeof unpublishDocumentResponse>;
export type ScheduleDocumentRequest = z.infer<typeof scheduleDocumentRequest>;
export type ScheduleDocumentResponse = z.infer<typeof scheduleDocumentResponse>;

export type DocumentVersion = z.infer<typeof documentVersionSchema>;
export type ListVersionsQuery = z.input<typeof listVersionsQuery>;
export type ListVersionsResponse = z.infer<typeof listVersionsResponse>;
export type GetVersionResponse = z.infer<typeof getVersionResponse>;
export type RestoreVersionRequest = z.infer<typeof restoreVersionRequest>;
export type RestoreVersionResponse = z.infer<typeof restoreVersionResponse>;
