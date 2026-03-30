import type { DatabaseAdapter } from '../db/index';
import type { Document } from '../types/document';
import type { DocumentVersion, DocumentVersionList } from '../types/version';

/**
 * VersionService — orchestrates document versioning with rolling retention.
 *
 * Stateless regarding the adapter — each method receives the adapter to use.
 * This allows CollectionAPI to pass whichever adapter is active (user or system),
 * ensuring proper RLS context propagation.
 */
export class VersionService {
	private maxVersions: number;

	constructor(options?: { maxVersions?: number }) {
		this.maxVersions = options?.maxVersions ?? 25;
	}

	/**
	 * Create a version snapshot and enforce rolling retention.
	 */
	async createVersion(
		db: DatabaseAdapter,
		organizationId: string,
		documentId: string,
		eventType: 'draft' | 'publish' | 'restore',
		data: any,
		userId?: string | null
	): Promise<DocumentVersion | null> {
		if (!db.createDocumentVersion) return null;

		const version = await db.createDocumentVersion({
			documentId,
			organizationId,
			eventType,
			data,
			createdBy: userId
		});

		await this.enforceRetention(db, documentId, organizationId);
		return version;
	}

	/**
	 * Save draft and create version atomically using adapter transaction.
	 */
	async saveWithVersion(
		db: DatabaseAdapter,
		organizationId: string,
		documentId: string,
		data: any,
		userId?: string
	): Promise<Document | null> {
		if (db.withTransaction && db.createDocumentVersion) {
			const updated = await db.withTransaction(async (txAdapter) => {
				const result = await txAdapter.updateDocDraft(organizationId, documentId, data, userId);
				if (result) {
					await txAdapter.createDocumentVersion!({
						documentId,
						organizationId,
						eventType: 'draft',
						data,
						createdBy: userId
					});
				}
				return result;
			});
			if (updated) await this.enforceRetention(db, documentId, organizationId);
			return updated;
		}

		// Fallback: non-atomic
		const updated = await db.updateDocDraft(organizationId, documentId, data, userId);
		if (updated) {
			await this.createVersion(db, organizationId, documentId, 'draft', data, userId);
		}
		return updated;
	}

	/**
	 * Publish and create version.
	 */
	async publishWithVersion(
		db: DatabaseAdapter,
		organizationId: string,
		documentId: string
	): Promise<Document | null> {
		const published = await db.publishDoc(organizationId, documentId);
		if (!published) return null;

		await this.createVersion(
			db,
			organizationId,
			documentId,
			'publish',
			published.publishedData,
			published.updatedBy
		);

		return published;
	}

	/**
	 * Restore a version to draft. Creates a 'restore' version entry.
	 */
	async restoreVersion(
		db: DatabaseAdapter,
		organizationId: string,
		documentId: string,
		versionNumber: number,
		userId?: string
	): Promise<Document | null> {
		if (!db.getDocumentVersion) return null;

		const version = await db.getDocumentVersion(organizationId, documentId, versionNumber);
		if (!version) return null;

		if (db.withTransaction && db.createDocumentVersion) {
			const restored = await db.withTransaction(async (txAdapter) => {
				const result = await txAdapter.updateDocDraft(
					organizationId,
					documentId,
					version.data,
					userId
				);
				if (result) {
					await txAdapter.createDocumentVersion!({
						documentId,
						organizationId,
						eventType: 'restore',
						data: version.data,
						createdBy: userId
					});
				}
				return result;
			});
			if (restored) await this.enforceRetention(db, documentId, organizationId);
			return restored;
		}

		// Fallback: non-atomic
		const restored = await db.updateDocDraft(organizationId, documentId, version.data, userId);
		if (restored) {
			await this.createVersion(db, organizationId, documentId, 'restore', version.data, userId);
		}
		return restored;
	}

	async listVersions(
		db: DatabaseAdapter,
		organizationId: string,
		documentId: string,
		options?: { limit?: number; offset?: number }
	): Promise<DocumentVersionList> {
		if (!db.listDocumentVersions) return { versions: [], total: 0 };
		return db.listDocumentVersions(organizationId, documentId, options);
	}

	async getVersion(
		db: DatabaseAdapter,
		organizationId: string,
		documentId: string,
		versionNumber: number
	): Promise<DocumentVersion | null> {
		if (!db.getDocumentVersion) return null;
		return db.getDocumentVersion(organizationId, documentId, versionNumber);
	}

	private async enforceRetention(
		db: DatabaseAdapter,
		documentId: string,
		organizationId: string
	): Promise<void> {
		if (this.maxVersions <= 0) return;
		if (!db.listDocumentVersions || !db.deleteDocumentVersions) return;

		const { total, versions } = await db.listDocumentVersions(organizationId, documentId, {
			limit: 1000,
			offset: 0
		});

		if (total <= this.maxVersions) return;

		const toDelete = versions.slice(this.maxVersions);
		if (toDelete.length > 0) {
			await db.deleteDocumentVersions(documentId, toDelete.map((v) => v.id));
		}
	}
}
