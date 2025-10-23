// Separate file for auth instance to avoid circular dependency
import { db, drizzleDb } from '$lib/server/db';
import { createAuthInstance } from './better-auth/instance.js';

// Create the Better Auth instance by injecting both the full adapter and the raw client.
export const auth = createAuthInstance(db, drizzleDb);
