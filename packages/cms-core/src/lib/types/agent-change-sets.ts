// Dialect-agnostic shapes for the agent audit/undo trail — mirrors `types/events.ts`'s
// relationship to `cms_domain_events`/`cms_jobs`, but for `cms_agent_change_sets`/
// `cms_agent_operations`. One `AgentChangeSet` row per agent turn (not per mutation — a
// pure Q&A turn still costs tokens and is still worth an audit/cost row), with zero or more
// `AgentOperation` children recording the mutating tool calls that turn made.

export type AgentChangeSetStatus = 'in_progress' | 'completed' | 'failed';

/** One agent turn. Created eagerly, before the model is even called, so token usage is
 * captured regardless of whether the turn ends up mutating anything. */
export interface AgentChangeSet {
	id: string;
	organizationId: string;
	createdBy: string | null;
	status: AgentChangeSetStatus;
	/** The turn's first user message, truncated — a human-readable label for the activity list. */
	summary: string | null;
	/** `AIProviderAdapter.name`, e.g. `'anthropic'` / `'openai'` / `'openrouter'`. */
	provider: string;
	model: string;
	promptTokens: number;
	completionTokens: number;
	createdAt: Date;
	completedAt: Date | null;
}

export interface CreateAgentChangeSetInput {
	organizationId: string;
	createdBy?: string | null;
	summary?: string | null;
	provider: string;
	model: string;
}

export interface CompleteAgentChangeSetInput {
	status: AgentChangeSetStatus;
	promptTokens?: number;
	completionTokens?: number;
}

/** One mutating tool call within a turn. `versionBefore` is what an undo restores to — null
 * means there's nothing to restore to (e.g. this was a `create_document`, which isn't
 * undoable in this pass). */
export interface AgentOperation {
	id: string;
	changeSetId: string;
	organizationId: string;
	collection: string;
	documentId: string;
	toolName: string;
	arguments: Record<string, unknown>;
	success: boolean;
	error: string | null;
	versionBefore: number | null;
	versionAfter: number | null;
	createdAt: Date;
}

export interface RecordAgentOperationInput {
	changeSetId: string;
	organizationId: string;
	collection: string;
	documentId: string;
	toolName: string;
	arguments: Record<string, unknown>;
	success: boolean;
	error?: string | null;
	versionBefore?: number | null;
	versionAfter?: number | null;
}

/** A change-set with its operations attached — what the undo endpoint and the activity
 * detail view both need. */
export interface AgentChangeSetWithOperations extends AgentChangeSet {
	operations: AgentOperation[];
}

export interface ListAgentChangeSetsOptions {
	organizationId: string;
	limit?: number;
	offset?: number;
}
