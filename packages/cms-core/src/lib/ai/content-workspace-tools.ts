// ai/content-workspace-tools.ts
//
// The two `execution: 'workspace'` tools: `content_patch_fields` (buffer a shallow-merge
// patch onto the document currently open in an editor tab) and `content_save_draft`
// (flush the buffered patch(es) as one CAS-guarded save). Live outside `mcp/tools.ts` on
// purpose — these aren't MCP-servable (an MCP client has no browser tab holding a live
// draft), so they only ever reach a caller through `resolveAgentTools`'s `documentContext`
// gate (`mcp/tools.ts`).
//
// `execute` on both is unreachable in practice: `run-agent-turn.ts`'s per-round tool loop
// partitions calls by `definition.execution` and never calls `.execute` for a `'workspace'`
// tool — it pauses the turn instead (see `types/agent-stream.ts`'s `done` event doc) and the
// *client* resolves the call against a live `DocumentWorkspace`. These bodies exist only to
// satisfy `ContentAgentTool`'s shape; don't "clean them up" into something callable without
// also removing the pause branch in `run-agent-turn.ts`, or a workspace tool would silently
// execute server-side against no live draft at all.
import { z } from 'zod';
import type { AgentToolResult } from '../types/agent-tools';
import type { ContentAgentTool } from '../mcp/tools';

const unreachable = (name: string): Promise<AgentToolResult> =>
	Promise.resolve({
		success: false,
		error: `${name} must be resolved client-side against a live DocumentWorkspace; the server should never execute it directly.`
	});

export const contentWorkspaceTools: ContentAgentTool[] = [
	{
		definition: {
			name: 'content_patch_fields',
			description:
				'Patch scalar/reference/asset fields on the document currently open in the editor. ' +
				'Buffered in-memory only — nothing is persisted until content_save_draft is called. ' +
				'Fields not mentioned are left unchanged.',
			mutates: true,
			requiredCapabilities: ['document.update'],
			execution: 'workspace',
			inputSchema: z.object({
				fields: z.record(z.string(), z.unknown()).describe('Top-level field name -> new value.')
			})
		},
		execute: () => unreachable('content_patch_fields')
	},
	{
		definition: {
			name: 'content_save_draft',
			description:
				'Persist the field patch(es) applied via content_patch_fields to the open document as ' +
				'one draft save, guarded against concurrent edits. Does not publish.',
			mutates: true,
			requiredCapabilities: ['document.update'],
			execution: 'workspace',
			inputSchema: z.object({})
		},
		execute: () => unreachable('content_save_draft')
	}
];
