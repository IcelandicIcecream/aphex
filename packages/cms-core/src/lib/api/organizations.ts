// Organizations API client - composable organization operations
import { apiClient } from './client';
import type { Organization, OrganizationMember, OrganizationRole } from '../types/organization';
import type { ApiResponse } from './types';

export interface CreateOrganizationData {
	name: string;
	slug: string;
	metadata?: any;
	parentOrganizationId?: string;
}

export interface OrganizationListItem extends Organization {
	role: OrganizationRole;
	joinedAt: Date;
	isActive: boolean;
}

export interface SwitchOrganizationData {
	organizationId: string;
}

export interface InviteMemberData {
	email: string;
	role: OrganizationRole;
}

export interface UpdateMemberRoleData {
	userId: string;
	role: OrganizationRole;
}

export interface RemoveMemberData {
	userId: string;
}

export interface CancelInvitationData {
	invitationId: string;
}

export interface UpdateOrganizationData {
	name?: string;
	slug?: string;
	metadata?: any;
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
	static async create(data: CreateOrganizationData): Promise<ApiResponse<Organization>> {
		return apiClient.post<Organization>('/organizations', data);
	}

	/**
	 * Switch to a different organization
	 */
	static async switch(data: SwitchOrganizationData): Promise<ApiResponse<{ success: boolean }>> {
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
	static async inviteMember(data: InviteMemberData): Promise<ApiResponse<OrganizationMember>> {
		return apiClient.post<OrganizationMember>('/organizations/invitations', data);
	}

	/**
	 * Remove a member from the organization
	 */
	static async removeMember(data: RemoveMemberData): Promise<ApiResponse<{ success: boolean }>> {
		return apiClient.delete<{ success: boolean }>('/organizations/members', data);
	}

	/**
	 * Update a member's role
	 */
	static async updateMemberRole(
		data: UpdateMemberRoleData
	): Promise<ApiResponse<OrganizationMember>> {
		return apiClient.patch<OrganizationMember>('/organizations/members', data);
	}

	/**
	 * Update organization settings
	 */
	static async update(
		id: string,
		data: UpdateOrganizationData
	): Promise<ApiResponse<Organization>> {
		return apiClient.patch<Organization>(`/organizations/${id}`, data);
	}

	/**
	 * Cancel a pending invitation
	 */
	static async cancelInvitation(
		data: CancelInvitationData
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
