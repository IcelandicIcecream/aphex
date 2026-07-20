// @aphexcms/auth — AuthProvider adapter.
//
// Adapts the AuthService to cms-core's AuthProvider port — the interface the
// CMS engine consumes (packages/cms-core/src/lib/auth/provider.ts). This is the
// seam that makes better-auth swappable: a different backend would ship its own
// AuthProvider implementation against the same port.

import type { AuthProvider } from '@aphexcms/cms-core/server';
import type { AuthService } from './service';

/** Build the cms-core AuthProvider from an AuthService. */
export function createAuthProvider(authService: AuthService): AuthProvider {
	return {
		getSession: (request, db) => authService.getSession(request, db),
		requireSession: (request, db) => authService.requireSession(request, db),
		validateApiKey: (request) => authService.validateApiKey(request),
		requireApiKey: (request, db, permission) => authService.requireApiKey(request, db, permission),
		getUserById: (userId) => authService.getUserById(userId),
		getUserByEmail: (email) => authService.getUserByEmail(email),
		changeUserName: (userId, name) => authService.changeUserName(userId, name),
		changeUserImage: (userId, image) => authService.changeUserImage(userId, image),
		requestPasswordReset: (email, redirectTo) =>
			authService.requestPasswordReset(email, redirectTo),
		resetPassword: (token, newPassword) => authService.resetPassword(token, newPassword)
	};
}
