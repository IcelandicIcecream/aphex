// types/agent-tools.ts
//
// Provider-neutral contract for a tool an AI agent can call — the seam both
// MCP (packages/cms-core/src/lib/mcp/tools.ts) and a future in-admin agent
// panel sit on top of (Milestone 2 of references/content-copilot-phase-1-plan.md).
//
// Deliberately dependency-light and client-safe (no DB handles, no provider
// SDKs) so a definition can be listed/described in the admin UI without
// pulling in server-only code — only the `execute` function actually touches
// `LocalAPIContext`/`CMSInstances`, and even those arrive as call-time
// arguments rather than static imports (the same shape `aphex/event/consumer`
// and `aphex/job/handler` already use to stay barrel-weight-safe).
import type { z } from 'zod';
import type { Capability } from './capabilities';
import type { CMSInstances } from '../hooks';
import type { LocalAPIContext } from '../local-api/index';

/**
 * Where a tool's `execute` actually runs.
 *
 * - `server`: runs entirely in this process against the database — the vast
 *   majority of tools (read, patch, publish, ...).
 * - `workspace`: must round-trip to a live editor tab holding the in-progress
 *   draft (e.g. "apply this change to what's currently open, unsaved, in the
 *   browser"). Not wired yet — Milestone 2 item 6's workspace bridge is the
 *   thing that makes this mode possible; declaring it now lets tool authors
 *   express the intent ahead of the transport existing.
 */
export type AgentToolExecutionMode = 'server' | 'workspace';

/**
 * Serializable description of a tool — the part an LLM/UI needs to know a
 * tool exists and how to call it, without knowing how to run it.
 */
export interface AgentToolDefinition<TInput = unknown> {
	/** Unique, namespaced by package to avoid collisions (e.g. `content_patch_fields`). */
	name: string;
	description: string;
	/**
	 * Whether invoking this tool can change stored data. A coarse, cheap-to-display
	 * hint for approval flows and audit — not itself an authorization mechanism
	 * (`requiredCapabilities` is what's actually enforced).
	 */
	mutates: boolean;
	/**
	 * Capabilities required to see AND to invoke this tool — checked at both
	 * advertisement (don't list a tool the caller can't use) and execution
	 * (don't trust the advertisement check alone). A tool hidden from an
	 * unauthorized caller must also reject direct invocation.
	 */
	requiredCapabilities: Capability[];
	execution: AgentToolExecutionMode;
	/** zod schema for the tool's arguments — single source of truth for validation. */
	inputSchema: z.ZodType<TInput>;
}

/** Outcome of a single tool call. */
export interface AgentToolResult {
	success: boolean;
	data?: unknown;
	/** Present when `success` is false — a message safe to show the model/user. */
	error?: string;
}

/** Everything an `execute` function needs to act on behalf of the calling request. */
export interface AgentToolExecutionContext {
	aphexCMS: CMSInstances;
	context: LocalAPIContext;
}

/**
 * Runs a tool call. Receives services via `ctx` at call time rather than
 * static import, so a module defining an executor never has a heavy/server
 * import at its top level — safe to sit alongside a definition in a plugin
 * part that's also referenced from client-shared code.
 */
export type AgentToolExecutor<TInput = unknown> = (
	input: TInput,
	ctx: AgentToolExecutionContext
) => Promise<AgentToolResult>;
