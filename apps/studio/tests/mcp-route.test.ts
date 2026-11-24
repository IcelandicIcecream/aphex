/**
 * The `/mcp` route itself: who the caller is, and what their organization has.
 *
 * `mcp-agent-write.test.ts` calls the tools directly with a hand-made context. This
 * goes through the route, so it covers what the route decides before any tool runs:
 * the organization's own capabilities (a plan, a site's features) applied to the
 * caller, as every other route does.
 *
 * Run: pnpm -F @aphexcms/studio test mcp-route
 */
import { afterAll, describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
	ALL_CAPABILITIES,
	type AgentInstructionsPart,
	type ApiKeyAuth,
	type SchemaType
} from '@aphexcms/cms-core';
import { createLocalAPI, RolesService } from '@aphexcms/cms-core/server';
import { POST } from '@aphexcms/cms-core/routes/mcp';
import { db } from './helpers/db';
import cmsConfig from './fixtures/config';
import { TEST_ORG_ID } from './helpers/test-constants';

const gated: SchemaType = {
	type: 'document',
	name: 'mcpShopItem',
	title: 'Shop item',
	requiredCapabilities: ['site.shop'],
	fields: [{ name: 'title', type: 'string', title: 'Title' }]
};

/** What a real key resolves to: its owner's role, which never holds a plan's capability. */
const key: ApiKeyAuth = {
	type: 'api_key',
	keyId: 'k',
	name: 'test key',
	permissions: ['read', 'write'],
	capabilities: [...ALL_CAPABILITIES],
	organizationId: TEST_ORG_ID
};

function setup(
	granted: string[],
	extra: Record<string, unknown> = {},
	instructionParts: AgentInstructionsPart[] = []
) {
	const config = {
		...cmsConfig,
		schemaTypes: [...cmsConfig.schemaTypes, gated],
		plugins: [],
		organizationCapabilities: { ids: ['site.shop'], resolve: async () => granted },
		auth: {
			...cmsConfig.auth,
			provider: { validateApiKey: async () => structuredClone(key) }
		},
		...extra
	};
	const aphexCMS = {
		config,
		databaseAdapter: db,
		localAPI: createLocalAPI(config as never, db),
		rolesService: new RolesService(db, null),
		partResolver: {
			agentToolsForCapabilities: () => [],
			agentInstructionsForCapabilities: (capabilities: string[]) =>
				instructionParts.filter((part) =>
					(part.requiredCapabilities ?? []).every((id) => capabilities.includes(id))
				)
		}
	};
	return { locals: { aphexCMS } as unknown as App.Locals };
}

async function rpc(locals: App.Locals, method: string, params: Record<string, unknown> = {}) {
	const request = new Request('http://localhost/mcp', {
		method: 'POST',
		headers: {
			'content-type': 'application/json',
			accept: 'application/json, text/event-stream',
			'x-api-key': 'test'
		},
		body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params })
	});
	const response = await POST({ request, locals } as never);
	const text = await response.text();
	// Streamable HTTP may answer as an SSE stream: take the data line.
	const data = text.startsWith('{') ? text : (text.match(/^data: (.*)$/m)?.[1] ?? text);
	return { status: response.status, body: JSON.parse(data) };
}

async function collections(locals: App.Locals): Promise<string[]> {
	const { body } = await rpc(locals, 'tools/call', { name: 'list_collections', arguments: {} });
	const payload = JSON.parse(body.result.content[0].text);
	return payload.collections.map((c: { name: string }) => c.name);
}

describe("/mcp applies the organization's own capabilities", () => {
	it('shows a gated type to an organization that has the feature', async () => {
		const { locals } = setup(['site.shop']);
		expect(await collections(locals)).toContain('mcpShopItem');
	});

	it('hides it from one that does not', async () => {
		const { locals } = setup([]);
		expect(await collections(locals)).not.toContain('mcpShopItem');
	});
});

describe('mcp.enabled', () => {
	it("answers 404 through an app's own route file when MCP is off", async () => {
		const { locals } = setup([], { mcp: { enabled: false } });
		expect((await rpc(locals, 'tools/list')).status).toBe(404);
	});
});

