import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { env } from '$env/dynamic/private';
import { createPostgreSQLProvider, pgConnectionUrl } from '@aphexcms/postgresql-adapter';
import * as cmsSchema from './cms-schema';
import * as authSchema from './auth-schema';

const schema = {
	...cmsSchema,
	...authSchema
};

import type { DatabaseAdapter } from '@aphexcms/cms-core/server';

const databaseUrl = pgConnectionUrl(env);

export const client = postgres(databaseUrl, { max: 10 });
export const drizzleDb = drizzle(client, { schema });

const provider = createPostgreSQLProvider({
	client,
	multiTenancy: {
		enableRLS: true,
		enableHierarchy: true
	}
});

const adapter = provider.createAdapter();
export const db = adapter as DatabaseAdapter;
