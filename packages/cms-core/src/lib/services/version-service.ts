import type { DatabaseAdapter } from '../db/index';
import type { Document } from '../types/document';
import type { DocumentVersion, DocumentVersionList } from '../types/version';
import { emitDocumentPublished } from '../events/emit';

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
		eventType: 'draft' | 'publish',
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
	 * Write a version snapshot on an already-transactional adapter. The caller owns
	 * the transaction boundary and retention (call `enforceRetentionFor` post-commit).
	 * No-op when the adapter has no versioning support.
	 */
	async snapshotTx(
		tx: DatabaseAdapter,
		organizationId: string,
		documentId: string,
		eventType: 'draft' | 'publish',
		data: any,
		userId?: string | null
	): Promise<void> {
		if (!tx.createDocumentVersion) return;
		await tx.createDocumentVersion({
			documentId,
			organizationId,
			eventType,
			data,
			createdBy: userId
		});
	}

	/**
	 * Publish + snapshot on an already-transactional adapter. Caller owns the tx
	 * and retention. Returns the published document (or null if publish was a no-op).
	 */
	async publishTx(
		tx: DatabaseAdapter,
		organizationId: string,
		documentId: string
	): Promise<Document | null> {
		const result = await tx.publishDoc(organizationId, documentId);
		if (result) {
			await this.snapshotTx(
				tx,
				organizationId,
				documentId,
				'publish',
				result.publishedData,
				result.updatedBy
			);
			// Transactional outbox: record the durable fact in the same tx as the publish, so
			// the event and the state change commit (or roll back) together — a consumer can
			// never see a publish that didn't happen, nor miss one that did. The non-versioned
			// publish path (collection-api) emits the same event via the same helper.
			await emitDocumentPublished(tx, organizationId, result);
		}
		return result;
	}

	/**
	 * Public retention trigger for callers that manage their own transaction and
	 * therefore can't rely on `saveWithVersion`/`publishWithVersion` to run it.
	 */
	async enforceRetentionFor(
		db: DatabaseAdapter,
		organizationId: string,
		documentId: string
	): Promise<void> {
		await this.enforceRetention(db, documentId, organizationId);
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
		// No versioning support: a single write, atomic on its own.
		if (!db.createDocumentVersion) {
			return db.updateDocDraft(organizationId, documentId, data, userId);
		}

		const updated = await db.withTransaction(async (txAdapter) => {
			const result = await txAdapter.updateDocDraft(organizationId, documentId, data, userId);
			if (result)
				await this.snapshotTx(txAdapter, organizationId, documentId, 'draft', data, userId);
			return result;
		});
		if (updated) await this.enforceRetention(db, documentId, organizationId);
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
		// Publish + version snapshot must commit together: a crash between them
		// would leave a published document with no 'publish' version row. Mirror
		// saveWithVersion / restoreVersion and run both writes in one transaction.

		// No versioning support: a single write, atomic on its own.
		if (!db.createDocumentVersion) {
			return db.publishDoc(organizationId, documentId);
		}

		const published = await db.withTransaction((txAdapter) =>
			this.publishTx(txAdapter, organizationId, documentId)
		);
		if (published) await this.enforceRetention(db, documentId, organizationId);
		return published;
	}

	/**
	 * Restore a version to draft. Creates a 'draft' version entry.
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

		// No versioning support: a single write, atomic on its own.
		if (!db.createDocumentVersion) {
			return db.updateDocDraft(organizationId, documentId, version.data, userId);
		}

		const restored = await db.withTransaction(async (txAdapter) => {
			const result = await txAdapter.updateDocDraft(
				organizationId,
				documentId,
				version.data,
				userId
			);
			if (result)
				await this.snapshotTx(txAdapter, organizationId, documentId, 'draft', version.data, userId);
			return result;
		});
		if (restored) await this.enforceRetention(db, documentId, organizationId);
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
			await db.deleteDocumentVersions(
				documentId,
				toDelete.map((v) => v.id)
			);
		}
	}
}
