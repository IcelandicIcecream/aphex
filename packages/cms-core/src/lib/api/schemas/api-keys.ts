import { z } from 'zod';

// ---------- Shared ----------

export const apiKeyPermissionSchema = z.enum(['read', 'write']);

// ---------- POST /settings/api-keys ----------

export const createApiKeyRequest = z.object({
	name: z.string().min(1),
	permissions: z.array(apiKeyPermissionSchema).min(1),
	expiresInDays: z.number().int().positive().optional()
});

// ---------- Inferred TS types ----------

export type ApiKeyPermission = z.infer<typeof apiKeyPermissionSchema>;
export type CreateApiKeyRequest = z.infer<typeof createApiKeyRequest>;
