// Separate file for auth instance to avoid circular dependency
import { db, drizzleDb } from '$lib/server/db';
import { email } from '$lib/server/email';
import { createAuthInstance } from './better-auth/instance.js';

// Create the Better Auth instance by injecting the database and email adapter.
export const auth = createAuthInstance(db, drizzleDb, email);
