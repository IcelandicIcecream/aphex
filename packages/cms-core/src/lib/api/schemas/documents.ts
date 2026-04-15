import { z } from 'zod';

const jsonRecord = z.record(z.string(), z.unknown());

export const documentMetaSchema = z.object({
	status: z.enum(['draft', 'published', 'unpublished']),
	publishedAt: z.string().nullable().optional(),
	updatedAt: z.string().optional(),
	createdAt: z.string().optional()
});

export const documentSchema = z
	.object({
		id: z.string(),
		type: z.string(),
		draftData: jsonRecord.nullable().optional(),
		publishedData: jsonRecord.nullable().optional(),
		_meta: documentMetaSchema.optional()
	})
	.passthrough();

export const updateDocumentRequest = z
	.object({
		draftData: jsonRecord.optional(),
		data: jsonRecord.optional(),
		publish: z.boolean().optional()
	})
	.refine((v) => v.draftData !== undefined || v.data !== undefined, {
		message: 'Either draftData or data is required'
	});

export const updateDocumentResponse = z.object({
	success: z.literal(true),
	data: documentSchema,
	validation: z.unknown().optional()
});

export type DocumentDTO = z.infer<typeof documentSchema>;
export type UpdateDocumentRequest = z.infer<typeof updateDocumentRequest>;
export type UpdateDocumentResponse = z.infer<typeof updateDocumentResponse>;
