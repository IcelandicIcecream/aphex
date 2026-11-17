/**
 * Where the MCP server answers. `/admin/mcp` is its address, the one discovery
 * advertises, so everything Aphex owns sits under `/admin` and a site's own pages
 * can't collide with it. `/mcp`, where it lived first, answers too, so clients
 * already set up with it keep working.
 */
export const MCP_PATH = '/admin/mcp';
export const MCP_PATHS: readonly string[] = [MCP_PATH, '/mcp'];

export function isMcpPath(pathname: string): boolean {
	return MCP_PATHS.includes(pathname);
}

/** Whether the app serves MCP at all (`mcp.enabled`, on unless set to false). */
export function isMcpEnabled(config: { mcp?: { enabled?: boolean } } | undefined): boolean {
	return config?.mcp?.enabled !== false;
}
