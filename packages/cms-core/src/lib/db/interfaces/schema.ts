import type { SchemaType } from '../../types/index';

/**
 * Defines database operations for managing schemas.
 */
export interface SchemaAdapter {
	registerSchemaType(schemaType: SchemaType): Promise<void>;
	getSchemaType(name: string): Promise<SchemaType | null>;
	listSchemas(): Promise<SchemaType[]>;
	listDocumentTypes(): Promise<Array<{ name: string; title: string; description?: string }>>;
	listObjectTypes(): Promise<Array<{ name: string; title: string; description?: string }>>;
	deleteSchemaType(name: string): Promise<void>;
}
