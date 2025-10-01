import { apiClient } from './client.js';
import type { ApiResponse } from './types.js';
import type { SchemaType } from '@aphex/cms-core';

export class SchemasApi {
  /**
   * Get schema definition by type name
   */
  static async getByType(typeName: string): Promise<ApiResponse<SchemaType>> {
    return apiClient.get<SchemaType>(`/schemas/${typeName}`);
  }
}

// Export convenience functions for direct use
export const schemas = {
  getByType: SchemasApi.getByType.bind(SchemasApi)
};