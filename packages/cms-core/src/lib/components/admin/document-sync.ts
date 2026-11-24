/**
 * Keeps an open editor in step with saves made elsewhere (another tab, an AI agent
 * over MCP). `check()` asks only for the document's revision; when it moved, it
 * fetches the document and hands the editor what to do (document-merge.ts,
 * `reconcile`): show theirs, merge, or ask about a field both changed.
 *
 * The editor calls `check()` every few seconds while its tab is visible, when the
 * tab comes back, and straight after a save is refused as stale. Svelte-free, so
 * its timing rules are tested with fakes (tests/document-sync.test.ts).
 */
import { reconcile, type RemoteAction } from './document-merge';

/** How often an open, visible editor checks for changes. */
export const SYNC_EVERY_MS = 5_000;

type Data = Record<string, unknown>;

export interface SyncSnapshot {
	id: string;
	/** The revision this editor last read or saved. */
	revision: number | undefined;
	/** That version's data: what both sides started from. */
	base: Data;
	/** The editor's data now, unsaved edits included. */
	local: Data;
	/** A save is in flight: its answer will move the revision, so wait. */
	busy: boolean;
}

interface Reply<T> {
	success?: boolean;
	data?: T;
}

export interface SyncDeps {
	getMeta(id: string): Promise<Reply<{ _meta?: { revision?: number } }>>;
	getById(id: string): Promise<Reply<Data>>;
	/** The editor as it is now; null when it isn't one that syncs (a new document, a preview). */
	read(): SyncSnapshot | null;
	/** What to do, with the document as saved elsewhere (its `_meta` has the new revision). */
	apply(action: RemoteAction, document: Data): void;
}

export type SyncOutcome = 'skipped' | 'same' | RemoteAction['kind'];

const revisionOf = (document: Data | undefined) =>
	(document?._meta as { revision?: number } | undefined)?.revision;

export function documentSync(deps: SyncDeps) {
	let running = false;

	async function check(): Promise<SyncOutcome> {
		const start = deps.read();
		if (!start || start.busy || running) return 'skipped';
		running = true;
		try {
			const meta = await deps.getMeta(start.id);
			const theirs = meta.success ? meta.data?._meta?.revision : undefined;
			const now = deps.read();
			if (theirs === undefined || !now || now.id !== start.id) return 'skipped';
			if (theirs === now.revision) return 'same';

			const full = await deps.getById(start.id);
			const latest = deps.read();
			if (!full.success || !full.data || !latest || latest.id !== start.id || latest.busy)
				return 'skipped';
			// Our own save landed while we asked: nothing new.
			if (revisionOf(full.data) === latest.revision) return 'same';

			const { id: _id, _meta: _m, ...remote } = full.data;
			const action = reconcile(latest.base, latest.local, remote);
			deps.apply(action, full.data);
			return action.kind;
		} catch {
			return 'skipped';
		} finally {
			running = false;
		}
	}

	return { check };
}
