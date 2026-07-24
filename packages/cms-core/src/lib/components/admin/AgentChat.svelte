<script lang="ts">
	import { Button } from '@aphexcms/ui/shadcn/button';
	import { Textarea } from '@aphexcms/ui/shadcn/textarea';
	import {
		MessageScroller,
		MessageScrollerButton,
		MessageScrollerContent,
		MessageScrollerItem,
		MessageScrollerProvider,
		MessageScrollerViewport
	} from '@aphexcms/ui/shadcn/message-scroller';
	import {
		Message,
		MessageContent,
		MessageFooter,
		MessageHeader
	} from '@aphexcms/ui/shadcn/message';
	import { Bubble, BubbleContent } from '@aphexcms/ui/shadcn/bubble';
	import { Marker, MarkerContent, MarkerIcon } from '@aphexcms/ui/shadcn/marker';
	import {
		Bot,
		Check,
		ChevronDown,
		CircleAlert,
		Copy,
		Database,
		LoaderCircle,
		RefreshCw,
		Send,
		Sparkles,
		Square,
		Trash2
	} from '@lucide/svelte';

	let { embedded = false }: { embedded?: boolean } = $props();

	type HistoryMessage = {
		role: 'system' | 'user' | 'assistant' | 'tool';
		content: string;
		toolCalls?: Array<{ id: string; name: string; arguments: Record<string, unknown> }>;
		toolCallId?: string;
	};

	type ToolCall = {
		id: string;
		name: string;
		arguments: Record<string, unknown>;
		status: 'running' | 'complete' | 'error';
		result?: unknown;
		error?: string;
	};

	type Turn = {
		id: string;
		role: 'user' | 'assistant';
		text: string;
		status: 'complete' | 'streaming' | 'error' | 'stopped';
		toolCalls: ToolCall[];
		error?: string;
	};

	type StreamEvent =
		| { type: 'text'; delta: string }
		| { type: 'toolCall'; toolCallId: string; name: string; arguments: Record<string, unknown> }
		| {
				type: 'toolResult';
				toolCallId: string;
				name: string;
				success: boolean;
				data?: unknown;
				error?: string;
		  }
		| { type: 'error'; message: string }
		| { type: 'done'; finishReason: string }
		| { type: 'usage'; promptTokens: number; completionTokens: number };

	const suggestions = [
		'List the collections in this CMS',
		'Summarize the latest published documents',
		'Describe the schema for my pages'
	];

	let input = $state('');
	let turns = $state<Turn[]>([]);
	let history = $state<HistoryMessage[]>([]);
	let streaming = $state(false);
	let controller: AbortController | null = null;

	function parseFrame(frame: string): StreamEvent | null {
		const payload = frame
			.split(/\r?\n/)
			.filter((line) => line.startsWith('data:'))
			.map((line) => line.slice(5).trimStart())
			.join('\n');
		if (!payload) return null;
		return JSON.parse(payload) as StreamEvent;
	}

	async function send(message = input.trim()) {
		if (!message || streaming) return;

		input = '';
		const userTurn: Turn = {
			id: crypto.randomUUID(),
			role: 'user',
			text: message,
			status: 'complete',
			toolCalls: []
		};
		const assistantTurn: Turn = {
			id: crypto.randomUUID(),
			role: 'assistant',
			text: '',
			status: 'streaming',
			toolCalls: []
		};
		turns.push(userTurn, assistantTurn);
		history.push({ role: 'user', content: message });
		const assistantIndex = turns.length - 1;
		streaming = true;
		controller = new AbortController();

		try {
			const response = await fetch('/api/agent/chat', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ messages: history }),
				signal: controller.signal
			});

			if (!response.ok || !response.body) {
				const body = await response.json().catch(() => null);
				throw new Error(body?.error ?? `Request failed (${response.status})`);
			}

			const reader = response.body.getReader();
			const decoder = new TextDecoder();
			let buffer = '';

			for (;;) {
				const { done, value } = await reader.read();
				buffer += decoder.decode(value, { stream: !done });
				const frames = buffer.split(/\r?\n\r?\n/);
				buffer = frames.pop() ?? '';
				if (done && buffer.trim()) frames.push(buffer);

				for (const frame of frames) {
					const event = parseFrame(frame);
					if (!event) continue;
					handleStreamEvent(assistantIndex, event);
				}
				if (done) break;
			}

			const turn = turns[assistantIndex];
			if (turn?.status === 'streaming') turn.status = 'complete';
		} catch (error) {
			const turn = turns[assistantIndex];
			if (!turn) return;
			if (error instanceof DOMException && error.name === 'AbortError') {
				turn.status = 'stopped';
			} else {
				turn.status = 'error';
				turn.error = error instanceof Error ? error.message : String(error);
			}
		} finally {
			streaming = false;
			controller = null;
			const completed = turns[assistantIndex];
			if (completed?.text) history.push({ role: 'assistant', content: completed.text });
		}
	}

	function handleStreamEvent(assistantIndex: number, event: StreamEvent) {
		const turn = turns[assistantIndex];
		if (!turn) return;
		if (event.type === 'text') {
			turn.text += event.delta;
		} else if (event.type === 'toolCall') {
			turn.toolCalls.push({
				id: event.toolCallId,
				name: event.name,
				arguments: event.arguments,
				status: 'running'
			});
		} else if (event.type === 'toolResult') {
			const tool = turn.toolCalls.find((call) => call.id === event.toolCallId);
			if (tool) {
				tool.status = event.success ? 'complete' : 'error';
				tool.result = event.data;
				tool.error = event.error;
			}
		} else if (event.type === 'error') {
			turn.status = 'error';
			turn.error = event.message;
		} else if (event.type === 'done' && turn.status === 'streaming') {
			turn.status = event.finishReason === 'error' ? 'error' : 'complete';
		}
	}

	function stop() {
		controller?.abort();
	}

	function clearConversation() {
		if (streaming) return;
		turns = [];
		history = [];
		input = '';
	}

	function retry(turnIndex: number) {
		if (streaming || turnIndex < 1) return;
		const prompt = turns[turnIndex - 1];
		if (!prompt || prompt.role !== 'user') return;
		turns = turns.slice(0, turnIndex - 1);
		history = history.slice(0, -2);
		send(prompt.text);
	}

	async function copyText(text: string) {
		await navigator.clipboard.writeText(text);
	}

	function formatToolName(name: string) {
		return name.replace(/^content_/, '').replaceAll('_', ' ');
	}

	function streamingLabel(turn: Turn) {
		if (turn.toolCalls.some((tool) => tool.status === 'running')) return 'Using tools...';
		if (turn.text) return 'Generating response...';
		return 'Thinking...';
	}

	function handleComposerKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
			event.preventDefault();
			send();
		}
	}
