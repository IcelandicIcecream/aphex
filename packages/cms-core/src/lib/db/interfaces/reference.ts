// Back-reference index for the publish/unpublish integrity guards. Adapters
// that implement this maintain a (referencer_id, ref_id) table that the
// references service in cms-core repopulates after every save.

export interface BackReferenceRow {
	id: string;
	type: string;
	status: string | null;
}

export interface BackReferenceLookup extends BackReferenceRow {
	refId: string;
}

export interface ReferenceAdapter {
	/**
	 * Replace all back-reference rows for a given referencer atomically.
	 * Called by the references service after every doc save with the full
	 * set of refs extracted from the doc's data.
	 */
	replaceReferencesFor(
		organizationId: string,
		referencerId: string,
		refIds: string[]
	): Promise<void>;

	/**
	 * Find all documents that reference the given target. Joins through the
	 * documents table so callers get type/status without a second round-trip.
	 */
	findBackReferences(organizationId: string, refId: string): Promise<BackReferenceRow[]>;

	/**
	 * Bulk variant of findBackReferences — returns all back-refs for a set
	 * of target IDs, with `refId` included so callers can group by target.
	 */
	findBackReferencesForMany(
		organizationId: string,
		refIds: string[]
	): Promise<BackReferenceLookup[]>;

	/**
	 * Whether the references table has any rows for this organization.
	 * Used by the boot path to decide whether a one-time backfill is needed.
	 */
	hasAnyReferences(organizationId: string): Promise<boolean>;

	/**
	 * Bulk insert variant for the backfill path. Single INSERT for all rows
	 * — caller is responsible for ensuring the table is empty for this org
	 * (no DELETE step). Adapter implementations should ignore conflicts so
	 * the operation is idempotent if called twice.
	 */
	bulkInsertReferences(
		rows: Array<{ organizationId: string; referencerId: string; refId: string }>
	): Promise<void>;
}
