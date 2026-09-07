import { describe, expect, it } from 'vitest';
import { workspaceToolResultMessages } from '../src/lib/ai/workspace-tool-messages';

describe('workspaceToolResultMessages', () => {
	it('makes a failed draft save unambiguous to the resumed agent', () => {
		const messages = workspaceToolResultMessages('call-save', 'content_save_draft', {
			success: false,
			error: 'Invalid document data - excerpt: Unknown field "excerpt"'
		});

		expect(JSON.parse(messages[0]!.content)).toEqual({
			success: false,
			persisted: false,
			data: null,
			error: 'Invalid document data - excerpt: Unknown field "excerpt"'
		});
		expect(messages[1]).toMatchObject({
			role: 'system',
			content: expect.stringContaining('they were not saved')
		});
		expect(messages[1]!.content).toContain(
			'Do not claim the content was created, updated, or saved'
		);
	});

	it('distinguishes an in-memory patch from a persisted save', () => {
		const [patch] = workspaceToolResultMessages('call-patch', 'content_patch_fields', {
			success: true,
			data: { applied: ['title'] }
		});
		const [save] = workspaceToolResultMessages('call-save', 'content_save_draft', {
			success: true,
			data: { revision: 2 }
		});

		expect(JSON.parse(patch!.content).persisted).toBe(false);
		expect(JSON.parse(save!.content).persisted).toBe(true);
	});
});
