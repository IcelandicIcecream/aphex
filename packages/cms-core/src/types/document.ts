// types/document.ts
//
//
import { AuthUser } from '../types/user'

/**
 * Document type - represents a CMS document
 */
export interface Document {
	id: string;
	type: string;
	status: 'draft' | 'published' | null;
	draftData: any;
	publishedData: any;
	publishedHash: string | null;
	createdBy: string | AuthUser;
	updatedBy: string | null;
	publishedAt: Date | null;
	createdAt: Date | null;
	updatedAt: Date | null;
}

/**
 * New document input type
 */
export interface NewDocument {
	id?: string;
	type: string;
	status?: 'draft' | 'published' | null;
	draftData?: any;
	publishedData?: any;
	publishedHash?: string | null;
	createdBy?: string | null;
	updatedBy?: string | null;
	publishedAt?: Date | null;
	createdAt?: Date | null;
	updatedAt?: Date | null;
}
