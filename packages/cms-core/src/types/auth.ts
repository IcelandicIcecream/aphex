// types/auth.ts
export interface SessionAuth {
	type: 'session';
	user: {
		id: string;
		email: string;
		name?: string;
		image?: string;
		role?: string;
	};
	session: {
		id: string;
		expiresAt: Date;
	};
}

export interface ApiKeyAuth {
	type: 'api_key';
	keyId: string;
	name: string;
	permissions: ('read' | 'write')[];
	environment?: string;
	lastUsedAt?: Date;
}

export type Auth = SessionAuth | ApiKeyAuth;
