import type { CMSConfig, SchemaType, Document } from './types.js';
export declare class CMSEngine {
    private db;
    private config;
    constructor(config: CMSConfig);
    updateConfig(newConfig: CMSConfig): void;
    initialize(): Promise<void>;
    private registerSchemaType;
    createDocument(type: string, data: Record<string, any>): Promise<Document>;
    getDocument(id: string, perspective?: 'draft' | 'published'): Promise<Document | null>;
    getDocumentBySlug(type: string, slug: string): Promise<Document | null>;
    updateDocument(id: string, data: Record<string, any>): Promise<Document | null>;
    deleteDocument(id: string): Promise<boolean>;
    listDocuments(type: string, options?: {
        limit?: number;
        offset?: number;
        status?: string;
    }): Promise<{
        docs: Document[];
        total: number;
    }>;
    getSchemaType(name: string): Promise<SchemaType | null>;
    getSchemaTypeByName(name: string): SchemaType | null;
    listDocumentTypes(): Promise<Array<{
        name: string;
        title: string;
        description?: string;
    }>>;
    listObjectTypes(): Promise<Array<{
        name: string;
        title: string;
        description?: string;
    }>>;
}
export declare function createCMS(config: CMSConfig): CMSEngine;
//# sourceMappingURL=engine.d.ts.map