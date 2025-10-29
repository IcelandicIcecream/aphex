// Route handler exports for re-use in apps
// This file provides named exports to avoid ambiguity

// Document routes
export { GET as getDocuments, POST as createDocument } from './routes/documents.js';
export {
	GET as getDocumentById,
	PUT as updateDocument,
	DELETE as deleteDocument
} from './routes/documents-by-id.js';
export { POST as publishDocument, DELETE as unpublishDocument } from './routes/documents-publish.js';

// Asset routes
export { GET as getAssets, POST as createAsset } from './routes/assets.js';
export {
	GET as getAssetById,
	PATCH as updateAsset,
	DELETE as deleteAsset
} from './routes/assets-by-id.js';
export { GET as serveAssetCDN } from './routes/assets-cdn.js';

// Schema routes
export { GET as getSchemas } from './routes/schemas.js';
export { GET as getSchemaByType } from './routes/schemas-by-type.js';

// Organization routes
export { GET as getOrganizations, POST as createOrganization } from './routes/organizations.js';
export {
	GET as getOrganizationById,
	PATCH as updateOrganization,
	DELETE as deleteOrganization
} from './routes/organizations-by-id.js';
export { POST as switchOrganization } from './routes/organizations-switch.js';
export {
	GET as getOrganizationMembers,
	DELETE as removeMember,
	PATCH as updateMemberRole
} from './routes/organizations-members.js';
export {
	POST as inviteMember,
	DELETE as cancelInvitation
} from './routes/organizations-invitations.js';
