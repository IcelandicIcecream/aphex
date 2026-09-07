import { describe, expect, it, vi } from 'vitest';
import { loadFormBlocks } from './forms';

describe('loadFormBlocks', () => {
	it('hydrates only the public published form DTO', async () => {
		const findByID = vi.fn().mockResolvedValue({
			id: 'contact',
			title: 'Internal title',
			fields: [
				{
					_type: 'formEmail',
					_key: 'email',
					name: 'email',
					label: 'Email',
					required: true,
					internalFieldValue: 'secret'
				}
			],
			submitButtonLabel: 'Send',
			confirmationType: 'message',
			confirmationMessage: [{ _type: 'block', children: [] }],
			redirectUrl: '/thanks',
			emails: [{ to: 'private@example.com', subject: 'Private' }],
			_meta: {
				status: 'published',
				organizationId: 'private-org',
				createdBy: 'private-user',
				publishedHash: 'published-v1'
			}
		});
		const services = {
			localAPI: { getCollection: vi.fn(() => ({ findByID })) }
		};
		const blocks: Array<Record<string, unknown>> = [
			{
				_type: 'formBlock',
				form: {
					_type: 'resolvedReference',
					id: 'contact',
					docType: 'form',
					title: 'Contact',
					slug: null
				}
			}
		];

		await loadFormBlocks(services as never, {} as never, blocks);

		expect(findByID).toHaveBeenCalledWith(
			{},
			'contact',
			expect.objectContaining({ perspective: 'published' })
		);
		const publicForm = blocks[0]?._form;
		expect(publicForm).toEqual({
			id: 'contact',
			fields: [
				expect.objectContaining({
					_type: 'formEmail',
					_key: 'email',
					name: 'email',
					label: 'Email',
					required: true
				})
			],
			submitButtonLabel: 'Send',
			confirmationType: 'message',
			confirmationMessage: [{ _type: 'block', children: [] }],
			version: 'published-v1'
		});
		expect(JSON.stringify(publicForm)).not.toMatch(
			/private@example\.com|private-org|private-user|Internal title|internalFieldValue/
		);
	});

	it('does not hydrate retained data from an unpublished form', async () => {
		const findByID = vi.fn().mockResolvedValue({
			id: 'contact',
			fields: [{ _type: 'formEmail', name: 'email', label: 'Email' }],
			_meta: { status: 'unpublished', publishedHash: 'old-published-hash' }
		});
		const blocks: Array<Record<string, unknown>> = [
			{
				_type: 'formBlock',
				form: { _type: 'resolvedReference', id: 'contact', docType: 'form' }
			}
		];

		await loadFormBlocks(
			{ localAPI: { getCollection: vi.fn(() => ({ findByID })) } } as never,
			{} as never,
			blocks
		);

		expect(blocks[0]?._form).toBeNull();
	});
});
