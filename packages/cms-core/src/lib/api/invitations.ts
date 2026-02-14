// Invitations API client - user-scoped invitation operations
import { apiClient } from './client';
import type { OrganizationRole } from '../types/organization';
import type { ApiResponse } from './types';

export interface PendingInvitation {
	id: string;
	organizationId: string;
	organizationName: string;
	organizationSlug: string;
	role: OrganizationRole;
	email: string;
	expiresAt: Date;
	createdAt: Date;
}

export interface AcceptInvitationResponse {
	organizationId: string;
}

export class InvitationsApi {
	/**
	 * List all pending invitations for the authenticated user
	 */
	static async listPending(): Promise<ApiResponse<PendingInvitation[]>> {
		return apiClient.get<PendingInvitation[]>('/invitations');
	}

	/**
	 * Accept a pending invitation
	 */
	static async accept(id: string): Promise<ApiResponse<AcceptInvitationResponse>> {
		return apiClient.post<AcceptInvitationResponse>(`/invitations/${id}/accept`);
	}

	/**
	 * Reject/decline a pending invitation
	 */
	static async reject(id: string): Promise<ApiResponse<{ success: boolean }>> {
		return apiClient.post<{ success: boolean }>(`/invitations/${id}/reject`);
	}
}

export const invitations = {
	listPending: InvitationsApi.listPending.bind(InvitationsApi),
	accept: InvitationsApi.accept.bind(InvitationsApi),
	reject: InvitationsApi.reject.bind(InvitationsApi)
};
