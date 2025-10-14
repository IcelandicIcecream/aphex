// Document interface for document operations
import type { Document } from '../../types/index.js';

export interface DocumentFilters {
	organizationId: string; // Required for multi-tenancy
	type?: string;
	status?: string;
	limit?: number;
	offset?: number;
	depth?: number; // How deep to resolve nested references (0 = no resolution, default = 0)
}

export interface CreateDocumentData {
	organizationId: string; // Required for multi-tenancy
	type: string;
	draftData: any;
	createdBy?: string; // User ID (optional for backward compatibility)
}

export interface UpdateDocumentData {
	draftData?: any;
	status?: string;
	updatedBy?: string; // User ID (optional for backward compatibility)
}

/**
 * Document adapter interface for document-specific operations
 */
export interface DocumentAdapter {
	// Document CRUD operations
	findManyDoc(organizationId: string, filters?: Omit<DocumentFilters, 'organizationId'>): Promise<Document[]>;
	findByDocId(organizationId: string, id: string, depth?: number): Promise<Document | null>;
	createDocument(data: CreateDocumentData): Promise<Document>;
	updateDocDraft(organizationId: string, id: string, data: any, updatedBy?: string): Promise<Document | null>;
	deleteDocById(organizationId: string, id: string): Promise<boolean>;

	// Publishing operations
	publishDoc(organizationId: string, id: string): Promise<Document | null>;
	unpublishDoc(organizationId: string, id: string): Promise<Document | null>;

	// Analytics/counts
	countDocsByType(organizationId: string, type: string): Promise<number>;
	getDocCountsByType(organizationId: string): Promise<Record<string, number>>;
}
