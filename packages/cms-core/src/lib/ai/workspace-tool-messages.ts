export type WorkspaceToolResult = { success: boolean; data?: unknown; error?: string };

export type WorkspaceToolMessage = {
	role: 'system' | 'tool';
	content: string;
	toolCallId?: string;
};

export function workspaceToolFailureNotice(name: string, error?: string): string {
	return `WORKSPACE TOOL FAILURE: ${name} failed. The editor may contain in-memory changes, but they were not saved. Do not claim the content was created, updated, or saved. Tell the user it remains unsaved and explain this error: ${error ?? 'Unknown error'}`;
}

/** Build the exact messages used to resume the model after a browser-side workspace call. */
export function workspaceToolResultMessages(
	toolCallId: string,
	name: string,
	result: WorkspaceToolResult
): WorkspaceToolMessage[] {
	const messages: WorkspaceToolMessage[] = [
		{
			role: 'tool',
			toolCallId,
			content: JSON.stringify({
				success: result.success,
				persisted: name === 'content_save_draft' ? result.success : false,
				data: result.data ?? null,
				...(result.error ? { error: result.error } : {})
			})
		}
	];

	if (!result.success) {
		messages.push({ role: 'system', content: workspaceToolFailureNotice(name, result.error) });
	}

	return messages;
}
