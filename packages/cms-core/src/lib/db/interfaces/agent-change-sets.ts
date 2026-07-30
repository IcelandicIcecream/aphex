// Agent change-set port — the audit/undo trail for AI-driven writes. Mirrors
// `db/interfaces/events.ts`'s relationship to the event/job spine, but deliberately
// simpler: recording happens as a best-effort side observation in the agent-chat route
// handler (after a tool call already succeeded or failed), not atomically inside the
// document write's own transaction — so, unlike `EventJobAdapter`, nothing here needs to
// be rebindable onto a `withTransaction` handle.
import type {
	AgentChangeSet,
	AgentChangeSetWithOperations,
	AgentOperation,
	CreateAgentChangeSetInput,
	CompleteAgentChangeSetInput,
	RecordAgentOperationInput,
	ListAgentChangeSetsOptions
} from '../../types/agent-change-sets';
import type { Page } from '../../types/events';

export interface AgentChangeSetAdapter {
	/** One row per agent turn, created eagerly before the model is called. */
	createChangeSet(input: CreateAgentChangeSetInput): Promise<AgentChangeSet>;
	/** Record one mutating tool call's outcome against an existing change-set. */
	recordOperation(input: RecordAgentOperationInput): Promise<AgentOperation>;
	/** Finalize a change-set once the turn ends, with its accumulated token totals. */
	completeChangeSet(
		organizationId: string,
		id: string,
		input: CompleteAgentChangeSetInput
	): Promise<void>;
	/** Read one change-set with its operations (org-scoped) — what the undo endpoint acts on. */
	getChangeSet(organizationId: string, id: string): Promise<AgentChangeSetWithOperations | null>;
	/** List change-sets for the org, newest first (the activity view's "Agent Changes" tab).
	 * Includes each change-set's operations so the list can show what a turn did (e.g.
	 * "create_document") without a per-row detail fetch. */
	listChangeSets(options: ListAgentChangeSetsOptions): Promise<Page<AgentChangeSetWithOperations>>;
}
