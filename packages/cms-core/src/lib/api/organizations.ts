// Organizations API client - composable organization operations
import { apiClient } from './client';
import type { Organization, OrganizationMember, OrganizationRole } from '../types/organization';
import type { ApiResponse } from './types';
import type {
	CreateOrganizationRequest,
	UpdateOrganizationRequest,
	SwitchOrganizationRequest,
	InviteMemberRequest,
	UpdateMemberRoleRequest,
	RemoveMemberRequest,
	CancelInvitationRequest
} from './schemas/organizations';

// Legacy shims — kept so existing call sites don't break while we migrate.
// Prefer schema-inferred types from ./schemas/organizations going forward.
export type CreateOrganizationData = CreateOrganizationRequest;
export type UpdateOrganizationData = UpdateOrganizationRequest;
export type SwitchOrganizationData = SwitchOrganizationRequest;
export type InviteMemberData = InviteMemberRequest;
export type UpdateMemberRoleData = UpdateMemberRoleRequest;
export type RemoveMemberData = RemoveMemberRequest;
export type CancelInvitationData = CancelInvitationRequest;

export interface OrganizationListItem extends Organization {
	role: OrganizationRole;
	joinedAt: Date;
	isActive: boolean;
}

export class OrganizationsApi {
	/**
	 * List user's organizations
	 */
	static async list(): Promise<ApiResponse<OrganizationListItem[]>> {
		return apiClient.get<OrganizationListItem[]>('/organizations');
	}

	/**
	 * Create new organization (super_admin only)
	 */
	static async create(data: CreateOrganizationRequest): Promise<ApiResponse<Organization>> {
		return apiClient.post<Organization>('/organizations', data);
	}

	/**
	 * Switch to a different organization
	 */
	static async switch(data: SwitchOrganizationRequest): Promise<ApiResponse<{ success: boolean }>> {
		return apiClient.post<{ success: boolean }>('/organizations/switch', data);
	}

	/**
	 * Get organization by ID
	 */
	static async getById(id: string): Promise<ApiResponse<Organization>> {
		return apiClient.get<Organization>(`/organizations/${id}`);
	}

	/**
	 * Get active organization
	 */
	static async getActive(): Promise<ApiResponse<Organization>> {
		const result = await this.list();
		const active = result.data?.find((org) => org.isActive);
		if (!active) {
			throw new Error('No active organization found');
		}
		return {
			success: true,
			data: active
		};
	}

	/**
	 * Get organization members
	 */
	static async getMembers(): Promise<ApiResponse<OrganizationMember[]>> {
		return apiClient.get<OrganizationMember[]>('/organizations/members');
	}

	/**
	 * Invite a member to the organization
	 */
	static async inviteMember(data: InviteMemberRequest): Promise<ApiResponse<OrganizationMember>> {
		return apiClient.post<OrganizationMember>('/organizations/invitations', data);
	}

	/**
	 * Remove a member from the organization
	 */
	static async removeMember(data: RemoveMemberRequest): Promise<ApiResponse<{ success: boolean }>> {
		return apiClient.delete<{ success: boolean }>('/organizations/members', data);
	}

	/**
	 * Update a member's role
	 */
	static async updateMemberRole(
		data: UpdateMemberRoleRequest
	): Promise<ApiResponse<OrganizationMember>> {
		return apiClient.patch<OrganizationMember>('/organizations/members', data);
	}

	/**
	 * Update organization settings
	 */
	static async update(
		id: string,
		data: UpdateOrganizationRequest
	): Promise<ApiResponse<Organization>> {
		return apiClient.patch<Organization>(`/organizations/${id}`, data);
	}

	/**
	 * Cancel a pending invitation
	 */
	static async cancelInvitation(
		data: CancelInvitationRequest
	): Promise<ApiResponse<{ success: boolean }>> {
		return apiClient.delete<{ success: boolean }>('/organizations/invitations', data);
	}

	/**
	 * Delete an organization (super_admin only)
	 */
	static async remove(id: string): Promise<ApiResponse<{ success: boolean }>> {
		return apiClient.delete<{ success: boolean }>(`/organizations/${id}`);
	}
}

// Export convenience functions for direct use
export const organizations = {
	list: OrganizationsApi.list.bind(OrganizationsApi),
	create: OrganizationsApi.create.bind(OrganizationsApi),
	switch: OrganizationsApi.switch.bind(OrganizationsApi),
	getById: OrganizationsApi.getById.bind(OrganizationsApi),
	getActive: OrganizationsApi.getActive.bind(OrganizationsApi),
	update: OrganizationsApi.update.bind(OrganizationsApi),
	remove: OrganizationsApi.remove.bind(OrganizationsApi),
	getMembers: OrganizationsApi.getMembers.bind(OrganizationsApi),
	inviteMember: OrganizationsApi.inviteMember.bind(OrganizationsApi),
	removeMember: OrganizationsApi.removeMember.bind(OrganizationsApi),
	updateMemberRole: OrganizationsApi.updateMemberRole.bind(OrganizationsApi),
	cancelInvitation: OrganizationsApi.cancelInvitation.bind(OrganizationsApi)
};
