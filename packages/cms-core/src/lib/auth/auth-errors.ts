// Custom authentication errors with error codes for better error handling

export type AuthErrorCode =
	| 'no_session'
	| 'session_expired'
	| 'no_organization'
	| 'pending_invitations'
	| 'kicked_from_org'
	| 'unauthorized';

export class AuthError extends Error {
	code: AuthErrorCode;

	constructor(code: AuthErrorCode, message: string) {
		super(message);
		this.code = code;
		this.name = 'AuthError';
	}
}

/**
 * Use this rather than `instanceof`. An auth provider is a separate package that Node
 * can load outside Vite's bundle, with its own copy of this class, so `instanceof` is
 * false for the errors it throws.
 */
export function isAuthError(error: unknown): error is AuthError {
	return error instanceof Error && error.name === 'AuthError' && 'code' in error;
}

// Helper function to create auth errors
export function createAuthError(code: AuthErrorCode, message: string): AuthError {
	return new AuthError(code, message);
}
