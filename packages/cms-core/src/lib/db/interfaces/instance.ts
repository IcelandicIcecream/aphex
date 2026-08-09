// Instance-level adapter interface for global settings and configuration
import type { InstanceSettings } from '../../types/instance';

export type { InstanceSettings };

/**
 * Row id holding the one-time bootstrap claim.
 *
 * Deliberately not `'default'` — `get`/`updateInstanceSettings` are scoped to
 * that row, so this one is invisible to them and can't be cleared by an ordinary
 * settings write.
 */
export const BOOTSTRAP_CLAIM_ID = 'aphex:bootstrap-claim';

export interface InstanceAdapter {
	getInstanceSettings(): Promise<InstanceSettings>;
	updateInstanceSettings(settings: Partial<InstanceSettings>): Promise<InstanceSettings>;

	/**
	 * Atomically claim the one-time bootstrap promotion. `true` means this caller
	 * won and may grant an instance role; `false` means somebody else already did.
	 *
	 * Exists because "is the instance empty?" and "insert the first profile" were
	 * two statements with a gap between them: two sign-ups arriving together could
	 * both observe an empty instance and both be promoted to super admin. Every
	 * bootstrap policy gates on `isFirstUser`, so at most one promotion is
	 * intended in all of them — this makes that atomic rather than likely.
	 *
	 * Implemented as an insert of a dedicated row that conflicts with itself, so
	 * the database decides the winner in a single statement. That matters more
	 * than it sounds: the obvious fix — wrapping the check and the insert in one
	 * transaction — holds SQLite's single write lock across the auth provider's
	 * own concurrent user and session inserts and fails sign-up with SQLITE_BUSY.
	 *
	 * Optional: an adapter that doesn't implement it keeps the old non-atomic
	 * behaviour (with a warning) rather than refusing to ever promote anyone,
	 * which would leave a fresh install with no way to get its first administrator.
	 */
	tryClaimBootstrap?(): Promise<boolean>;
}
