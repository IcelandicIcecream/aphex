import { Hono } from 'hono';
import { cmsLogger } from '../../../utils/logger';
import type { AphexEnv } from '../index';

// Annotated as Hono<AphexEnv> (not the full chained type) so cms-core's
// .d.ts emit doesn't blow up under TS7056. Chained-route inference would
// only matter for hono/client RPC, which is out of scope here.
export const schemasRouter: Hono<AphexEnv> = new Hono<AphexEnv>()
	.get('/', (c) => {
		const { cmsEngine } = c.var.aphexCMS;
		// Read from config so validation functions survive (not from DB).
		const schemas = cmsEngine.config.schemaTypes;
		return c.json({ success: true, data: schemas });
	})
	.get('/:type', (c) => {
		const type = c.req.param('type');
		const { cmsEngine } = c.var.aphexCMS;

		if (!type) {
			return c.json({ error: 'Schema type is required' }, 400);
		}

		cmsLogger.debug('GETTING SCHEMA TYPE FROM: ', type);
		const schema = cmsEngine.getSchemaTypeByName(type);
		cmsLogger.debug('SCHEMA: ', schema);

		if (!schema) {
			return c.json({ error: `Schema type '${type}' not found` }, 404);
		}

		return c.json({ success: true, data: schema });
	});
