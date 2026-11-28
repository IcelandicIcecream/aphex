/**
 * What an app connected over MCP changes is recorded like the in-admin agent's turns
 * (`mcp/change-sets.ts`): one change set per app per site for a burst of writes, a new
 * one after a quiet spell, credited to the person the app acts for.
 *
 * Run: pnpm -F @aphexcms/cms-core test
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { forgetMcpChangeSets, QUIET_MS, recordMcpWrite } from '../src/lib/mcp/change-sets';
import { MCP_PROVIDER } from '../src/lib/types/agent-change-sets';
import type { CMSInstances } from '../src/lib/hooks';
import type { LocalAPIContext } from '../src/lib/local-api/types';
import type { ApiKeyAuth } from '../src/lib/types/auth';

function fakeCMS() {
	let n = 0;
	const createChangeSet = vi.fn(async () => ({ id: `cs-${++n}` }));
	const completeChangeSet = vi.fn(async () => undefined);
	const recordOperation = vi.fn(async () => ({}));
	const aphexCMS = {
		databaseAdapter: { createChangeSet, completeChangeSet, recordOperation },
		localAPI: {
			versionService: {
				listVersions: vi.fn(async () => ({
					versions: [{ versionNumber: 2 }, { versionNumber: 1 }]
				}))
			}
		}
	} as unknown as CMSInstances;
	return { aphexCMS, createChangeSet, completeChangeSet, recordOperation };
}

const context = { organizationId: 'org-1' } as LocalAPIContext;
const claude: ApiKeyAuth = {
	type: 'api_key',
	keyId: 'oauth:claude',
	name: 'Claude',
	permissions: ['read', 'write'],
	organizationId: 'org-1',
	userId: 'user-1'
};
const chatgpt: ApiKeyAuth = { ...claude, keyId: 'oauth:chatgpt', name: 'ChatGPT' };
const write = (cms: CMSInstances, auth: ApiKeyAuth, id = 'doc-1') =>
	recordMcpWrite(
		cms,
		context,
		auth,
		'update_document',
		{ collection: 'page', id },
		{ success: true }
	);

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
	forgetMcpChangeSets();
	vi.useRealTimers();
});

describe('MCP change sets', () => {
	it('puts one app’s burst of writes in one change set, credited to its person', async () => {
		const { aphexCMS, createChangeSet, recordOperation } = fakeCMS();
		await write(aphexCMS, claude, 'doc-1');
		await write(aphexCMS, claude, 'doc-2');
		expect(createChangeSet).toHaveBeenCalledTimes(1);
		expect(createChangeSet).toHaveBeenCalledWith(
			expect.objectContaining({
				organizationId: 'org-1',
				createdBy: 'user-1',
				provider: MCP_PROVIDER,
				model: 'Claude'
			})
		);
		expect(recordOperation.mock.calls.map(([op]) => [op.changeSetId, op.documentId])).toEqual([
			['cs-1', 'doc-1'],
			['cs-1', 'doc-2']
		]);
	});

	it('starts a new change set after a quiet spell, and completes the old one', async () => {
		const { aphexCMS, createChangeSet, completeChangeSet } = fakeCMS();
		await write(aphexCMS, claude);
		await vi.advanceTimersByTimeAsync(QUIET_MS + 1);
		expect(completeChangeSet).toHaveBeenCalledWith('org-1', 'cs-1', { status: 'completed' });
		await write(aphexCMS, claude);
		expect(createChangeSet).toHaveBeenCalledTimes(2);
	});

	it('never mixes two apps, and credits a plain API key to the key', async () => {
		const { aphexCMS, createChangeSet } = fakeCMS();
		await write(aphexCMS, claude);
		await write(aphexCMS, chatgpt);
		await write(aphexCMS, { ...claude, keyId: 'key-9', name: 'CI', userId: undefined });
		expect(createChangeSet).toHaveBeenCalledTimes(3);
		expect(createChangeSet).toHaveBeenLastCalledWith(
			expect.objectContaining({ createdBy: 'apikey:key-9' })
		);
	});

	it('never fails the tool call when recording fails', async () => {
		const { aphexCMS, createChangeSet } = fakeCMS();
		createChangeSet.mockRejectedValueOnce(new Error('db down'));
		await expect(write(aphexCMS, claude)).resolves.toBeUndefined();
		// …and the next write tries again rather than going unrecorded.
		await write(aphexCMS, claude);
		expect(createChangeSet).toHaveBeenCalledTimes(2);
	});
});
