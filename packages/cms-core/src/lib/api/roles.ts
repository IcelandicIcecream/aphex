// Roles API client — per-organization role CRUD.
import { apiClient } from './client';
import type { ApiResponse } from './types';
import type { Role } from '../types/capabilities';
import type { CreateRoleRequest, UpdateRoleRequest } from './schemas/roles';

export class RolesApi {
	/** List all roles (built-in + custom) for the active organization. */
	static async list(): Promise<ApiResponse<Role[]>> {
		return apiClient.get<Role[]>('/roles');
	}

	/** Create a custom role. Built-in names are rejected server-side. */
	static async create(data: CreateRoleRequest): Promise<ApiResponse<Role>> {
		return apiClient.post<Role>('/roles', data);
	}

	/** Edit description or capabilities. Works on built-ins too. */
	static async update(name: string, data: UpdateRoleRequest): Promise<ApiResponse<Role>> {
		return apiClient.patch<Role>(`/roles/${encodeURIComponent(name)}`, data);
	}

	/** Delete a custom role. Built-ins and in-use roles are blocked server-side. */
	static async remove(name: string): Promise<ApiResponse<{ success: boolean }>> {
		return apiClient.delete<{ success: boolean }>(`/roles/${encodeURIComponent(name)}`);
	}
}

export const roles = {
	list: RolesApi.list.bind(RolesApi),
	create: RolesApi.create.bind(RolesApi),
	update: RolesApi.update.bind(RolesApi),
	remove: RolesApi.remove.bind(RolesApi)
};
