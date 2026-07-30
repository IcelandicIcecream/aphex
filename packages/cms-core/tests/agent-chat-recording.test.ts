/**
 * Unit coverage for `recordMutatingOperation` (server/api/routes/agent-chat.ts) — the
 * best-effort audit-record helper the agent-chat route calls on every mutating tool result.
 * Exercised against fake `CMSInstances`/`LocalAPIContext` doubles (no real DB) so its
 * control flow — deriving versionBefore/versionAfter, falling back to the result for a
 * document id when the tool call's own args don't have one (create_document), tolerating
 * truly missing data, and never throwing when the DB layer fails — is verified in isolation.
 *
 * Lives in tests/ (not src/) so the package build never compiles it into dist.
 * Run: pnpm -F @aphexcms/cms-core test
 */
import { describe, it, expect, vi } from 'vitest';
import { recordMutatingOperation } from '../src/lib/server/api/routes/agent-chat';
import type { CMSInstances } from '../src/lib/hooks';
import type { LocalAPIContext } from '../src/lib/local-api/types';

function fakeCMS(overrides: {
	listVersions?: ReturnType<typeof vi.fn>;
	recordOperation?: ReturnType<typeof vi.fn>;
}) {
	const listVersions =
		overrides.listVersions ??
		vi.fn().mockResolvedValue({ versions: [{ versionNumber: 4 }, { versionNumber: 3 }], total: 2 });
	const recordOperation = overrides.recordOperation ?? vi.fn().mockResolvedValue({});

	const aphexCMS = {
		databaseAdapter: { recordOperation },
		localAPI: { versionService: { listVersions } }
	} as unknown as CMSInstances;

	return { aphexCMS, listVersions, recordOperation };
}

function fakeContext(): LocalAPIContext {
	return { organizationId: 'org-1' } as LocalAPIContext;
}

describe('recordMutatingOperation', () => {
	it('derives versionBefore/versionAfter from the two most recent versions and records the operation', async () => {
		const { aphexCMS, listVersions, recordOperation } = fakeCMS({});

		await recordMutatingOperation(
			aphexCMS,
			fakeContext(),
			'changeset-1',
			'update_document',
			{ collection: 'post', id: 'doc-1', data: { title: 'New' } },
			true,
			undefined,
			{ document: { id: 'doc-1', _meta: { revision: 4 } } }
		);

		expect(listVersions).toHaveBeenCalledWith(aphexCMS.databaseAdapter, 'org-1', 'doc-1', {
			limit: 2
		});
		expect(recordOperation).toHaveBeenCalledWith({
			changeSetId: 'changeset-1',
			organizationId: 'org-1',
			collection: 'post',
			documentId: 'doc-1',
			toolName: 'update_document',
			arguments: { collection: 'post', id: 'doc-1', data: { title: 'New' } },
			success: true,
			error: undefined,
			versionBefore: 3,
			versionAfter: 4
		});
	});

	it("records versionBefore as null when this is the document's first version", async () => {
		const { aphexCMS, recordOperation } = fakeCMS({
			listVersions: vi.fn().mockResolvedValue({ versions: [{ versionNumber: 1 }], total: 1 })
		});

		await recordMutatingOperation(
			aphexCMS,
			fakeContext(),
			'changeset-1',
			'update_document',
			{ collection: 'post', id: 'doc-1' },
			true,
			undefined,
			{ document: { id: 'doc-1' } }
		);

		expect(recordOperation).toHaveBeenCalledWith(
			expect.objectContaining({ versionBefore: null, versionAfter: 1 })
		);
	});

	it("falls back to the result's document id for create_document, which has no id argument", async () => {
		const { aphexCMS, listVersions, recordOperation } = fakeCMS({
			listVersions: vi.fn().mockResolvedValue({ versions: [{ versionNumber: 1 }], total: 1 })
		});

		await recordMutatingOperation(
			aphexCMS,
			fakeContext(),
			'changeset-1',
			'create_document',
			{ collection: 'post', data: { title: 'New page' } },
			true,
			undefined,
			{ document: { id: 'doc-new' }, validation: { isValid: true, errors: [] } }
		);

		expect(listVersions).toHaveBeenCalledWith(aphexCMS.databaseAdapter, 'org-1', 'doc-new', {
			limit: 2
		});
		expect(recordOperation).toHaveBeenCalledWith(
			expect.objectContaining({
				documentId: 'doc-new',
				toolName: 'create_document',
				// null versionBefore is exactly what makes a create not undoable, by design.
				versionBefore: null,
				versionAfter: 1
			})
		);
	});

	it('does nothing when there is no collection, or no id anywhere (args or result)', async () => {
		const { aphexCMS, listVersions, recordOperation } = fakeCMS({});

		await recordMutatingOperation(
			aphexCMS,
			fakeContext(),
			'changeset-1',
			'create_document',
			{ collection: 'post', data: {} },
			true,
			undefined,
			{ validation: { isValid: true, errors: [] } } // no `document` in the result
		);

		expect(listVersions).not.toHaveBeenCalled();
		expect(recordOperation).not.toHaveBeenCalled();
	});

	it('does not fall back to the result on a failed call (its shape is not trustworthy)', async () => {
		const { aphexCMS, listVersions, recordOperation } = fakeCMS({});

		await recordMutatingOperation(
			aphexCMS,
			fakeContext(),
			'changeset-1',
			'create_document',
			{ collection: 'post', data: {} },
			false,
			'Validation failed',
			undefined
		);

		expect(listVersions).not.toHaveBeenCalled();
		expect(recordOperation).not.toHaveBeenCalled();
	});

	it('never throws when listVersions rejects — best-effort audit recording', async () => {
		const { aphexCMS } = fakeCMS({
			listVersions: vi.fn().mockRejectedValue(new Error('db down'))
		});

		await expect(
			recordMutatingOperation(
				aphexCMS,
				fakeContext(),
				'changeset-1',
				'update_document',
				{ collection: 'post', id: 'doc-1' },
				true,
				undefined,
				{ document: { id: 'doc-1' } }
			)
		).resolves.toBeUndefined();
	});

	it('never throws when recordOperation rejects — best-effort audit recording', async () => {
		const { aphexCMS } = fakeCMS({
			recordOperation: vi.fn().mockRejectedValue(new Error('db down'))
		});

		await expect(
			recordMutatingOperation(
				aphexCMS,
				fakeContext(),
				'changeset-1',
				'update_document',
				{ collection: 'post', id: 'doc-1' },
				false,
				'validation failed',
				undefined
			)
		).resolves.toBeUndefined();
	});
});
