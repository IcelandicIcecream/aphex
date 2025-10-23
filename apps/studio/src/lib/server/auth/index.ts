// apps/studio/src/lib/server/auth/index.ts

import type { AuthProvider } from '@aphex/cms-core/server';
import { authService } from './service';

// This file is the clean, public-facing API for the app's auth module.

// 1. Export the auth instance (from separate file to avoid circular dependency)
export { auth } from './instance.js';

// 2. Export the authService (which uses the 'auth' instance).
export { authService } from './service';

// 3. Export the authProvider, which connects the authService to the CMS core hook.
export const authProvider: AuthProvider = {
	getSession: (request, db) => authService.getSession(request, db),
	requireSession: (request, db) => authService.requireSession(request, db),
	validateApiKey: (request, db) => authService.validateApiKey(request, db),
	requireApiKey: (request, db, permission) => authService.requireApiKey(request, db, permission),
	getUserById: (userId) => authService.getUserById(userId),
	changeUserName: (userId, name) => authService.changeUserName(userId, name),
	requestPasswordReset: (email, redirectTo) => authService.requestPasswordReset(email, redirectTo),
	resetPassword: (token, newPassword) => authService.resetPassword(token, newPassword)
};
