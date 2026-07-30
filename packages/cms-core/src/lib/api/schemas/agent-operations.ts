import { z } from 'zod';

// Request body for POST /api/agent/operations — see server/api/routes/agent-chat.ts. Records
// an audit row for a workspace-bridge tool (`content_patch_fields`/`content_save_draft`) that
// the client resolved locally against a live `DocumentWorkspace`, since the server-side
// `recordMutatingOperation` call inside `/chat`'s SSE loop never sees those results.
export const recordWorkspaceOperationRequest = z.object({
	changeSetId: z.string(),
	toolName: z.string(),
	collection: z.string(),
	id: z.string(),
	success: z.boolean(),
	error: z.string().optional(),
	arguments: z.record(z.string(), z.unknown()).default({}),
	data: z.unknown().optional()
});

export type RecordWorkspaceOperationRequest = z.infer<typeof recordWorkspaceOperationRequest>;
