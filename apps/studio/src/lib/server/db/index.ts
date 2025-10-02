import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import { env } from '$env/dynamic/private';

if (!env.DATABASE_URL) throw new Error('DATABASE_URL is not set');

const client = postgres(env.DATABASE_URL, {
	max: 10, // Maximum connections in pool
	idle_timeout: 20, // Close idle connections after 20 seconds
	connect_timeout: 10 // Connection timeout in seconds
});

export const db = drizzle(client, { schema });
