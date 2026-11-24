// MCP server route handler (Streamable HTTP transport).
//
// Core's hook serves it at `/admin/mcp`, and at `/mcp` where it lived first
// (server/core-routes.ts, mcp/paths.ts), so an app needs no route file. One at
// either exact path wins, and an older app's `/mcp` re-export still works:
//   export { POST, GET, DELETE } from '@aphexcms/cms-core/routes/mcp';
// A cms-core version bump ships MCP improvements + protocol conformance (owned
// by @modelcontextprotocol/sdk via @hono/mcp's web-standard transport).
//
// Auth: send the CMS API key as `x-api-key: <key>` (or `Authorization: Bearer
// <key>`), or, when the auth provider offers OAuth, a connected app's token
// (`Authorization: Bearer aphex_at_…`). Either is bound to one organization; every
// tool call runs under its RBAC + RLS scope. A read-only key is rejected by the
// permission layer on writes; a token can never publish or delete.
//
// Not under `/api`: the `/api/*` auth hook treats every POST as a write and would
// 403 read-only keys on the MCP handshake, since MCP does everything over POST. The
// `/admin` auth hook lets it through untouched (it would send it to the login page).

import type { RequestHandler } from '@sveltejs/kit';
import { Hono } from 'hono';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { StreamableHTTPTransport } from '@hono/mcp';
import type { ApiKeyAuth } from '../types/auth';
import { authToContext } from '../local-api/index';
import { hydrateCapabilities } from '../auth/auth-hooks';
import { hasRequiredCapabilities } from '../schema-utils/required-capabilities';
import { resolveCapabilities } from '../types/capabilities';
import { mcpWwwAuthenticate } from '../server/oauth-discovery';
import { buildContentTools } from '../mcp/tools';
import { recordMcpWrite } from '../mcp/change-sets';
import { callerLimits, tooManyCallsMessage } from '../server/api/caller-limits';
import { buildMcpInstructions } from '../mcp/instructions';
import { getGuideInput, readGuide } from '../mcp/guides';
import { promptArgsShape } from '../mcp/prompts';
import { isMcpEnabled } from '../mcp/paths';

const SERVER_INFO = { name: 'aphexcms', version: '0.1.0' };

/**
 * Who's calling: a connected app's token (OAuth, when the provider offers it) or an
 * API key from either header. Both come back as one user in one organization.
 */
async function authenticate(request: Request, locals: App.Locals): Promise<ApiKeyAuth | null> {
	const { config, databaseAdapter } = locals.aphexCMS;
	const provider = config.auth?.provider;
	if (!provider) return null;

	const token = await provider.oauth?.validateToken(request, databaseAdapter);
	if (token) return token;

	let key = request.headers.get('x-api-key');
	if (!key) {
		const authz = request.headers.get('authorization');
		const match = authz?.match(/^Bearer\s+(.+)$/i);
		if (match && match[1]) key = match[1];
	}
	if (!key) return null;

	// validateApiKey only reads the x-api-key header — hand it a headers-only
	// request so we never touch the real JSON-RPC body stream.
	const keyRequest = new Request(request.url, { headers: { 'x-api-key': key } });
	return provider.validateApiKey(keyRequest, databaseAdapter);
}

// Hono is used only as the web-standard transport host for @hono/mcp — not as a
// router. `locals` is injected per request via the fetch env.
type McpEnv = { Bindings: { locals: App.Locals } };
const app = new Hono<McpEnv>();

