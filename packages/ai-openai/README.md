# @aphexcms/ai-openai

OpenAI-compatible model backend for the in-admin agent in [AphexCMS](https://github.com/IcelandicIcecream/aphex).

Implements the `AIProviderAdapter` port from `@aphexcms/cms-core`. Points at anything speaking the OpenAI chat-completions API — OpenAI itself, OpenRouter, or a local router like Ollama's compatibility endpoint.

The agent is **off unless a provider is configured**: with no `aiProvider`, the route 404s rather than existing unauthenticated.

## Install

```bash
pnpm add @aphexcms/ai-openai
```

## Quick start

```ts title="aphex.config.ts"
import { createOpenAIAdapter } from '@aphexcms/ai-openai';

export default createCMSConfig({
	schemaTypes,
	database: db,
	aiProvider: createOpenAIAdapter({ apiKey: env.OPENAI_API_KEY }),
	agentModel: 'gpt-5.4-mini'
});
```

`agentModel` is required whenever `aiProvider` is set — there is no default model, because the right one depends on which endpoint you pointed at.

### OpenRouter

```ts
import { createOpenRouterAdapter } from '@aphexcms/ai-openai';

aiProvider: createOpenRouterAdapter({ apiKey: env.OPENROUTER_API_KEY });
```

### A local endpoint

Any OpenAI-compatible base URL works. `apiKey` can be a placeholder for a local router that doesn't check it:

```ts
createOpenAIAdapter({
	baseURL: 'http://127.0.0.1:10531/v1',
	apiKey: 'local'
});
```

## Customising the prompt

`agentSystemPrompt` in `createCMSConfig()` replaces the built-in system prompt outright. The default one already describes the schema system and the tools available, so replace it only when you want different behaviour, not to append to it.

## License

MIT
