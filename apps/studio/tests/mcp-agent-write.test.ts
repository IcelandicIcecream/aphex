import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createLocalAPI } from '@aphexcms/cms-core/server';
import { buildContentTools, type McpTool, type McpToolResult } from '@aphexcms/cms-core/mcp/tools';
import { db } from './helpers/db';
import cmsConfig from './fixtures/config';
import { TEST_ORG_ID } from './helpers/test-constants';

// End-to-end MCP writes: the tools an agent actually calls, wired to the *real*
// LocalAPI against a real database — no doubles.
//
// `packages/cms-core/tests/mcp-tools.test.ts` already covers each tool's wiring
// and authorization against fakes, asserting that `create_document` calls
// `collection.create`. What no test proved is the **composition**: that a write
// arriving over MCP is subject to the same validation as one from the admin UI.
// That gap is exactly the bug that motivated this file — an agent panel wrote
// keys no schema declared and they were persisted silently, because validation
// walked the schema's field list and never looked at anything outside it.

let localAPI: ReturnType<typeof createLocalAPI>;
let tools: McpTool[];
const created: string[] = [];

const CAPABILITIES = ['document.read', 'document.create', 'document.update', 'document.publish'];

/** Invoke an MCP tool by name, as the transport would. */
async function call(name: string, args: Record<string, unknown>) {
	const tool = tools.find((t) => t.name === name);
	if (!tool) throw new Error(`Tool not registered: ${name}`);
	return tool.handler(args);
}

/**
 * MCP tool handlers report failure in their result rather than throwing — the
 * model has to be able to read the error and correct itself, which is the whole
 * point of surfacing validation over this transport.
 */
function resultText(result: McpToolResult): string {
	return result.content.map((part) => part.text).join('\n');
}

/**
 * A rejected write has to fail *as a tool error*, not merely mention the bad
 * field somewhere in a success payload — otherwise a model reads it as "saved"
 * and moves on. Assert both the flag and that the message names the offender,
 * so the agent has enough to correct itself.
 */
function expectRejected(result: McpToolResult, naming: RegExp) {
	expect(result.isError).toBe(true);
	expect(resultText(result)).toMatch(naming);
}

beforeAll(() => {
	localAPI = createLocalAPI(cmsConfig, db);

	const aphexCMS = {
		config: cmsConfig,
		localAPI,
		// Document tools only — asset tools are covered against doubles in cms-core.
		assetService: undefined,
		partResolver: { agentToolsForCapabilities: () => [] }
	};

	tools = buildContentTools({
		aphexCMS: aphexCMS as never,
		context: {
			organizationId: TEST_ORG_ID,
			auth: {
				type: 'api_key',
				keyId: 'test-key',
				name: 'mcp test key',
				permissions: [],
				capabilities: CAPABILITIES
			}
		} as never
	});
});

afterAll(async () => {
	const ctx = { organizationId: TEST_ORG_ID, overrideAccess: true };
	for (const id of created.reverse()) {
		await localAPI.collections.strictDoc.delete(ctx, id).catch(() => {});
	}
});

