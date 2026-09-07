import { describe, expect, it, vi } from 'vitest';
import { applyWorkspacePatch } from '../src/lib/ai/apply-workspace-patch';
import type { DocumentWorkspace } from '../src/lib/types/document-workspace';

describe('applyWorkspacePatch', () => {
	it('returns schema errors to the agent without changing the editor', async () => {
		const apply = vi.fn();
		const workspace = {
			getSnapshot: () => ({
				documentId: 'page-1',
				collection: 'page',
				data: { title: 'Home' },
				status: 'draft' as const,
				revision: 1
			}),
			validate: vi.fn().mockResolvedValue({
				isValid: false,
				errors: [{ field: 'excerpt', errors: ['Unknown field "excerpt"'], kind: 'structural' }],
				structuralErrors: [
					{ field: 'excerpt', errors: ['Unknown field "excerpt"'], kind: 'structural' }
				]
			}),
			apply
		} as unknown as DocumentWorkspace;

		const result = await applyWorkspacePatch({ excerpt: 'Post copy' }, workspace);

		expect(workspace.validate).toHaveBeenCalledWith({ title: 'Home', excerpt: 'Post copy' });
		expect(apply).not.toHaveBeenCalled();
		expect(result).toMatchObject({
			success: false,
			data: { applied: [], persisted: false },
			error: expect.stringContaining('excerpt: Unknown field "excerpt"')
		});
	});

	it('applies a structurally valid patch in memory without claiming it was saved', async () => {
		const apply = vi.fn();
		const workspace = {
			getSnapshot: () => ({
				documentId: 'page-1',
				collection: 'page',
				data: { title: 'Home' },
				status: 'draft' as const,
				revision: 1
			}),
			validate: vi.fn().mockResolvedValue({
				isValid: true,
				errors: [],
				structuralErrors: []
			}),
			apply
		} as unknown as DocumentWorkspace;

		const result = await applyWorkspacePatch({ title: 'About' }, workspace);

		expect(apply).toHaveBeenCalledWith({ type: 'patchFields', fields: { title: 'About' } });
		expect(result).toMatchObject({ success: true, data: { persisted: false } });
	});
});
