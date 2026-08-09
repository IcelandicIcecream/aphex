import { z } from 'zod';

// ---------- PATCH /user ----------

export const updateUserRequest = z
	.object({
		// Bounded so a display name can't be pasted in at essay length — it renders
		// in sidebars, member lists, and audit trails that all assume it's short.
		name: z.string().min(1).max(80).optional(),
		// Generous, but finite: this holds a `/media/<id>/<filename>` path or an
		// external provider's avatar URL, never free text.
		image: z.string().min(1).max(2048).nullable().optional()
	})
	.refine((v) => v.name !== undefined || v.image !== undefined, {
		message: 'At least one field (name, image) is required'
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
