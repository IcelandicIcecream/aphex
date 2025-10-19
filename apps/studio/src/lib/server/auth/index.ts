// apps/studio/src/lib/server/auth/index.ts

import type { AuthProvider } from '@aphex/cms-core/server';
import { db, drizzleDb } from '$lib/server/db';
import { createAuthInstance } from './better-auth/instance.js';
import { authService } from './service';

// This file is the clean, public-facing API for the app's auth module.

// 1. Create the Better Auth instance by injecting both the full adapter and the raw client.
export const auth = createAuthInstance(db, drizzleDb);

// 2. Export the authService (which uses the 'auth' instance).
export { authService } from './service';

// 3. Export the authProvider, which connects the authService to the CMS core hook.
export const authProvider: AuthProvider = {
	getSession: (request, db) => authService.getSession(request, db),
	requireSession: (request, db) => authService.requireSession(request, db),
	validateApiKey: (request, db) => authService.validateApiKey(request, db),
	requireApiKey: (request, db, permission) => authService.requireApiKey(request, db, permission),
	changeUserName: (userId, name) => authService.changeUserName(userId, name)
};
