import type { DocumentWorkspace } from '../types/document-workspace';
import type { WorkspaceToolResult } from './workspace-tool-messages';

/** Validate candidate document data before exposing a patch in the live editor. */
export async function applyWorkspacePatch(
	fields: Record<string, unknown>,
	workspace: DocumentWorkspace
): Promise<WorkspaceToolResult> {
	const snapshot = workspace.getSnapshot();
	const validation = await workspace.validate({ ...snapshot.data, ...fields });

	if (validation.structuralErrors.length > 0) {
		const detail = validation.structuralErrors
			.map((entry) => `${entry.field}: ${entry.errors.join(', ')}`)
			.join('; ');
		return {
			success: false,
			data: { applied: [], persisted: false, validation },
			error: `Patch rejected before changing the editor - ${detail}`
		};
	}

	workspace.apply({ type: 'patchFields', fields });
	return {
		success: true,
		data: {
			applied: Object.keys(fields),
			persisted: false,
			validation,
			message: 'Applied in the editor only; content_save_draft must succeed before this is saved.'
		}
	};
}
