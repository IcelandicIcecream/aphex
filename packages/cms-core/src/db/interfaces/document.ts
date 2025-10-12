// Document interface for document operations
import type { Document } from '../../types/index.js';

export interface DocumentFilters {
	type?: string;
	status?: string;
	limit?: number;
	offset?: number;
	depth?: number; // How deep to resolve nested references (0 = no resolution, default = 0)
}

export interface CreateDocumentData {
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
	findManyDoc(filters?: DocumentFilters): Promise<Document[]>;
	findByDocId(id: string, depth?: number): Promise<Document | null>;
	createDocument(data: CreateDocumentData): Promise<Document>;
	updateDocDraft(id: string, data: any, updatedBy?: string): Promise<Document | null>;
	deleteDocById(id: string): Promise<boolean>;

	// Publishing operations
	publishDoc(id: string): Promise<Document | null>;
	unpublishDoc(id: string): Promise<Document | null>;

	// Analytics/counts
	countDocsByType(type: string): Promise<number>;
	getDocCountsByType(): Promise<Record<string, number>>;
}
