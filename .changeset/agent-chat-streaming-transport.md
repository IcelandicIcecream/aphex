---
'@aphexcms/cms-core': minor
---

Add the streaming transport for the in-admin content agent (Milestone 2 item 5 of `references/content-copilot-phase-1-plan.md`), built on the already-typechecked `AIProviderAdapter` port:

- `types/agent-stream.ts` — `AgentStreamEvent`, the browser-facing wire contract (`AIStreamEvent` plus a `toolResult` event carrying an executed tool's outcome).
- `ai/run-agent-turn.ts` — `runAgentTurn`, a transport-agnostic tool-calling loop: streams the model's response, executes requested tool calls against the caller's resolved tool list (re-checking `requiredCapabilities` at execution time, not just at advertisement), feeds results back as `tool` messages, and repeats until the model stops or a `maxToolRoundtrips` safety cap (default 8) is hit.
- `POST /api/agent/chat` — session-authenticated SSE endpoint (mounted on the shared `apiApp`, so no per-app route re-export is needed, unlike MCP), 404s when no `aiProvider` is configured, streams `AgentStreamEvent`s built on `runAgentTurn`. Stateless per call; conversation persistence is not part of this change.
- `mcp/tools.ts` exports `resolveAgentTools` (extracted from `buildContentTools`) — the one shared, capability-filtered tool-resolution path both MCP and this new endpoint use, so they can never drift on what a caller is allowed to see or invoke.
- `CMSConfig` gains `agentModel?: string`, the default provider-specific model id the chat endpoint uses when a request doesn't override it.

Not yet done: runtime-testing against a live provider API key, and wiring an `aiProvider` into `apps/studio/aphex.config.ts` (a separate app-level decision).
