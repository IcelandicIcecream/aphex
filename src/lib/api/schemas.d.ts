import type { ApiResponse } from './types.js';
import type { SchemaType } from '@aphex/cms-core';
export declare class SchemasApi {
    /**
     * Get schema definition by type name
     */
    static getByType(typeName: string): Promise<ApiResponse<SchemaType>>;
}
export declare const schemas: {
    getByType: typeof SchemasApi.getByType;
};
//# sourceMappingURL=schemas.d.ts.map