</script>

<div class="bg-muted/20 flex h-full min-h-0 flex-col">
	<header
		class="bg-background/90 flex h-14 shrink-0 items-center justify-between border-b px-4 backdrop-blur sm:px-6 {embedded
			? 'pr-12 sm:pr-12'
			: ''}"
	>
		<div class="flex min-w-0 items-center gap-3">
			<div
				class="bg-primary/10 text-primary flex size-8 shrink-0 items-center justify-center rounded-lg"
			>
				<Sparkles class="size-4" />
			</div>
			<div class="min-w-0">
				<h1 class="truncate text-sm font-semibold">Aphex Assistant</h1>
				<p class="text-muted-foreground truncate text-xs">CMS-aware answers and content tools</p>
			</div>
		</div>
		{#if turns.length > 0}
			<Button
				variant="ghost"
				size="icon-sm"
				onclick={clearConversation}
				disabled={streaming}
				aria-label="Clear conversation"
			>
				<Trash2 />
			</Button>
		{/if}
	</header>

	<MessageScrollerProvider
		autoScroll
		defaultScrollPosition="last-anchor"
		scrollPreviousItemPeek={48}
	>
		<MessageScroller class="min-h-0">
			<MessageScrollerViewport>
				<MessageScrollerContent
					class="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6"
					aria-busy={streaming}
				>
					{#if turns.length === 0}
						<div class="m-auto flex max-w-xl flex-col items-center px-4 py-12 text-center">
							<div
								class="border-primary/20 bg-primary/10 text-primary mb-5 flex size-14 items-center justify-center rounded-2xl border shadow-sm"
							>
								<Bot class="size-7" />
							</div>
							<h2 class="text-xl font-semibold tracking-tight">What are we working on?</h2>
							<p class="text-muted-foreground mt-2 max-w-md text-sm leading-relaxed">
								Ask about your schemas, inspect documents, or use the CMS tools available to your
								role.
							</p>
							<div class="mt-6 grid w-full gap-2 sm:grid-cols-3">
								{#each suggestions as suggestion}
									<button
										type="button"
										class="bg-background hover:bg-accent cursor-pointer rounded-xl border p-3 text-left text-xs leading-relaxed shadow-xs transition-colors"
										onclick={() => send(suggestion)}
									>
										{suggestion}
									</button>
								{/each}
							</div>
						</div>
					{:else}
						{#each turns as turn, index (turn.id)}
							<MessageScrollerItem messageId={turn.id} scrollAnchor={turn.role === 'user'}>
								<Message align={turn.role === 'user' ? 'end' : 'start'}>
									<MessageContent>
										<MessageHeader>{turn.role === 'user' ? 'You' : 'Aphex Assistant'}</MessageHeader
										>
										{#if turn.role === 'user'}
											<Bubble variant="default" align="end"
												><BubbleContent>{turn.text}</BubbleContent></Bubble
											>
										{:else}
											{#each turn.toolCalls as tool (tool.id)}
												<details class="group/tool mb-2 w-full">
													<summary class="cursor-pointer list-none">
														<Marker
															variant="border"
															role={tool.status === 'running' ? 'status' : undefined}
															class="hover:text-foreground transition-colors"
														>
															<MarkerIcon>
																{#if tool.status === 'running'}<LoaderCircle
																		class="animate-spin"
																	/>{:else if tool.status === 'error'}<CircleAlert
																		class="text-destructive"
																	/>{:else}<Check />{/if}
															</MarkerIcon>
															<MarkerContent class={tool.status === 'running' ? 'shimmer' : ''}
																>{tool.status === 'running' ? 'Using' : 'Used'}
																{formatToolName(tool.name)}</MarkerContent
															>
															<ChevronDown
																class="ml-auto size-3.5 transition-transform group-open/tool:rotate-180"
															/>
														</Marker>
													</summary>
													<div
														class="bg-muted/50 mt-2 max-h-64 overflow-auto rounded-lg border p-3 font-mono text-[11px] leading-relaxed"
													>
														<pre class="whitespace-pre-wrap">{JSON.stringify(
																tool.arguments,
																null,
																2
															)}</pre>
														{#if tool.error}<p class="text-destructive mt-2">
																{tool.error}
															</p>{:else if tool.result !== undefined}<pre
																class="text-muted-foreground mt-2 border-t pt-2 whitespace-pre-wrap">{JSON.stringify(
																	tool.result,
																	null,
																	2
																)}</pre>{/if}
													</div>
												</details>
											{/each}

											{#if turn.text}
												<Bubble variant="ghost"
													><BubbleContent class="px-0">{turn.text}</BubbleContent></Bubble
												>
											{/if}
											{#if turn.status === 'streaming'}
												<Marker
													role="status"
													class="bg-muted/60 mt-1 w-fit justify-start rounded-full px-3 py-1.5"
												>
													<MarkerIcon><LoaderCircle class="animate-spin" /></MarkerIcon>
													<MarkerContent class="shimmer font-medium"
														>{streamingLabel(turn)}</MarkerContent
													>
												</Marker>
											{/if}

											{#if turn.error}
												<Marker variant="border" class="text-destructive border-destructive/30"
													><MarkerIcon><CircleAlert /></MarkerIcon><MarkerContent
														>{turn.error}</MarkerContent
													></Marker
												>
											{/if}
											<MessageFooter>
												{#if turn.status === 'stopped'}<span>Stopped</span>{/if}
												{#if turn.text && turn.status !== 'streaming'}
													<Button
														variant="ghost"
														size="icon-sm"
														class="size-7"
														onclick={() => copyText(turn.text)}
														aria-label="Copy response"><Copy /></Button
													>
													<Button
														variant="ghost"
														size="icon-sm"
														class="size-7"
														onclick={() => retry(index)}
														disabled={streaming}
														aria-label="Retry response"><RefreshCw /></Button
													>
												{/if}
											</MessageFooter>
										{/if}
									</MessageContent>
								</Message>
							</MessageScrollerItem>
						{/each}
					{/if}
				</MessageScrollerContent>
			</MessageScrollerViewport>
			<MessageScrollerButton />
		</MessageScroller>
	</MessageScrollerProvider>

	<div
		class="from-background via-background bg-linear-to-t to-transparent px-3 pt-2 pb-3 sm:px-6 sm:pb-5"
	>
		<form
			class="bg-background focus-within:border-ring focus-within:ring-ring/20 mx-auto max-w-3xl rounded-2xl border p-2 shadow-lg transition-shadow focus-within:ring-3"
			onsubmit={(event) => {
				event.preventDefault();
				send();
			}}
		>
			<Textarea
				bind:value={input}
				onkeydown={handleComposerKeydown}
				rows={1}
				placeholder="Ask about your content..."
				class="max-h-40 min-h-11 resize-none border-0 bg-transparent px-2 shadow-none focus-visible:ring-0"
				disabled={streaming}
			/>
			<div class="flex items-center justify-between px-1 pt-1">
				<div class="text-muted-foreground flex items-center gap-1.5 text-[11px]">
					<Database class="size-3" /><span>Uses tools allowed by your role</span>
				</div>
				{#if streaming}
					<Button
						type="button"
						size="icon-sm"
						variant="outline"
						onclick={stop}
						aria-label="Stop response"><Square class="fill-current" /></Button
					>
				{:else}
					<Button type="submit" size="icon-sm" disabled={!input.trim()} aria-label="Send message"
						><Send /></Button
					>
				{/if}
			</div>
		</form>
		<p class="text-muted-foreground mx-auto mt-2 max-w-3xl text-center text-[10px]">
			AI can make mistakes. Review content changes before publishing.
		</p>
	</div>
</div>
