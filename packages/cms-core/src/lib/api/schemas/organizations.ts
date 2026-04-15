import { z } from 'zod';

// ---------- Shared ----------

export const organizationRoleSchema = z.enum(['owner', 'admin', 'editor', 'viewer']);

// Role used for new invitations — owners cannot be invited, only promoted.
export const invitableRoleSchema = z.enum(['admin', 'editor', 'viewer']);

const metadataSchema = z.record(z.string(), z.unknown());

// ---------- POST /organizations ----------

export const createOrganizationRequest = z.object({
	name: z.string().min(1),
	slug: z.string().min(1),
	metadata: metadataSchema.nullable().optional(),
	parentOrganizationId: z.string().optional()
});

// ---------- PATCH /organizations/[id] ----------

export const updateOrganizationRequest = z
	.object({
		name: z.string().min(1).optional(),
		slug: z.string().min(1).optional(),
		metadata: metadataSchema.nullable().optional()
	})
	.refine((v) => v.name !== undefined || v.slug !== undefined || v.metadata !== undefined, {
		message: 'At least one field (name, slug, metadata) is required'
	});

// ---------- POST /organizations/switch ----------

export const switchOrganizationRequest = z.object({
	organizationId: z.string().min(1)
});

// ---------- POST /organizations/invitations ----------

export const inviteMemberRequest = z.object({
	email: z.string().email(),
	role: invitableRoleSchema
});

// ---------- DELETE /organizations/invitations ----------

export const cancelInvitationRequest = z.object({
	invitationId: z.string().min(1)
});

// ---------- DELETE /organizations/members ----------

export const removeMemberRequest = z.object({
	userId: z.string().min(1)
});

// ---------- PATCH /organizations/members ----------

export const updateMemberRoleRequest = z.object({
	userId: z.string().min(1),
	role: organizationRoleSchema
});

// ---------- Inferred TS types ----------

export type OrganizationRoleSchema = z.infer<typeof organizationRoleSchema>;
export type InvitableRoleSchema = z.infer<typeof invitableRoleSchema>;

export type CreateOrganizationRequest = z.infer<typeof createOrganizationRequest>;
export type UpdateOrganizationRequest = z.infer<typeof updateOrganizationRequest>;
export type SwitchOrganizationRequest = z.infer<typeof switchOrganizationRequest>;
export type InviteMemberRequest = z.infer<typeof inviteMemberRequest>;
export type CancelInvitationRequest = z.infer<typeof cancelInvitationRequest>;
export type RemoveMemberRequest = z.infer<typeof removeMemberRequest>;
export type UpdateMemberRoleRequest = z.infer<typeof updateMemberRoleRequest>;
