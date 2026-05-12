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

// ---------- POST /user/request-password-reset ----------

export const requestPasswordResetRequest = z.object({
	email: z.string().email(),
	redirectTo: z.string().optional()
});

// ---------- POST /user/reset-password ----------

export const resetPasswordRequest = z.object({
	token: z.string().min(1),
	newPassword: z.string().min(8)
});

// ---------- Inferred TS types ----------

export type UpdateUserRequest = z.infer<typeof updateUserRequest>;
export type UpdateUserPreferencesRequest = z.infer<typeof updateUserPreferencesRequest>;
export type RequestPasswordResetRequest = z.infer<typeof requestPasswordResetRequest>;
export type ResetPasswordRequest = z.infer<typeof resetPasswordRequest>;