describe('MCP writes go through the same validation as the admin UI', () => {
	it('creates a valid document', async () => {
		const result = await call('create_document', {
			collection: 'strictDoc',
			data: { title: 'From an agent' }
		});

		// Assert the structured flag, not the text — a successful payload legitimately
		// contains the word "error" (it carries `structuralErrors: []`).
		expect(result.isError).toBeFalsy();

		// Prove it actually landed, and remember it for cleanup.
		const found = await localAPI.collections.strictDoc.find(
			{ organizationId: TEST_ORG_ID, overrideAccess: true },
			{ where: { title: { equals: 'From an agent' } } }
		);
		expect(found.docs.length).toBeGreaterThan(0);
		for (const doc of found.docs) created.push((doc as { id: string }).id);
	});

	it('rejects an undeclared top-level field', async () => {
		// The original failure: an agent inventing a key that no schema declares.
		const result = await call('create_document', {
			collection: 'strictDoc',
			data: { title: 'Agent write', totallyMadeUp: 'agent invented this' }
		});

		expectRejected(result, /totallyMadeUp|unknown/i);
	});

	it('rejects an undeclared key nested inside an object field', async () => {
		const result = await call('create_document', {
			collection: 'strictDoc',
			data: { title: 'Agent write', meta: { label: 'fine', bogus: 'invented' } }
		});

		expectRejected(result, /bogus|unknown/i);
	});

	it('rejects an undeclared key inside an array item', async () => {
		const result = await call('create_document', {
			collection: 'strictDoc',
			data: {
				title: 'Agent write',
				tags: [{ _type: 'tagEntry', value: 'fine', bogus: 'invented' }]
			}
		});

		expectRejected(result, /bogus|unknown/i);
	});

	it('rejects a value of the wrong primitive type', async () => {
		const result = await call('create_document', {
			collection: 'strictDoc',
			data: { title: 'Agent write', count: 'not-a-number' }
		});

		expectRejected(result, /number|expected/i);
	});

	it('rejects an undeclared field on update, not just create', async () => {
		const { document } = await localAPI.collections.strictDoc.create(
			{ organizationId: TEST_ORG_ID, overrideAccess: true },
			{ title: 'Updatable' } as never
		);
		created.push(document.id);

		const result = await call('update_document', {
			collection: 'strictDoc',
			id: document.id,
			data: { totallyMadeUp: 'agent invented this' }
		});

		expectRejected(result, /totallyMadeUp|unknown/i);
	});

	it('does not persist a rejected write', async () => {
		const { document } = await localAPI.collections.strictDoc.create(
			{ organizationId: TEST_ORG_ID, overrideAccess: true },
			{ title: 'Untouched' } as never
		);
		created.push(document.id);

		await call('update_document', {
			collection: 'strictDoc',
			id: document.id,
			data: { title: 'Changed', totallyMadeUp: 'agent invented this' }
		});

		// The rejected update must leave the stored document exactly as it was —
		// no partial application of the valid half of the payload.
		const after = await localAPI.collections.strictDoc.findByID(
			{ organizationId: TEST_ORG_ID, overrideAccess: true },
			document.id
		);
		expect((after as Record<string, unknown>).title).toBe('Untouched');
		expect(Object.keys(after ?? {})).not.toContain('totallyMadeUp');
	});
});

describe('MCP writes to a registered block', () => {
	const owner = { organizationId: TEST_ORG_ID, overrideAccess: true };
	const block = (extra: object, key = 'a') => ({ _type: 'strictBlock', _key: key, ...extra });

	/** A page saved by something other than an agent, holding a leftover and a retired field. */
	async function pageWithLeftovers() {
		const { document } = await localAPI.collections.strictDoc.create(owner, {
			title: 'Blocks',
			blocks: [block({ legacy: 'red', emoji: 'pin' })]
		} as never);
		created.push(document.id);
		return document.id;
	}

	it('refuses a field the block does not have, naming the ones it does', async () => {
		const result = await call('create_document', {
			collection: 'strictDoc',
			data: { title: 'Agent write', blocks: [block({ icon: 'calendar' })] }
		});
		expectRejected(result, /blocks\[0\]\.icon isn't a field of Strict Block\. Its fields: symbol/);
	});

	it('refuses it through patch_document too, and saves nothing', async () => {
		const id = await pageWithLeftovers();
		const result = await call('patch_document', {
			collection: 'strictDoc',
			id,
			operations: [{ op: 'set', path: 'blocks[_key=="a"].icon', value: 'calendar' }]
		});
		expectRejected(result, /icon isn't a field/);
		const after = await localAPI.collections.strictDoc.findByID(owner, id);
		expect(JSON.stringify(after)).not.toContain('calendar');
	});

	it('still edits a page that holds leftovers', async () => {
		const id = await pageWithLeftovers();
		const result = await call('patch_document', {
			collection: 'strictDoc',
			id,
			operations: [{ op: 'set', path: 'blocks[_key=="a"].symbol', value: 'calendar' }]
		});
		expect(result.isError).toBeFalsy();
	});

	it('refuses a new value in a retired field and lets the old one be cleared', async () => {
		const id = await pageWithLeftovers();
		const patch = (operation: object) =>
			call('patch_document', { collection: 'strictDoc', id, operations: [operation] });
		const path = 'blocks[_key=="a"].emoji';
		expectRejected(
			await patch({ op: 'set', path, value: 'star' }),
			/no longer used\. Use "symbol"/
		);
		expect((await patch({ op: 'unset', path })).isError).toBeFalsy();
	});

	it('validate_document says what a save would', async () => {
		const id = await pageWithLeftovers();
		const check = async (data: object, extra: object = {}) =>
			resultText(await call('validate_document', { collection: 'strictDoc', data, ...extra }));
		const leftovers = { title: 'x', blocks: [block({ legacy: 'red' })] };
		expect(await check(leftovers)).toMatch(/legacy/);
		expect(await check(leftovers, { id })).not.toMatch(/legacy/);
	});

	it('get_schema leaves the retired field out', async () => {
		const text = resultText(await call('get_schema', { collection: 'strictDoc' }));
		expect(text).toContain('symbol');
		expect(text).not.toContain('emoji');
	});
});