app.all('*', async (c) => {
	const { locals } = c.env;
	// Reached through an app's own route file even when it's off.
	if (!isMcpEnabled(locals.aphexCMS.config)) return c.json({ error: 'Not found' }, 404);

	// On a tenant's URL (`acme.example.com/mcp`), only Acme's keys work, so an
	// assistant connected to two clients can't edit one through the other's address.
	// Mounted outside `/api`, so the auth hook's tenant check doesn't cover it.
	const tenant = locals.aphexTenantOrganization;
	if (locals.aphexTenant && !tenant) {
		return c.json({ error: 'Not found' }, 404);
	}

	const auth = await authenticate(c.req.raw, locals);
	if (!auth) {
		// Tells an MCP client where to sign in, which is how Claude and ChatGPT start
		// connecting. Without OAuth there's nowhere to send them, so no header.
		const oauth = locals.aphexCMS.config.auth?.provider?.oauth;
		if (oauth) {
			const { issuer } = await oauth.metadata();
			c.header('WWW-Authenticate', mcpWwwAuthenticate(String(issuer), new URL(c.req.url).pathname));
		}
		return c.json({ error: 'Unauthorized: missing or invalid API key or token' }, 401);
	}
	if (tenant && auth.organizationId !== tenant.id) {
		return c.json({ error: `This key or connection isn't for ${tenant.name}` }, 403);
	}
	// Outside `/api`, so the auth hook never gave this caller what its organization
	// has (a plan, a site's features). Without it every gated type and tool is hidden.
	const { config, databaseAdapter, rolesService } = locals.aphexCMS;
	await hydrateCapabilities(auth, config, databaseAdapter, rolesService);

	const gate = config.mcp?.requiredCapabilities;
	if (gate && !hasRequiredCapabilities({ requiredCapabilities: gate }, resolveCapabilities(auth))) {
		const labels = config.organizationCapabilities?.labels;
		const needs = gate.map((id) => labels?.[id]?.title ?? id).join(', ');
		return c.json(
			{ error: `This organization's plan doesn't include MCP access (needs ${needs}).` },
			403
		);
	}

	// Build a fresh server per request so tools are bound to this caller's
	// authenticated context (RBAC + RLS). Stateless: new transport each request.
	const context = authToContext(auth);
	// Every write is recorded in the caller's change set, so the Activity view shows what a
	// connected app changed and can undo it, as it does for the in-admin agent.
	const tools = buildContentTools(
		{ aphexCMS: locals.aphexCMS, context },
		{
			onWrite: (name, args, result) =>
				recordMcpWrite(locals.aphexCMS, context, auth, name, args, result)
		}
	);

	// The tenant check above found it on a tenant's address; otherwise look it up.
	const organization = tenant ?? (await databaseAdapter.findOrganizationById(auth.organizationId));
	if (!organization) return c.json({ error: 'Unauthorized: this site no longer exists' }, 401);
	const { instructions, guides } = await buildMcpInstructions(locals.aphexCMS, {
		organization,
		auth,
		origin: new URL(c.req.url).origin
	});

	const server = new McpServer(SERVER_INFO, { capabilities: { tools: {} }, instructions });
	// The app's guides (`mcp.guides`), listed in the instructions and read on demand.
	// Clients disagree on MCP resources and prompts, while all of them call tools.
	if (guides.length && !tools.some((tool) => tool.name === 'get_guide')) {
		server.registerTool(
			'get_guide',
			{
				title: 'Read a guide',
				description: `Read one of this site's guides before doing that job: ${guides.map((g) => g.name).join(', ')}. The instructions say what each covers.`,
				inputSchema: getGuideInput,
				annotations: {
					title: 'Read a guide',
					readOnlyHint: true,
					destructiveHint: false,
					openWorldHint: false
				}
			},
			async ({ name }): Promise<CallToolResult> => {
				const { text, isError } = readGuide(guides, name);
				return { content: [{ type: 'text', text }], isError };
			}
		);
	}
	for (const tool of tools) {
		server.registerTool(
			tool.name,
			{
				title: tool.title,
				description: tool.description,
				inputSchema: tool.inputSchema,
				// What clients show and ask approval by (Claude's directory requires them):
				// a read is marked read-only; a change says whether it can overwrite or
				// remove, and whether it reaches past this site (a tool that reads a web page).
				annotations: {
					title: tool.title,
					readOnlyHint: !tool.mutates,
					// Explicit on every tool, false for a read: ChatGPT's directory requires all three hints.
					destructiveHint: tool.mutates ? tool.destructive : false,
					openWorldHint: tool.openWorld
				}
			},
			// The registry stays SDK-agnostic; adapt its neutral result to the SDK's
			// CallToolResult (which adds an index signature) here at the boundary.
			async (args): Promise<CallToolResult> => {
				// Each caller's fair share (`config.rateLimit`): over it, the agent is told how
				// long to wait, in words, so it backs off rather than retrying blindly.
				const kind = tool.name === 'upload_asset' ? 'upload' : tool.mutates ? 'write' : 'read';
				const limit = callerLimits.check(auth, kind, config.rateLimit);
				if (!limit.allowed) {
					return { content: [{ type: 'text', text: tooManyCallsMessage(limit) }], isError: true };
				}
				const result = await tool.handler(args as Record<string, unknown>);
				return { content: result.content, isError: result.isError };
			}
		);
	}

	// The app's prompts (`mcp.prompts`): ready-made requests the client offers its user.
	const promptContext = {
		organization,
		auth,
		capabilities: new Set(resolveCapabilities(auth)),
		origin: new URL(c.req.url).origin
	};
	for (const prompt of locals.aphexCMS.config.mcp?.prompts ?? []) {
		server.registerPrompt(
			prompt.name,
			{ title: prompt.title, description: prompt.description, argsSchema: promptArgsShape(prompt) },
			async (args) => {
				const text = await prompt.text(args as Record<string, string | undefined>, promptContext);
				return {
					messages: [{ role: 'user', content: { type: 'text', text: text ?? prompt.description } }]
				};
			}
		);
	}

	const transport = new StreamableHTTPTransport();
	await server.connect(transport);

	const response = await transport.handleRequest(c);
	return response ?? c.body(null, 202);
});

export const handle: RequestHandler = ({ request, locals }) => app.fetch(request, { locals });

export const POST = handle;
export const GET = handle;
export const DELETE = handle;
