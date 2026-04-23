import { z } from 'zod';
import { ALL_CAPABILITIES, normalizeCapabilities, type Capability } from '../../types/capabilities';

// ---------- Shared ----------

export const apiKeyPermissionSchema = z.enum(['read', 'write']);

export const apiKeyCapabilitySchema = z.enum(
	ALL_CAPABILITIES as unknown as [Capability, ...Capability[]]
);

// ---------- POST /settings/api-keys ----------

// Two provisioning modes:
//   1. Coarse `permissions`: 'read' alone, or 'write' (always implies read).
//   2. Fine-grained `capabilities`: explicit allowlist; writes auto-include
//      the matching read cap during normalization.
// Exactly one of the two should be supplied (neither is invalid).
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
	)
	.transform((v) => ({
		...v,
		permissions: v.permissions
			? v.permissions.includes('write')
				? (['read', 'write'] as Array<'read' | 'write'>)
				: (['read'] as Array<'read' | 'write'>)
			: undefined,
		capabilities: v.capabilities ? normalizeCapabilities(v.capabilities) : undefined
	}));

// ---------- Inferred TS types ----------

export type ApiKeyPermission = z.infer<typeof apiKeyPermissionSchema>;
export type ApiKeyCapability = z.infer<typeof apiKeyCapabilitySchema>;
export type CreateApiKeyRequest = z.infer<typeof createApiKeyRequest>;