describe('mcp.requiredCapabilities gates the whole server', () => {
	const pro = { mcp: { requiredCapabilities: ['site.shop'] } };

	it('refuses an organization without it, naming what it needs', async () => {
		const { locals } = setup([], pro);
		(locals.aphexCMS.config as any).organizationCapabilities.labels = {
			'site.shop': { title: 'Pro' }
		};
		const { status, body } = await rpc(locals, 'tools/list');
		expect(status).toBe(403);
		expect(body.error).toMatch(/needs Pro/);
	});

	it('lets one with it in', async () => {
		const { locals } = setup(['site.shop'], pro);
		const { status, body } = await rpc(locals, 'tools/list');
		expect(status).toBe(200);
		expect(body.result.tools.length).toBeGreaterThan(0);
	});

	it('gives every tool a title and says whether it reads, adds or overwrites', async () => {
		const { locals } = setup(['site.shop'], pro);
		const { body } = await rpc(locals, 'tools/list');
		type Listed = { name: string; title?: string; annotations?: Record<string, unknown> };
		const tools = body.result.tools as Listed[];
		for (const tool of tools) {
			expect(tool.title, tool.name).toBeTruthy();
			expect(tool.annotations?.title, tool.name).toBe(tool.title);
			expect(tool.annotations?.openWorldHint, tool.name).toBe(false);
		}
		const by = (name: string) => tools.find((tool) => tool.name === name)?.annotations;
		expect(by('get_document')).toMatchObject({ readOnlyHint: true });
		expect(by('get_document')).not.toHaveProperty('destructiveHint');
		expect(by('create_document')).toMatchObject({ readOnlyHint: false, destructiveHint: false });
		expect(by('update_document')).toMatchObject({ readOnlyHint: false, destructiveHint: true });
		expect(by('publish_document')).toMatchObject({ readOnlyHint: false, destructiveHint: true });
	});

	it('cuts off on the next request after a downgrade', async () => {
		let granted = ['site.shop'];
		const { locals } = setup([], pro);
		(locals.aphexCMS.config as any).organizationCapabilities.resolve = async () => granted;
		expect((await rpc(locals, 'tools/list')).status).toBe(200);
		granted = [];
		expect((await rpc(locals, 'tools/list')).status).toBe(403);
	});
});

