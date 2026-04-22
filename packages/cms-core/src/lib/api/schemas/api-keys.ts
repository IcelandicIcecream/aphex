import { z } from 'zod';
import { ALL_CAPABILITIES, type Capability } from '../../types/capabilities';

// ---------- Shared ----------

export const apiKeyPermissionSchema = z.enum(['read', 'write']);

export const apiKeyCapabilitySchema = z.enum(
	ALL_CAPABILITIES as unknown as [Capability, ...Capability[]]
);

// ---------- POST /settings/api-keys ----------

// Either provide coarse `permissions` (legacy r/w scopes) or fine-grained
// `capabilities` — at least one must be present. Capabilities win at runtime
// when both are provided (see resolveCapabilities).
export const createApiKeyRequest = z
	.object({
		name: z.string().min(1),
		permissions: z.array(apiKeyPermissionSchema).optional(),
		capabilities: z.array(apiKeyCapabilitySchema).optional(),
		expiresInDays: z.number().int().positive().optional()
	})
	.refine(
		(v) =>
			(v.permissions && v.permissions.length > 0) || (v.capabilities && v.capabilities.length > 0),
		{ message: 'Provide at least one of `permissions` or `capabilities`.' }
	);

// ---------- Inferred TS types ----------

export type ApiKeyPermission = z.infer<typeof apiKeyPermissionSchema>;
export type ApiKeyCapability = z.infer<typeof apiKeyCapabilitySchema>;
export type CreateApiKeyRequest = z.infer<typeof createApiKeyRequest>;
