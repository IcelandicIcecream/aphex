---
'@aphexcms/cms-core': minor
---

Reframe the 14 built-in MCP content tools onto the new `AgentToolDefinition`/`AgentToolExecutor` contract (Milestone 2 of `references/content-copilot-phase-1-plan.md`) — same tool behavior, but now defined once as a static `contentAgentTools` array (each a `{ definition, execute }` pair, `execute` receiving services as a call-time argument rather than a per-request closure) instead of being rebuilt fresh on every MCP connection. `buildContentTools()` is now a thin adapter from this list into the MCP SDK's expected shape, so this is purely an internal reframing — the MCP route and every tool's external behavior are unchanged. Sets up the same tool list to eventually serve a future in-admin agent panel through one shared execution path, per the plan's ownership boundary.

`buildContentTools()` also now merges in plugin-contributed `aphex/agent/tool` parts via `partResolver.agentToolsForCapabilities()`, filtered by the calling API key's resolved capabilities — a plugin's own tool is reachable over MCP without any app-level wiring, matching how `aphex/event/consumer`/`aphex/job/handler` already self-register. A core tool name always wins a collision with a plugin tool. This closes the last open item under Milestone 2's tool-reframe step.