describe('instructions at initialize', () => {
	const initialize = (locals: App.Locals) =>
		rpc(locals, 'initialize', {
			protocolVersion: '2025-11-25',
			capabilities: {},
			clientInfo: { name: 'test', version: '1' }
		});

	it("gives core's guide, naming the site, and says a key without publish can't publish", async () => {
		const { locals } = setup([]);
		const { body } = await initialize(locals);
		const text: string = body.result.instructions;
		expect(text).toMatch(/Call describe_cms first/);
		expect(text).toMatch(/http:\/\/localhost\/admin\?docType=/);
		// The fixture key holds every capability, publish included.
		expect(text).toMatch(/Publish only when the user asks/);
	});

	it('tells a connection that cannot publish to hand over to the owner', async () => {
		const { locals } = setup([]);
		const config = locals.aphexCMS.config as any;
		config.auth.provider.validateApiKey = async () => ({
			...structuredClone(key),
			capabilities: ['document.read', 'document.create', 'document.update']
		});
		const { body } = await initialize(locals);
		expect(body.result.instructions).toMatch(/You can't publish/);
	});

	it("adds the app's section and the plugin sections the caller's plan unlocks", async () => {
		const parts: AgentInstructionsPart[] = [
			{ implements: 'aphex/agent/instructions', id: 'a', title: 'Forms', text: 'Use forms.' },
			{
				implements: 'aphex/agent/instructions',
				id: 'b',
				title: 'Shop',
				text: 'Sell things.',
				requiredCapabilities: ['site.shop']
			}
		];
		const app = {
			mcp: {
				instructions: ({ organization }: { organization: { name: string } }) =>
					`Build pages for ${organization.name} from the theme's blocks.`
			}
		};

		const without = (await initialize(setup([], app, parts).locals)).body.result.instructions;
		expect(without).toMatch(/Build pages for .+ from the theme's blocks/);
		expect(without).toMatch(/## Forms\n\nUse forms\./);
		expect(without).not.toMatch(/## Shop/);

		const withShop = (await initialize(setup(['site.shop'], app, parts).locals)).body.result
			.instructions;
		expect(withShop).toMatch(/## Shop\n\nSell things\./);
	});
});

describe('mcp.guides', () => {
	const guides = {
		mcp: {
			guides: [
				{
					name: 'homepage',
					title: 'Writing a homepage',
					description: 'Before building or rewriting the homepage.',
					content: 'Lead with what you do.'
				},
				{
					name: 'shop',
					title: 'Selling online',
					description: 'Before adding products.',
					content: ({ capabilities }: { capabilities: ReadonlySet<string> }) =>
						capabilities.has('site.shop') ? 'One product per card.' : null
				}
			]
		}
	};
	const initialize = (locals: App.Locals) =>
		rpc(locals, 'initialize', {
			protocolVersion: '2025-11-25',
			capabilities: {},
			clientInfo: { name: 'test', version: '1' }
		});
	const read = async (locals: App.Locals, name: string) =>
		(await rpc(locals, 'tools/call', { name: 'get_guide', arguments: { name } })).body.result;

	it('lists each guide in a line, and get_guide returns one in full', async () => {
		const { locals } = setup(['site.shop'], guides);
		const text: string = (await initialize(locals)).body.result.instructions;
		expect(text).toMatch(/## Guides/);
		expect(text).toMatch(/- homepage: Before building or rewriting the homepage\./);
		expect(text).not.toMatch(/Lead with what you do/);

		const result = await read(locals, 'homepage');
		expect(result.isError).toBeFalsy();
		expect(result.content[0].text).toBe('# Writing a homepage\n\nLead with what you do.');
	});

	it('leaves out a guide whose content is null for this caller', async () => {
		const { locals } = setup([], guides);
		expect((await initialize(locals)).body.result.instructions).not.toMatch(/- shop:/);
		const result = await read(locals, 'shop');
		expect(result.isError).toBe(true);
		expect(result.content[0].text).toMatch(/The guides are: homepage\./);
	});

	it('offers no get_guide when the app has no guides', async () => {
		const { locals } = setup([]);
		const { body } = await rpc(locals, 'tools/list');
		expect(body.result.tools.map((t: { name: string }) => t.name)).not.toContain('get_guide');
		expect((await initialize(locals)).body.result.instructions).not.toMatch(/## Guides/);
	});
});

describe('mcp.prompts', () => {
	const prompts = {
		mcp: {
			prompts: [
				{
					name: 'make-my-site',
					title: 'Make my site',
					description: 'Build the whole site from what you have.',
					arguments: [{ name: 'website', description: 'Your current website, if any' }],
					text: (
						args: Record<string, string | undefined>,
						context: { organization: { name: string } }
					) =>
						`Make the site for ${context.organization.name}.${args.website ? ` Read ${args.website} first.` : ''}`
				}
			]
		}
	};

	it('lists a prompt with its arguments and fills it in', async () => {
		const { locals } = setup([], prompts);
		const list = (await rpc(locals, 'prompts/list')).body.result.prompts;
		expect(list).toHaveLength(1);
		expect(list[0]).toMatchObject({ name: 'make-my-site', title: 'Make my site' });
		expect(list[0].arguments).toEqual([
			expect.objectContaining({ name: 'website', required: false })
		]);

		const got = (
			await rpc(locals, 'prompts/get', {
				name: 'make-my-site',
				arguments: { website: 'https://example.com' }
			})
		).body.result;
		expect(got.messages[0].role).toBe('user');
		expect(got.messages[0].content.text).toMatch(
			/^Make the site for .+\. Read https:\/\/example\.com first\.$/
		);
	});

	it('refuses a badly named prompt at boot', async () => {
		const { validateMcpPrompts } = await import('@aphexcms/cms-core/server');
		expect(() =>
			validateMcpPrompts([{ name: 'Make My Site', title: 'x', description: 'x', text: () => 'x' }])
		).toThrow(/valid prompt name/);
	});
});

describe('tool results with images', () => {
	it('sends a plugin tool’s images as MCP image content after its JSON', async () => {
		const { locals } = setup([]);
		const pixel =
			'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
		(
			locals.aphexCMS.partResolver as { agentToolsForCapabilities: () => unknown[] }
		).agentToolsForCapabilities = () => [
			{
				definition: {
					name: 'look_at_photo',
					description: 'Returns a photo',
					mutates: false,
					requiredCapabilities: [],
					execution: 'server',
					inputSchema: z.object({})
				},
				execute: async () => ({
					success: true,
					data: { id: 'a1' },
					images: [{ mimeType: 'image/png', data: pixel }]
				})
			}
		];
		const result = (await rpc(locals, 'tools/call', { name: 'look_at_photo', arguments: {} })).body
			.result;
		expect(result.isError).toBeFalsy();
		expect(result.content[0]).toMatchObject({ type: 'text' });
		expect(JSON.parse(result.content[0].text)).toEqual({ id: 'a1' });
		expect(result.content[1]).toEqual({ type: 'image', mimeType: 'image/png', data: pixel });
	});
});

describe('what a connected app changes is recorded for Activity › Agent changes', () => {
	/** A caller of its own per test: an app's open change set is kept per key. */
	function asCaller(caller: Partial<ApiKeyAuth>) {
		const auth = { ...key, ...caller };
		const { locals } = setup(['site.shop'], {
			auth: { ...cmsConfig.auth, provider: { validateApiKey: async () => structuredClone(auth) } }
		});
		return locals;
	}
	const made: string[] = [];
	const mine = async (keyId: string) =>
		(await db.listChangeSets({ organizationId: TEST_ORG_ID, limit: 50 })).items.filter(
			(changeSet) => changeSet.provider === 'mcp' && changeSet.summary?.startsWith(keyId)
		);

	afterAll(async () => {
		const { locals } = setup(['site.shop']);
		const { localAPI } = (
			locals as unknown as { aphexCMS: { localAPI: ReturnType<typeof createLocalAPI> } }
		).aphexCMS;
		const ctx = { organizationId: TEST_ORG_ID, user: { id: 'test', role: 'owner' } } as never;
		for (const id of made) await localAPI.collections.mcpShopItem.delete(ctx, id).catch(() => {});
	});

	it('records a write in a change set, with the tool and the document', async () => {
		const locals = asCaller({ keyId: 'route-write', name: 'route-write app' });
		const { body } = await rpc(locals, 'tools/call', {
			name: 'create_document',
			arguments: { collection: 'mcpShopItem', data: { title: 'Recorded' } }
		});
		expect(body.result.isError).toBeFalsy();
		const id = JSON.parse(body.result.content[0].text).document.id as string;
		made.push(id);

		const [changeSet] = await mine('route-write');
		expect(changeSet).toMatchObject({
			provider: 'mcp',
			model: 'route-write app',
			createdBy: 'apikey:route-write'
		});
		const detail = await db.getChangeSet(TEST_ORG_ID, changeSet.id);
		expect(detail?.operations).toEqual([
			expect.objectContaining({
				toolName: 'create_document',
				collection: 'mcpShopItem',
				documentId: id,
				success: true
			})
		]);
	});

	it('records nothing for reads', async () => {
		const locals = asCaller({ keyId: 'route-read', name: 'route-read app' });
		await rpc(locals, 'tools/call', { name: 'list_collections', arguments: {} });
		expect(await mine('route-read')).toEqual([]);
	});

	it("credits a connected app's changes to the person it acts for", async () => {
		const locals = asCaller({
			keyId: 'oauth:route-person',
			name: 'route-person app',
			userId: 'user-route-person'
		});
		const { body } = await rpc(locals, 'tools/call', {
			name: 'create_document',
			arguments: { collection: 'mcpShopItem', data: { title: 'Credited' } }
		});
		made.push(JSON.parse(body.result.content[0].text).document.id);
		const [changeSet] = await mine('route-person');
		expect(changeSet?.createdBy).toBe('user-route-person');
	});
});
