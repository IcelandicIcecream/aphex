import { z } from 'zod';

// ---------- PATCH /instance-settings ----------

export const updateInstanceSettingsRequest = z
	.object({
		allowUserOrgCreation: z.boolean().optional()
	})
	.strict();

// ---------- Inferred TS types ----------

export type UpdateInstanceSettingsRequest = z.infer<typeof updateInstanceSettingsRequest>;

/** The account's address, typed out to confirm deleting it. */
export const deleteInstanceUserRequest = z.object({ email: z.string().trim().min(1) });
export type DeleteInstanceUserRequest = z.infer<typeof deleteInstanceUserRequest>;
