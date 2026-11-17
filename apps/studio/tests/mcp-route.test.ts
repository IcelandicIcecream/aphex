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
import { describe, expect, it } from 'vitest';
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
