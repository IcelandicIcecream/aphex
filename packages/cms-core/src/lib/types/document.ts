// types/document.ts
//
//
import type { AuthUser } from '../types/user';

/**
 * Document type - represents a CMS document
 */
export interface Document {
	id: string;
	organizationId: string;
	type: string;
	status: 'draft' | 'published' | 'unpublished' | null;
	draftData: any;
	publishedData: any;
	publishedHash: string | null;
	/** Monotonic draft revision, incremented on every draft write. Used as the
	 *  compare-and-swap guard on `updateDocDraft`/`publishDoc`/`unpublishDoc` —
	 *  callers pass the revision they last read as `expectedRevision`. */
	revision: number;
	createdBy: string | AuthUser | null;
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
	status?: 'draft' | 'published' | 'unpublished' | null;
	draftData?: any;
	publishedData?: any;
	publishedHash?: string | null;
	revision?: number;
	createdBy?: string | null;
	updatedBy?: string | null;
	publishedAt?: Date | null;
	createdAt?: Date | null;
	updatedAt?: Date | null;
}
