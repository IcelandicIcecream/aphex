import { z } from 'zod';
import { ALL_CAPABILITIES, type Capability } from '../../types/capabilities';

// Runtime enum of every known capability. Unknown strings are rejected so a
// typo in a client request can't silently grant or strip permissions.
// The cast preserves the literal Capability union in the inferred type — Zod
// can't see the compile-time widening of the readonly array on its own.
export const capabilitySchema = z.enum(
	ALL_CAPABILITIES as unknown as [Capability, ...Capability[]]
);

// Role name: human-readable identifier stored on member rows and referenced
// in the API as /api/roles/[name]. Spaces are allowed (URL-encoded client
// side); control characters and slashes are not, to keep routing unambiguous.
const roleNameSchema = z
	.string()
	.trim()
	.min(1)
	.max(100)
	.regex(/^[a-zA-Z0-9 _-]+$/, {
		message: 'Role name may only contain letters, numbers, spaces, underscores, and hyphens'
	});

// ---------- POST /roles ----------

export const createRoleRequest = z.object({
	name: roleNameSchema,
	description: z.string().max(500).nullable().optional(),
	capabilities: z.array(capabilitySchema).default([])
});

// ---------- PATCH /roles/[name] ----------

export const updateRoleRequest = z
	.object({
		description: z.string().max(500).nullable().optional(),
		capabilities: z.array(capabilitySchema).optional()
	})
	.refine((v) => v.description !== undefined || v.capabilities !== undefined, {
		message: 'At least one field (description, capabilities) is required'
	});

// ---------- Inferred TS types ----------

export type CreateRoleRequest = z.infer<typeof createRoleRequest>;
export type UpdateRoleRequest = z.infer<typeof updateRoleRequest>;
