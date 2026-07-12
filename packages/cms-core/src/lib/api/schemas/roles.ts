import { z } from 'zod';
import { normalizeCapabilities } from '../../types/capabilities';

// Capability id: a shape/format guard only — dotted or colon segments, e.g.
// `document.publish` or `forms.export`. It deliberately does NOT enumerate the
// valid set, because plugin-declared capabilities aren't known at module-eval time.
// The route handler does the authoritative check against the runtime registry
// (`partResolver.capabilityCatalog()`), rejecting ids that don't actually exist.
export const capabilitySchema = z
	.string()
	.min(1)
	.max(100)
	.regex(/^[a-zA-Z0-9]+([.:][a-zA-Z0-9]+)+$/, { message: 'Invalid capability id format' });

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

// Capabilities are normalized on intake so any write cap pulls in the matching
// read — a role with `document.create` but no `document.read` can't
// realistically edit anything, and leaving that gap trips people up.
export const createRoleRequest = z
	.object({
		name: roleNameSchema,
		description: z.string().max(500).nullable().optional(),
		capabilities: z.array(capabilitySchema).default([])
	})
	.transform((v) => ({ ...v, capabilities: normalizeCapabilities(v.capabilities) }));

// ---------- PATCH /roles/[name] ----------

export const updateRoleRequest = z
	.object({
		description: z.string().max(500).nullable().optional(),
		capabilities: z.array(capabilitySchema).optional()
	})
	.refine((v) => v.description !== undefined || v.capabilities !== undefined, {
		message: 'At least one field (description, capabilities) is required'
	})
	.transform((v) => ({
		...v,
		capabilities: v.capabilities ? normalizeCapabilities(v.capabilities) : undefined
	}));

// ---------- Inferred TS types ----------

export type CreateRoleRequest = z.infer<typeof createRoleRequest>;
export type UpdateRoleRequest = z.infer<typeof updateRoleRequest>;
