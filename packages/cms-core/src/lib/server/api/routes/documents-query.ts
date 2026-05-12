import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { authToContext } from '../../../local-api/auth-helpers';
import { PermissionError } from '../../../local-api/permissions';
import { cmsLogger } from '../../../utils/logger';
import { queryDocumentsRequest } from '../../../api/schemas/documents';
import type { FindOptions } from '../../../types/filters';
import type { AphexEnv } from '../index';

const DEFAULT_PAGE_SIZE = 20;
const DEFAULT_PAGE = 1;

/**
 * POST /api/documents/query — Advanced document querying with complex
 * filters. Body shape mirrors LocalAPI's `FindOptions`.
 */
export const documentsQueryRouter: Hono<AphexEnv> = new Hono<AphexEnv>().post(
	'/query',
	zValidator('json', queryDocumentsRequest, (result, c) => {
		if (!result.success) {
			return c.json(
				{
					success: false,
					error: 'Bad Request',
					message: 'Document type is required in request body',
					issues: result.error.issues
				},
				400
			);
		}
	}),
	async (c) => {
		try {
			const { localAPI } = c.var.aphexCMS;
			const context = authToContext(c.var.auth);
			const body = c.req.valid('json');
			const documentType = body.type;

			if (!localAPI.hasCollection(documentType)) {
				return c.json(
					{
						success: false,
						error: 'Invalid document type',
						message: `Collection '${documentType}' not found. Available: ${localAPI.getCollectionNames().join(', ')}`
					},
					400
				);
			}

			const page = body.page ?? DEFAULT_PAGE;
			const pageSize = body.pageSize ?? body.limit ?? DEFAULT_PAGE_SIZE;
			const offset = body.offset !== undefined ? body.offset : (page - 1) * pageSize;

			const findOptions: FindOptions = {
				where: body.where as FindOptions['where'],
				limit: pageSize,
				offset,
				sort: body.sort,
				depth: body.depth ?? 0,
				select: body.select as FindOptions['select'],
				perspective: body.perspective ?? 'draft',
				includeChildOrganizations: body.includeChildOrganizations
			};

			const result = await localAPI.getCollection(documentType)!.find(context, findOptions);

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
			cmsLogger.error('Failed to query documents:', error);
			if (error instanceof PermissionError) {
				return c.json({ success: false, error: 'Forbidden', message: error.message }, 403);
			}
			return c.json(
				{
					success: false,
					error: 'Failed to query documents',
					message: error instanceof Error ? error.message : 'Unknown error'
				},
				500
			);
		}
	}
);
