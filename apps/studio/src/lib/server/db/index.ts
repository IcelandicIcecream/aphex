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

export const client = postgres(databaseUrl, {
	max: 50,
	idle_timeout: 20, // Release idle connections after 20s
	connect_timeout: 10, // Fail fast if can't connect in 10s
	max_lifetime: 60 * 5 // Recycle connections every 5 minutes
});
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
