---
'@aphexcms/cms-core': minor
'@aphexcms/ai-anthropic': minor
'@aphexcms/ai-ollama': minor
'@aphexcms/ai-openai': patch
---

The agent chat works on current Claude models, and every AI adapter is on npm.

- **Replay data on the provider port.** An assistant message can carry `providerState`: opaque data the adapter that wrote it needs back, which every other adapter ignores, so a conversation can still move between providers. `runAgentTurn` keeps it on the right message and the chat request accepts it.
- **`refusal` finish reason** (`AIFinishReason`): a model that declined no longer looks like an empty, finished answer. The chat says so.
- **`@aphexcms/ai-anthropic`**, now published:
  - resends the model's reasoning with its tool calls (through `providerState`, checked before use). Current models need it: without it the second round trip of a tool loop failed.
  - sends one round's tool results in one message
  - caches the prompt across round trips
  - defaults `max_tokens` to 64000 (4096 cut reasoning models off)
  - maps `refusal`
  - adds `effort` and `fallbackModels` (retry on another model when the requested one declines) options
- **`@aphexcms/ai-ollama`**, now published.
- **`@aphexcms/ai-openai`**: maps `content_filter` to `refusal`.
