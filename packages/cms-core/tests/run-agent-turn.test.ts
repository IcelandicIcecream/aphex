/**
 * Unit coverage for `runAgentTurn` (ai/run-agent-turn.ts) — the tool-calling loop that
 * drives one agent turn to completion. Exercised against a fake `AIProviderAdapter`
 * (no network, no real model) so the loop's control flow — streaming, tool execution,
 * capability re-checking, round-trip capping — is verified in isolation from any
 * specific provider's wire format.
 *
 * Lives in tests/ (not src/) so the package build never compiles it into dist.
 * Run: pnpm -F @aphexcms/cms-core test
 */
import { describe, it, expect, vi } from 'vitest';
import { z } from 'zod';
import { runAgentTurn } from '../src/lib/ai/run-agent-turn';
import type {
	AIProviderAdapter,
	AIChatRequest,
	AIStreamEvent
} from '../src/lib/ai/interfaces/ai-provider';
import type { ContentAgentTool } from '../src/lib/mcp/tools';
import type { AgentToolExecutionContext } from '../src/lib/types/agent-tools';
import type { ApiKeyAuth } from '../src/lib/types/auth';

function fakeAuth(capabilities: string[]): ApiKeyAuth {
	return {
		type: 'api_key',
		keyId: 'key-1',
		name: 'test key',
		permissions: [],
		capabilities
	} as unknown as ApiKeyAuth;
}

function fakeProvider(
	scriptedRounds: AIStreamEvent[][]
): AIProviderAdapter & { calls: AIChatRequest[] } {
	const calls: AIChatRequest[] = [];
	let round = 0;
	return {
		name: 'fake',
		calls,
		async *chatStream(request: AIChatRequest) {
			calls.push(request);
			const events = scriptedRounds[round] ?? [{ type: 'done', finishReason: 'stop' }];
			round++;
			for (const event of events) yield event;
		}
	};
}

function fakeTool(overrides: Partial<ContentAgentTool['definition']> = {}): ContentAgentTool {
	return {
		definition: {
			name: 'test_tool',
			description: 'A test tool',
			mutates: false,
			requiredCapabilities: [],
			execution: 'server',
			inputSchema: z.object({ value: z.string().optional() }),
			...overrides
		},
		execute: vi.fn().mockResolvedValue({ success: true, data: { echoed: true } })
	};
}

async function collect<T>(iterable: AsyncIterable<T>): Promise<T[]> {
	const out: T[] = [];
	for await (const item of iterable) out.push(item);
	return out;
}

function toolContext(capabilities: string[] = []): AgentToolExecutionContext {
	return {
		aphexCMS: {} as AgentToolExecutionContext['aphexCMS'],
		context: {
			organizationId: 'org-1',
			auth: fakeAuth(capabilities)
		} as AgentToolExecutionContext['context']
	};
}

