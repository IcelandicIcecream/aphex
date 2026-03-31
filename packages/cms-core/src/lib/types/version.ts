export interface DocumentVersion {
	id: string;
	documentId: string;
	organizationId: string;
	versionNumber: number;
	eventType: 'draft' | 'publish';
	data: any;
	createdBy: string | null;
	createdAt: Date | null;
}

export interface DocumentVersionList {
	versions: DocumentVersion[];
	total: number;
}
