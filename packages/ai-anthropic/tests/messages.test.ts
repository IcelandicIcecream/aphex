import { describe, expect, it } from 'vitest';
import type { AIMessage } from '@aphexcms/cms-core/server';
import { mapStopReason, replayableContent, toAnthropicMessages } from '../src/index';

/**
 * The adapter's half of the provider port: how a neutral conversation becomes an
 * Anthropic request. The part that matters most is replay. Current models reason
 * before calling tools, and that reasoning has to go back unchanged with the calls,
 * so it travels in `providerState`. That value comes back from the browser, so it's
 * only used when it is this adapter's and agrees with the message.
 */

const call = { id: 'toolu_1', name: 'get_page', arguments: { slug: 'home' } };
const storedContent = [
	{ type: 'thinking', thinking: '', signature: 'sig' },
	{ type: 'text', text: 'Looking.' },
	{ type: 'tool_use', id: 'toolu_1', name: 'get_page', input: { slug: 'home' } }
];
const assistant = (providerState?: unknown): AIMessage => ({
	role: 'assistant',
	content: 'Looking.',
	toolCalls: [call],
	providerState
});

describe('replayableContent', () => {
	it("resends this adapter's blocks unchanged, reasoning first", () => {
		expect(replayableContent(assistant({ provider: 'anthropic', content: storedContent }))).toEqual(
			storedContent
		);
	});

	it("ignores another adapter's state, or none", () => {
		expect(replayableContent(assistant())).toBeUndefined();
		expect(
			replayableContent(assistant({ provider: 'openai', content: storedContent }))
		).toBeUndefined();
	});

	it('refuses state that disagrees with the message or carries unknown blocks', () => {
		const otherCall = storedContent.map((b) =>
			b.type === 'tool_use' ? { ...b, id: 'toolu_9' } : b
		);
		expect(
			replayableContent(assistant({ provider: 'anthropic', content: otherCall }))
		).toBeUndefined();
		const injected = [...storedContent, { type: 'web_search_tool_result', content: [] }];
		expect(
			replayableContent(assistant({ provider: 'anthropic', content: injected }))
		).toBeUndefined();
		expect(replayableContent(assistant({ provider: 'anthropic', content: 'x' }))).toBeUndefined();
	});
});

describe('toAnthropicMessages', () => {
	it('lifts system messages out and sends one round of tool results as one user message', () => {
		const { system, messages } = toAnthropicMessages([
			{ role: 'system', content: 'Be brief.' },
			{ role: 'user', content: 'Check two pages' },
			{
				role: 'assistant',
				content: '',
				toolCalls: [call, { ...call, id: 'toolu_2', arguments: { slug: 'about' } }]
			},
			{ role: 'tool', toolCallId: 'toolu_1', content: '{"ok":1}' },
			{ role: 'tool', toolCallId: 'toolu_2', content: '{"ok":2}' },
			{ role: 'assistant', content: 'Both fine.' }
		]);
		expect(system).toBe('Be brief.');
		expect(messages.map((m) => m.role)).toEqual(['user', 'assistant', 'user', 'assistant']);
		expect(messages[2]!.content).toEqual([
			{ type: 'tool_result', tool_use_id: 'toolu_1', content: '{"ok":1}' },
			{ type: 'tool_result', tool_use_id: 'toolu_2', content: '{"ok":2}' }
		]);
	});

	it('uses stored blocks when valid, and rebuilds from the neutral fields otherwise', () => {
		const replayed = toAnthropicMessages([
			{ role: 'user', content: 'go' },
			assistant({ provider: 'anthropic', content: storedContent })
		]);
		expect(replayed.messages[1]!.content).toEqual(storedContent);

		const rebuilt = toAnthropicMessages([{ role: 'user', content: 'go' }, assistant()]);
		expect(rebuilt.messages[1]!.content).toEqual([
			{ type: 'text', text: 'Looking.' },
			{ type: 'tool_use', id: 'toolu_1', name: 'get_page', input: { slug: 'home' } }
		]);
	});
});

describe('mapStopReason', () => {
	it('names a refusal and a cut-off, so neither looks like a finished answer', () => {
		expect(mapStopReason('refusal')).toBe('refusal');
		expect(mapStopReason('max_tokens')).toBe('length');
		expect(mapStopReason('model_context_window_exceeded')).toBe('length');
		expect(mapStopReason('tool_use')).toBe('tool_calls');
		expect(mapStopReason('end_turn')).toBe('stop');
	});
});