describe('runAgentTurn', () => {
	it('streams text and stops when the model finishes without calling a tool', async () => {
		const provider = fakeProvider([
			[
				{ type: 'text', delta: 'Hello ' },
				{ type: 'text', delta: 'world' },
				{ type: 'done', finishReason: 'stop' }
			]
		]);

		const events = await collect(
			runAgentTurn({
				aiProvider: provider,
				model: 'test-model',
				messages: [{ role: 'user', content: 'hi' }],
				tools: [],
				toolContext: toolContext()
			})
		);

		expect(events).toEqual([
			{ type: 'text', delta: 'Hello ' },
			{ type: 'text', delta: 'world' },
			{ type: 'done', finishReason: 'stop' }
		]);
		expect(provider.calls).toHaveLength(1);
	});

	it('executes a requested tool call and feeds the result back for a second round trip', async () => {
		const tool = fakeTool();
		const provider = fakeProvider([
			[
				{
					type: 'toolCall',
					toolCall: { id: 'call-1', name: 'test_tool', arguments: { value: 'x' } }
				},
				{ type: 'done', finishReason: 'tool_calls' }
			],
			[
				{ type: 'text', delta: 'done!' },
				{ type: 'done', finishReason: 'stop' }
			]
		]);

		const events = await collect(
			runAgentTurn({
				aiProvider: provider,
				model: 'test-model',
				messages: [{ role: 'user', content: 'do the thing' }],
				tools: [tool],
				toolContext: toolContext()
			})
		);

		expect(tool.execute).toHaveBeenCalledWith({ value: 'x' }, expect.any(Object));
		expect(events).toEqual([
			{ type: 'toolCall', toolCallId: 'call-1', name: 'test_tool', arguments: { value: 'x' } },
			{
				type: 'toolResult',
				toolCallId: 'call-1',
				name: 'test_tool',
				success: true,
				data: { echoed: true },
				error: undefined
			},
			{ type: 'text', delta: 'done!' },
			{ type: 'done', finishReason: 'stop' }
		]);
		expect(provider.calls).toHaveLength(2);
		// The second round trip's messages include the assistant's tool call and the tool's result.
		const secondCallMessages = provider.calls[1]!.messages;
		expect(secondCallMessages.at(-1)).toMatchObject({ role: 'tool', toolCallId: 'call-1' });
	});

	it('rejects a tool call when the caller lacks the required capability, without executing it', async () => {
		const tool = fakeTool({ requiredCapabilities: ['document.publish'] });
		const provider = fakeProvider([
			[
				{ type: 'toolCall', toolCall: { id: 'call-1', name: 'test_tool', arguments: {} } },
				{ type: 'done', finishReason: 'tool_calls' }
			],
			[{ type: 'done', finishReason: 'stop' }]
		]);

		const events = await collect(
			runAgentTurn({
				aiProvider: provider,
				model: 'test-model',
				messages: [{ role: 'user', content: 'do the thing' }],
				tools: [tool],
				toolContext: toolContext([]) // no capabilities granted
			})
		);

		expect(tool.execute).not.toHaveBeenCalled();
		const toolResult = events.find((e) => e.type === 'toolResult');
		expect(toolResult).toMatchObject({ success: false, error: expect.stringMatching(/Forbidden/) });
	});

	it('rejects an unknown tool name the model hallucinated, without throwing', async () => {
		const provider = fakeProvider([
			[
				{ type: 'toolCall', toolCall: { id: 'call-1', name: 'nonexistent_tool', arguments: {} } },
				{ type: 'done', finishReason: 'tool_calls' }
			],
			[{ type: 'done', finishReason: 'stop' }]
		]);

		const events = await collect(
			runAgentTurn({
				aiProvider: provider,
				model: 'test-model',
				messages: [{ role: 'user', content: 'do the thing' }],
				tools: [],
				toolContext: toolContext()
			})
		);

		const toolResult = events.find((e) => e.type === 'toolResult');
		expect(toolResult).toMatchObject({ success: false, error: 'Unknown tool: nonexistent_tool' });
	});

	it('surfaces a provider error event and stops the turn', async () => {
		const provider = fakeProvider([
			[
				{ type: 'error', message: 'upstream exploded' },
				{ type: 'done', finishReason: 'error' }
			]
		]);

		const events = await collect(
			runAgentTurn({
				aiProvider: provider,
				model: 'test-model',
				messages: [{ role: 'user', content: 'hi' }],
				tools: [],
				toolContext: toolContext()
			})
		);

		expect(events).toEqual([
			{ type: 'error', message: 'upstream exploded' },
			{ type: 'done', finishReason: 'error' }
		]);
		expect(provider.calls).toHaveLength(1);
	});

	it('stops with an error after exceeding maxToolRoundtrips against a tool-happy model', async () => {
		const tool = fakeTool();
		// Every round the model asks to call the tool again — an infinite loop unless capped.
		const provider = fakeProvider(
			Array.from({ length: 10 }, () => [
				{
					type: 'toolCall' as const,
					toolCall: { id: 'call-x', name: 'test_tool', arguments: {} }
				},
				{ type: 'done' as const, finishReason: 'tool_calls' as const }
			])
		);

		const events = await collect(
			runAgentTurn({
				aiProvider: provider,
				model: 'test-model',
				messages: [{ role: 'user', content: 'loop forever' }],
				tools: [tool],
				toolContext: toolContext(),
				maxToolRoundtrips: 2
			})
		);

		expect(events.at(-1)).toEqual({ type: 'done', finishReason: 'error' });
		expect(events.some((e) => e.type === 'error')).toBe(true);
		// 1 initial call + 2 allowed roundtrips = 3 provider invocations before capping.
		expect(provider.calls).toHaveLength(3);
	});
});
