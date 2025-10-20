// Route handler exports for re-use in apps
// This file provides named exports to avoid ambiguity

// Document routes
export { GET as getDocuments, POST as createDocument } from './routes/documents';
export {
	GET as getDocumentById,
	PUT as updateDocument,
	DELETE as deleteDocument
} from './routes/documents-by-id';
export { POST as publishDocument, DELETE as unpublishDocument } from './routes/documents-publish';

// Asset routes
export { GET as getAssets, POST as createAsset } from './routes/assets';
export {
	GET as getAssetById,
	PATCH as updateAsset,
	DELETE as deleteAsset
} from './routes/assets-by-id';

// Schema routes
export { GET as getSchemas } from './routes/schemas';
export { GET as getSchemaByType } from './routes/schemas-by-type';

// Organization routes
export { GET as getOrganizations, POST as createOrganization } from './routes/organizations';
export { GET as getOrganizationById, PATCH as updateOrganization } from './routes/organizations-by-id';
export { POST as switchOrganization } from './routes/organizations-switch';
export {
	GET as getOrganizationMembers,
	DELETE as removeMember,
	PATCH as updateMemberRole
} from './routes/organizations-members';
export { POST as inviteMember, DELETE as cancelInvitation } from './routes/organizations-invitations';
