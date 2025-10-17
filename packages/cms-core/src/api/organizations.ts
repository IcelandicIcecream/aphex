// Organizations API client - composable organization operations
import { apiClient } from './client.js';
import type { Organization, OrganizationMember, OrganizationRole, ApiResponse } from './types.js';

export interface CreateOrganizationData {
	name: string;
	slug: string;
	metadata?: any;
	parentOrganizationId?: string;
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

export class OrganizationsApi {
	/**
	 * List user's organizations
	 */
	static async list(): Promise<ApiResponse<Organization[]>> {
		return apiClient.get<Organization[]>('/organizations');
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
	 * Invite/add a member to the organization
	 */
	static async inviteMember(data: InviteMemberData): Promise<ApiResponse<OrganizationMember>> {
		return apiClient.post<OrganizationMember>('/organizations/members', data);
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
	static async updateMemberRole(data: UpdateMemberRoleData): Promise<ApiResponse<OrganizationMember>> {
		return apiClient.patch<OrganizationMember>('/organizations/members', data);
	}
}

// Export convenience functions for direct use
export const organizations = {
	list: OrganizationsApi.list.bind(OrganizationsApi),
	create: OrganizationsApi.create.bind(OrganizationsApi),
	switch: OrganizationsApi.switch.bind(OrganizationsApi),
	getById: OrganizationsApi.getById.bind(OrganizationsApi),
	getActive: OrganizationsApi.getActive.bind(OrganizationsApi),
	getMembers: OrganizationsApi.getMembers.bind(OrganizationsApi),
	inviteMember: OrganizationsApi.inviteMember.bind(OrganizationsApi),
	removeMember: OrganizationsApi.removeMember.bind(OrganizationsApi),
	updateMemberRole: OrganizationsApi.updateMemberRole.bind(OrganizationsApi)
};
