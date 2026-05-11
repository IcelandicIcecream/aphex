import { z } from 'zod';

// ---------- PATCH /instance-settings ----------

export const updateInstanceSettingsRequest = z
	.object({
		allowUserOrgCreation: z.boolean().optional()
	})
	.strict();

// ---------- Inferred TS types ----------

export type UpdateInstanceSettingsRequest = z.infer<typeof updateInstanceSettingsRequest>;
