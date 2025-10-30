// Custom authentication errors with error codes for better error handling

export type AuthErrorCode =
	| 'no_session'
	| 'session_expired'
	| 'no_organization'
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

// Helper function to create auth errors
export function createAuthError(code: AuthErrorCode, message: string): AuthError {
	return new AuthError(code, message);
}
