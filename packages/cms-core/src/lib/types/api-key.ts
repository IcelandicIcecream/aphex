/**
 * A single API key as the admin surfaces it — the safe, display-only projection
 * of the provider's key row. Never carries the secret (that exists once, at
 * creation). Shared by the `AuthProvider.listApiKeys` port, the settings load,
 * and the `ApiKeysSettings` panel so the shape can't drift between them.
 */
export interface ApiKeySummary {
	id: string;
	name: string | null;
	/** Coarse scopes stored in the key's metadata. */
	permissions: ('read' | 'write')[];
	/** Owning organization (from metadata); used to scope the listing. */
	organizationId?: string;
	createdAt: Date | null;
	lastRequest: Date | null;
	expiresAt: Date | null;
}
