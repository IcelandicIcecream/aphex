import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { authToContext } from '../../../local-api/auth-helpers';
import { PermissionError } from '../../../local-api/permissions';
import { cmsLogger } from '../../../utils/logger';
import {
	createDocumentRequest,
	getDocumentsByIdsQuery,
	listDocumentsQuery
} from '../../../api/schemas/documents';
import type { AphexEnv } from '../index';

const DEFAULT_PAGE_SIZE = 20;
const DEFAULT_PAGE = 1;

export const documentsRouter: Hono<AphexEnv> = new Hono<AphexEnv>()
	.get('/', zValidator('query', listDocumentsQuery, (result, c) => {
		if (!result.success) {
			return c.json(
				{
					success: false,
					error: 'Invalid query parameters',
					issues: result.error.issues
				},
				400
			);
		}
	}), async (c) => {
		try {
			const { localAPI } = c.var.aphexCMS;
			const context = authToContext(c.var.auth);
			const q = c.req.valid('query');

			const docType = q.type ?? q.docType;
			const status = q.status;
			const sortParam = Array.isArray(q.sort) ? q.sort.join(',') : q.sort;
			const perspective = q.perspective ?? 'draft';
			const includeChildOrganizations = q.includeChildOrganizations;

			const page = q.page ?? DEFAULT_PAGE;
			const pageSize = q.pageSize ?? q.limit ?? DEFAULT_PAGE_SIZE;
			const offset = (page - 1) * pageSize;
			const depth = q.depth ?? 0;

			if (!docType) {
				return c.json(
					{
						success: false,
						error: 'Bad Request',
						message: 'Document type is required. Use ?type=page or ?docType=page'
					},
					400
				);
			}

			const collection = localAPI.collections[docType];
			if (!collection) {
				return c.json(
					{
						success: false,
						error: 'Invalid document type',
						message: `Collection '${docType}' not found. Available: ${localAPI.getCollectionNames().join(', ')}`
					},
					400
				);
			}

			const where: Record<string, any> = {};
			if (status) {
				where.status = { equals: status };
			}

			const result = await collection.find(context, {
				where: Object.keys(where).length > 0 ? where : undefined,
				limit: pageSize,
				offset,
				depth,
				sort: sortParam || undefined,
				perspective,
				includeChildOrganizations
			});

			return c.json({
				success: true,
				data: result.docs,
				pagination: {
					total: result.totalDocs,
					page: result.page,
					pageSize: result.limit,
					totalPages: result.totalPages,
					hasNextPage: result.hasNextPage,
					hasPrevPage: result.hasPrevPage
				}
			});
		} catch (error) {
			cmsLogger.error('Failed to fetch documents:', error);
			if (error instanceof PermissionError) {
				return c.json(
					{ success: false, error: 'Forbidden', message: error.message },
					403
				);
			}
			return c.json(
				{
					success: false,
					error: 'Failed to fetch documents',
					message: error instanceof Error ? error.message : 'Unknown error'
				},
				500
			);
		}
	})
	.get('/by-ids', zValidator('query', getDocumentsByIdsQuery, (result, c) => {
		if (!result.success) {
			return c.json(
				{
					success: false,
					error: 'Invalid query parameters',
					issues: result.error.issues
				},
				400
			);
		}
	}), async (c) => {
		try {
			const { localAPI } = c.var.aphexCMS;
			const context = authToContext(c.var.auth);
			const { ids } = c.req.valid('query');

			const docs = await localAPI.findDocumentsByIds(context, ids);
			return c.json({ success: true, data: docs });
		} catch (error) {
			cmsLogger.error('Failed to batch-fetch documents:', error);
			if (error instanceof PermissionError) {
				return c.json({ success: false, error: 'Forbidden', message: error.message }, 403);
			}
			return c.json(
				{
					success: false,
					error: 'Failed to fetch documents',
					message: error instanceof Error ? error.message : 'Unknown error'
				},
				500
			);
		}
	})
	.post('/', zValidator('json', createDocumentRequest, (result, c) => {
		if (!result.success) {
			return c.json(
				{
					success: false,
					error: 'Invalid request body',
					issues: result.error.issues
				},
				400
			);
		}
	}), async (c) => {
		try {
			const { localAPI } = c.var.aphexCMS;
			const context = authToContext(c.var.auth);
			const parsed = c.req.valid('json');

			const documentType = parsed.type;
			const documentData = (parsed.draftData ?? parsed.data)!;
			const shouldPublish = parsed.publish ?? false;

			const collection = localAPI.collections[documentType];
			if (!collection) {
				return c.json(
					{
						success: false,
						error: 'Invalid document type',
						message: `Collection '${documentType}' not found. Available: ${localAPI.getCollectionNames().join(', ')}`
					},
					400
				);
			}

			const result = await collection.create(context, documentData, {
				publish: shouldPublish
			});

			return c.json(
				{
					success: true,
					data: result.document,
					validation: result.validation
				},
				201
			);
		} catch (error) {
			cmsLogger.error('Failed to create document:', error);
			if (error instanceof PermissionError) {
				return c.json(
					{ success: false, error: 'Forbidden', message: error.message },
					403
				);
			}
			if (error instanceof Error && error.message.includes('validation errors')) {
				return c.json(
					{ success: false, error: 'Validation failed', message: error.message },
					400
				);
			}
			return c.json(
				{
					success: false,
					error: 'Failed to create document',
					message: error instanceof Error ? error.message : 'Unknown error'
				},
				500
			);
		}
	});
