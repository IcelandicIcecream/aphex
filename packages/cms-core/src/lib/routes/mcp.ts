// MCP server route handler (Streamable HTTP transport).
//
// Lives in cms-core so it ships with the package — apps re-export it:
//   export { POST, GET, DELETE } from '@aphexcms/cms-core/routes/mcp';
// A cms-core version bump ships MCP improvements + protocol conformance (owned
// by @modelcontextprotocol/sdk via @hono/mcp's web-standard transport), so the
// app's route file never changes.
//
// Auth: send the CMS API key as `x-api-key: <key>` (or `Authorization: Bearer
// <key>`). The key is org-bound; every tool call runs under its RBAC + RLS
// scope. A read-only key is rejected by the permission layer on writes.
//
// Mount at top-level `/mcp` (not `/api/mcp`): the `/api/*` auth hook treats
// every POST as a write and would 403 read-only keys on the MCP handshake,
// since MCP does everything over POST.

import type { RequestHandler } from '@sveltejs/kit';
import { Hono } from 'hono';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { StreamableHTTPTransport } from '@hono/mcp';
import type { Auth } from '../types/auth';
import { authToContext } from '../local-api/index';
import { buildContentTools } from '../mcp/tools';

const SERVER_INFO = { name: 'aphexcms', version: '0.1.0' };

/** Resolve the API key from either header into an Auth, or null. */
async function authenticate(request: Request, locals: App.Locals): Promise<Auth | null> {
	const { config, databaseAdapter } = locals.aphexCMS;
	const provider = config.auth?.provider;
	if (!provider) return null;

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

	const auth = await authenticate(c.req.raw, locals);
	if (!auth) {
		return c.json({ error: 'Unauthorized: missing or invalid API key' }, 401);
	}

	// Build a fresh server per request so tools are bound to this caller's
	// authenticated context (RBAC + RLS). Stateless: new transport each request.
	const context = authToContext(auth);
	const tools = buildContentTools({ aphexCMS: locals.aphexCMS, context });

	const server = new McpServer(SERVER_INFO, { capabilities: { tools: {} } });
	for (const tool of tools) {
		server.registerTool(
			tool.name,
			{ description: tool.description, inputSchema: tool.inputSchema },
			// The registry stays SDK-agnostic; adapt its neutral result to the SDK's
			// CallToolResult (which adds an index signature) here at the boundary.
			async (args): Promise<CallToolResult> => {
				const result = await tool.handler(args as Record<string, unknown>);
				return { content: result.content, isError: result.isError };
			}
		);
	}

	const transport = new StreamableHTTPTransport();
	await server.connect(transport);

	const response = await transport.handleRequest(c);
	return response ?? c.body(null, 202);
});

const handle: RequestHandler = ({ request, locals }) => app.fetch(request, { locals });

export const POST = handle;
export const GET = handle;
export const DELETE = handle;
