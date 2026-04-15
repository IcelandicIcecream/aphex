import { z } from 'zod';

// ---------- PATCH /user ----------

export const updateUserRequest = z.object({
	name: z.string().min(1)
});

// ---------- PATCH /user/cms-preference ----------

export const updateUserPreferencesRequest = z
	.object({
		includeChildOrganizations: z.boolean().optional()
	})
	.strict();

// ---------- Inferred TS types ----------

export type UpdateUserRequest = z.infer<typeof updateUserRequest>;
export type UpdateUserPreferencesRequest = z.infer<typeof updateUserPreferencesRequest>;
