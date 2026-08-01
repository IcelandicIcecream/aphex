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
	import { Message, MessageContent, MessageFooter } from '@aphexcms/ui/shadcn/message';
	import { Bubble, BubbleContent } from '@aphexcms/ui/shadcn/bubble';
	import { Marker, MarkerContent, MarkerIcon } from '@aphexcms/ui/shadcn/marker';
	import {
		Bot,
		Check,
		ChevronDown,
		CircleAlert,
		Copy,
		Database,
		FileCode,
		FilePlus,
		FileText,
		Image,
		ImagePlus,
		Info,
		Layers,
		LoaderCircle,
		Pencil,
		RefreshCw,
		Search,
		Send,
		Settings,
		ShieldCheck,
		Sparkles,
		Square,
		Trash2,
		UploadCloud,
		Wrench
	} from '@lucide/svelte';
	import { page } from '$app/state';
	import type { Component } from 'svelte';
	import { marked } from 'marked';
	import DOMPurify from 'dompurify';
	import {
		agentChatState,
		type HistoryMessage,
		type Turn,
		type ToolCall
	} from '../../agent-chat-state.svelte';
	import { documentWorkspaceRegistry } from '../../document-workspace-registry.svelte';
	import type { DocumentWorkspace } from '../../types/document-workspace';
	import type { AgentStreamEvent } from '../../types/agent-stream';
	import { streamAgentChat, recordWorkspaceOperation } from '../../api/agent-chat';
	import { resolvePreviewTitle } from '../../utils/preview';
	import { notifyCollectionChanged } from '../../document-refresh.svelte';

	/** A suggestion can be a bare string, or `{ text, icon }` for a leading icon — the plain
	 * string form stays the common case so existing callers don't need to change anything. */
	type Suggestion = string | { text: string; icon?: Component };

	const DEFAULT_SUGGESTIONS: Suggestion[] = [
		'List the collections in this CMS',
		'Summarize the latest published documents',
		'Describe the schema for my pages'
	];

	let {
		embedded = false,
		title = 'Aphex Assistant',
		subtitle = 'CMS-aware answers and content tools',
		suggestions = DEFAULT_SUGGESTIONS
	}: {
		embedded?: boolean;
		title?: string;
		subtitle?: string;
		suggestions?: Suggestion[];
	} = $props();

	/** Result shape a workspace-tool handler (below) hands back — the same idea as
	 * `AgentToolResult`, kept local so this file doesn't need a server-only type import. */
	type WorkspaceToolHandlerResult = { success: boolean; data?: unknown; error?: string };

	type WorkspaceToolHandler = (
		args: Record<string, unknown>,
		ws: DocumentWorkspace
	) => Promise<WorkspaceToolHandlerResult>;

	const patchFieldsHandler: WorkspaceToolHandler = async (args, ws) => {
		const fields = (args.fields as Record<string, unknown>) ?? {};
		ws.apply({ type: 'patchFields', fields });
		const validation = await ws.validate();
		return { success: true, data: { applied: Object.keys(fields), validation } };
	};

	const saveDraftHandler: WorkspaceToolHandler = async (_args, ws) => {
		const snapshot = ws.getSnapshot();
		const result = await ws.flushSave(snapshot.revision ?? undefined);
		if (!result.success) {
			return {
				success: false,
				error: result.conflict
					? 'Revision conflict — reload before continuing.'
					: (result.error ?? 'Save failed')
			};
		}
		return { success: true, data: { revision: result.revision } };
	};

	/** Resolves `content_patch_fields`/`content_save_draft` against a live `DocumentWorkspace` —
	 * see types/document-workspace.ts and ai/content-workspace-tools.ts for why these two tools
	 * can't be executed server-side at all. */
	const WORKSPACE_TOOL_HANDLERS: Record<string, WorkspaceToolHandler> = {
		content_patch_fields: patchFieldsHandler,
		content_save_draft: saveDraftHandler
	};

	/** Only a flush's outcome is worth an audit row — `content_patch_fields` just buffers an
	 * in-memory change with nothing durable to attribute yet (see the plan doc's atomicity
	 * design: one save = one operation, not one per patch). */
	const WORKSPACE_TOOLS_RECORDED = new Set(['content_save_draft']);

	/** `currentDocKey` is always built as `${docType}:${docId}` with both non-empty (see
	 * below), but that invariant isn't visible to `.split(':')`'s return type — parse it back
	 * out explicitly instead of asserting the shape with a cast. */
	function parseDocKey(key: string): { collection: string; id: string } | null {
		const separator = key.indexOf(':');
		if (separator === -1) return null;
		return { collection: key.slice(0, separator), id: key.slice(separator + 1) };
	}

	let input = $state('');
	let streaming = $state(false);
	let controller: AbortController | null = null;

	// The admin desk is a single `/admin` route driven by `docType`/`docId` query params
	// (see AdminApp.svelte), not per-document URLs — this is how the assistant knows what's
	// open without any data being pushed to it. Only a breadcrumb, never the document's
	// content itself: the model calls `get_document` (already a registered tool) when it
	// actually needs field values, so this stays cheap on every request and never goes stale.
	const currentDocKey = $derived.by(() => {
		const docType = page.url.searchParams.get('docType');
		const docId = page.url.searchParams.get('docId');
		return docType && docId ? `${docType}:${docId}` : null;
	});

	// A URL param says *which* document is open; it's not a handle to mutate. Cross-check
	// against document-workspace-registry.svelte.ts — the live editor tab's own registration —
	// so a stale/mismatched registration (e.g. from a just-closed tab) never gets bridged into.
	// Only when both agree does this chat gain the content_patch_fields/content_save_draft
	// tools; everywhere else (no document open, or a URL that doesn't match what's registered)
	// it behaves exactly as a general chat always has.
	const matchedWorkspace = $derived.by(() => {
		if (!currentDocKey) return null;
		const [docType, docId] = currentDocKey.split(':');
		const registered = documentWorkspaceRegistry.current;
		if (registered && registered.documentId === docId && registered.collection === docType) {
			return registered.workspace;
		}
		return null;
	});

	/** No schema context is threaded down to this global panel (schema context is scoped to
	 * DocumentEditor.svelte's own subtree) — resolving via conventional field names only
	 * (`resolvePreviewTitle`'s no-schema fallback path) rather than a schema's own
	 * `preview.prepare`/`select` config. Good enough for a breadcrumb chip; not worth wiring
	 * schema context app-wide just for this. */
	function capitalize(s: string): string {
		return s.length > 0 ? s.charAt(0).toUpperCase() + s.slice(1) : s;
	}

	// Cursor-style persistent context chip: shows what's currently attached, live, distinct
	// from the conversation transcript. Three states — no doc open (null, nothing rendered),
	// doc open but not bridged (editing: false, read-only awareness only), doc open and
	// bridged (editing: true, content_patch_fields/content_save_draft are live).
	const documentLabel = $derived.by(() => {
		if (!currentDocKey) return null;
		const parsed = parseDocKey(currentDocKey);
		if (!parsed) return null;
		const typeLabel = capitalize(parsed.collection);
		const workspace = matchedWorkspace;
		if (!workspace) return { editing: false, text: typeLabel };
		const title = resolvePreviewTitle(workspace.getSnapshot().data, null, typeLabel);
		return { editing: true, text: `${typeLabel} — ${title}` };
	});

	// Soft nudge, not a hard limit — this endpoint resends the full conversation every call,
	// so `lastPromptTokens` only grows. A conservative threshold since the actual context
	// window varies by provider/model and isn't known client-side.
	const LONG_CONVERSATION_TOKENS = 50_000;
	const isGettingLong = $derived(agentChatState.lastPromptTokens > LONG_CONVERSATION_TOKENS);

	async function send(message = input.trim()) {
		if (!message || streaming) return;

		input = '';
		if (currentDocKey && currentDocKey !== agentChatState.contextSentFor) {
			const [docType, docId] = currentDocKey.split(':');
			agentChatState.history.push({
				role: 'system',
				content: matchedWorkspace
					? `The user is currently viewing document ${docId} in collection ${docType} in the editor. Use content_patch_fields/content_save_draft for edits to this document — do not use update_document for it, since only the workspace tools keep the open editor in sync.`
					: `The user is currently viewing document ${docId} in collection ${docType}.`
			});
			agentChatState.contextSentFor = currentDocKey;
		}
		const userTurn: Turn = {
			id: crypto.randomUUID(),
			role: 'user',
			text: message,
			status: 'complete',
			toolCalls: [],
			historyIndexBeforeTurn: agentChatState.history.length
		};
		const assistantTurn: Turn = {
			id: crypto.randomUUID(),
			role: 'assistant',
			text: '',
			status: 'streaming',
			toolCalls: []
		};
		agentChatState.turns.push(userTurn, assistantTurn);
		agentChatState.history.push({ role: 'user', content: message });
		const assistantIndex = agentChatState.turns.length - 1;
		streaming = true;
		controller = new AbortController();

		// Captured once, at the start of this turn — even if the registered document changes
		// mid-turn (navigation), this turn keeps bridging into the document it started with,
		// not whatever happens to be open when a later leg resumes.
		const workspace = matchedWorkspace;
		const documentContext = workspace && currentDocKey ? parseDocKey(currentDocKey) : null;

		let changeSetId: string | null = null;
		let cumulativeUsage = { promptTokens: 0, completionTokens: 0 };
		// Set by content_patch_fields, cleared by content_save_draft — if a turn ends with
		// buffered-but-unflushed patches (the model forgot to call content_save_draft), the
		// safety net below flushes them once rather than leaving them stranded unsaved.
		let dirtySinceFlush = false;

		if (workspace) workspace.beginBatch('agent');

		try {
			let messages: HistoryMessage[] = agentChatState.history;
			let turnDone = false;

			while (!turnDone) {
				let pendingWorkspaceCalls:
					| { toolCallId: string; name: string; arguments: Record<string, unknown> }[]
					| null = null;

				for await (const event of streamAgentChat(
					{
						messages,
						documentContext: documentContext ?? undefined,
						changeSetId: changeSetId ?? undefined,
						priorUsage: changeSetId ? cumulativeUsage : undefined
					},
					controller.signal
				)) {
					if (event.type === 'usage') {
						cumulativeUsage = {
							promptTokens: event.promptTokens,
							completionTokens: event.completionTokens
						};
					}
					if (event.type === 'done') {
						changeSetId = event.changeSetId ?? changeSetId;
						messages = event.messages;
						agentChatState.history = messages;
						if (event.finishReason === 'awaiting_workspace_tool') {
							pendingWorkspaceCalls = event.pendingWorkspaceCalls ?? [];
						} else {
							turnDone = true;
							const turn = agentChatState.turns[assistantIndex];
							if (turn?.status === 'streaming') {
								turn.status = event.finishReason === 'error' ? 'error' : 'complete';
							}
						}
					} else {
						handleStreamEvent(assistantIndex, event);
					}
				}

				if (pendingWorkspaceCalls && pendingWorkspaceCalls.length > 0) {
					for (const call of pendingWorkspaceCalls) {
						const handler = workspace ? WORKSPACE_TOOL_HANDLERS[call.name] : undefined;
						const result: WorkspaceToolHandlerResult = handler
							? await handler(call.arguments, workspace!)
							: {
									success: false,
									error: workspace
										? `Unknown workspace tool: ${call.name}`
										: 'No document is open to apply this change to.'
								};

						if (call.name === 'content_patch_fields') dirtySinceFlush = result.success;
						if (call.name === 'content_save_draft') {
							dirtySinceFlush = false;
							// Resolved entirely client-side, so handleStreamEvent never sees it —
							// invalidate the list here too, same as the server-mode tools above.
							if (result.success && documentContext) {
								notifyCollectionChanged(documentContext.collection);
							}
						}

						resolveWorkspaceToolCall(assistantIndex, call.toolCallId, result);
						messages = [
							...messages,
							{
								role: 'tool',
								toolCallId: call.toolCallId,
								content: JSON.stringify(
									result.success ? (result.data ?? null) : { error: result.error }
								)
							}
						];

						if (changeSetId && documentContext && WORKSPACE_TOOLS_RECORDED.has(call.name)) {
							await safeRecordWorkspaceOperation({
								changeSetId,
								toolName: call.name,
								collection: documentContext.collection,
								id: documentContext.id,
								success: result.success,
								error: result.error,
								arguments: call.arguments,
								data: result.data
							});
						}
					}
					agentChatState.history = messages;
				} else if (!turnDone) {
					// Defensive: the stream ended (e.g. aborted) without a 'done' event at all.
					turnDone = true;
				}
			}

			if (dirtySinceFlush && workspace) {
				const result = await saveDraftHandler({}, workspace);
				if (result.success && documentContext) notifyCollectionChanged(documentContext.collection);
				if (changeSetId && documentContext) {
					await safeRecordWorkspaceOperation({
						changeSetId,
						toolName: 'content_save_draft',
						collection: documentContext.collection,
						id: documentContext.id,
						success: result.success,
						error: result.error,
						arguments: {},
						data: result.data
					});
				}
			}
		} catch (error) {
			const turn = agentChatState.turns[assistantIndex];
			if (!turn) return;
			if (error instanceof DOMException && error.name === 'AbortError') {
				turn.status = 'stopped';
			} else {
				turn.status = 'error';
				turn.error = error instanceof Error ? error.message : String(error);
			}
		} finally {
			if (workspace) workspace.endBatch();
			streaming = false;
			controller = null;
		}
	}

	// Server-mode tools that create/update/publish a document by `collection` — a collection
	// list open elsewhere in the session (AdminApp) has no way to know about these on its own,
	// same class of staleness as the single-document editor case. All three take `collection`
	// as an argument, so the tool call's own arguments are enough to know what to invalidate —
	// no need to inspect the (differently-shaped) result data of each.
	const LIST_INVALIDATING_TOOLS = new Set([
		'create_document',
		'update_document',
		'publish_document'
	]);

	function handleStreamEvent(assistantIndex: number, event: AgentStreamEvent) {
		const turn = agentChatState.turns[assistantIndex];
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
				if (event.success && LIST_INVALIDATING_TOOLS.has(tool.name)) {
					const collection = tool.arguments?.collection;
					if (typeof collection === 'string') notifyCollectionChanged(collection);
				}
			}
		} else if (event.type === 'error') {
			turn.status = 'error';
			turn.error = event.message;
		} else if (event.type === 'usage') {
			// The endpoint resends the full conversation on every call, so the latest
			// promptTokens is effectively "how big the conversation currently is" — used to
			// warn before it gets unwieldy. Overwrite, don't sum: a turn can report usage
			// multiple times across tool-calling round trips, and each one already reflects
			// the whole conversation up to that point, not an incremental slice.
			agentChatState.lastPromptTokens = event.promptTokens;
		}
		// 'done' is handled by send()'s own loop, not here — unlike every other event, it has
		// to *decide* something (pause-and-resume vs. actually finish) that only the loop
		// driving the fetch calls can act on; this function only ever does passive display
		// updates for events streamed within one leg.
	}

	/** Reflects a workspace tool's locally-resolved result onto its (already-rendered, still
	 * "running") entry in the turn's tool-call list — the SSE stream already emitted the
	 * `toolCall` event for it (before the server paused), just not a `toolResult`, since only
	 * the browser can produce that result. Same shape update as the `toolResult` branch above. */
	function resolveWorkspaceToolCall(
		assistantIndex: number,
		toolCallId: string,
		result: WorkspaceToolHandlerResult
	) {
		const turn = agentChatState.turns[assistantIndex];
		const tool = turn?.toolCalls.find((call) => call.id === toolCallId);
		if (tool) {
			tool.status = result.success ? 'complete' : 'error';
			tool.result = result.data;
			tool.error = result.error;
		}
	}

	/** Best-effort audit record for a workspace tool's result — `recordWorkspaceOperation`
	 * (api/agent-chat.ts) throws on any HTTP/network failure (it goes through `apiClient`); this
	 * call must never break the chat turn just because the audit write failed. */
	async function safeRecordWorkspaceOperation(
		body: Parameters<typeof recordWorkspaceOperation>[0]
	) {
		try {
			await recordWorkspaceOperation(body);
		} catch {
			// best-effort — see doc comment above
		}
	}

	function stop() {
		controller?.abort();
	}

	function clearConversation() {
		if (streaming) return;
		// This wipes the persisted copy too (agent-chat-state.svelte.ts mirrors every change to
		// localStorage), so confirm — unlike before that persistence existed, this is no longer
		// trivially recoverable by just reopening the panel.
		if (!confirm('Clear this conversation? This cannot be undone.')) return;
		agentChatState.turns = [];
		agentChatState.history = [];
		agentChatState.contextSentFor = null;
		agentChatState.lastPromptTokens = 0;
		input = '';
	}

	function retry(turnIndex: number) {
		if (streaming || turnIndex < 1) return;
		const prompt = agentChatState.turns[turnIndex - 1];
		if (!prompt || prompt.role !== 'user') return;
		agentChatState.turns = agentChatState.turns.slice(0, turnIndex - 1);
		// A turn's server-reported `messages` can add more than the naive "2 entries" once tool
		// calls are involved, so roll back to the exact length recorded before this turn rather
		// than assuming an offset.
		agentChatState.history = agentChatState.history.slice(
			0,
			prompt.historyIndexBeforeTurn ?? agentChatState.history.length
		);
		send(prompt.text);
	}

	async function copyText(text: string) {
		await navigator.clipboard.writeText(text);
	}

	marked.setOptions({ breaks: true, gfm: true });

	// Assistant text is model-generated markdown, not trusted HTML — parse then sanitize before
	// ever using `{@html}`. `marked.parse` is sync here (no async extensions registered).
	function renderMarkdown(text: string): string {
		return DOMPurify.sanitize(marked.parse(text, { async: false }));
	}

	function formatToolName(name: string) {
		return name.replaceAll('_', ' ');
	}

	// Past-tense phrase per tool, for both the one-line turn summary ("Listed collections,
	// updated a document") and each entry's title in the expanded detail.
	const TOOL_VERBS: Record<string, string> = {
		describe_cms: 'inspected the CMS',
		list_collections: 'listed collections',
		get_schema: 'read a schema',
		validate_schema: 'validated a schema',
		validate_document: 'validated a document',
		query_documents: 'searched documents',
		get_document: 'read a document',
		create_document: 'created a document',
		update_document: 'updated a document',
		publish_document: 'published a document',
		get_singleton: 'read settings',
		update_singleton: 'updated settings',
		list_assets: 'browsed assets',
		upload_asset: 'uploaded a file'
	};

	const TOOL_ICONS: Record<string, Component> = {
		describe_cms: Info,
		list_collections: Layers,
		get_schema: FileCode,
		validate_schema: ShieldCheck,
		validate_document: ShieldCheck,
		query_documents: Search,
		get_document: FileText,
		create_document: FilePlus,
		update_document: Pencil,
		publish_document: UploadCloud,
		get_singleton: Settings,
		update_singleton: Settings,
		list_assets: Image,
		upload_asset: ImagePlus
	};

	function toolVerb(name: string) {
		return TOOL_VERBS[name] ?? formatToolName(name);
	}

	function toolIcon(name: string): Component {
		return TOOL_ICONS[name] ?? Wrench;
	}

	function toolTitle(tool: ToolCall) {
		const verb = toolVerb(tool.name);
		return verb.charAt(0).toUpperCase() + verb.slice(1);
	}

	/** One line of context under a tool entry — where it looked/wrote, and a result count if
	 * the tool's own result shape has one. Kept generic across tools rather than special-cased
	 * per name, since new tools shouldn't need a matching branch here to show *something*. */
	function plural(n: number, word: string) {
		return `${n} ${word}${n === 1 ? '' : 's'}`;
	}

	/** A result note per tool, named to its actual result shape — not a generic "find the
	 * first array field" guess, which produced nonsense (e.g. counting validate_document's
	 * `errors` array as "results", or grabbing an arbitrary field off describe_cms). Tools
	 * whose result has nothing meaningful to summarize just get no note (the location line
	 * — collection/id — still shows). */
	function toolResultNote(tool: ToolCall): string | null {
		const r = tool.result;
		if (!r || typeof r !== 'object') return null;
		const record = r as Record<string, unknown>;

		switch (tool.name) {
			case 'list_collections': {
				const n = (record.collections as unknown[] | undefined)?.length;
				return n === undefined ? null : plural(n, 'collection');
			}
			case 'list_assets': {
				const n = (record.assets as unknown[] | undefined)?.length;
				return n === undefined ? null : plural(n, 'asset');
			}
			case 'query_documents': {
				const total = record.totalDocs;
				return typeof total === 'number' ? plural(total, 'document') : null;
			}
			case 'validate_document':
			case 'validate_schema': {
				if (record.isValid === true) return 'valid';
				const n = (record.errors as unknown[] | undefined)?.length ?? 0;
				return plural(n, 'error');
			}
			default:
				return null;
		}
	}

	function toolDetail(tool: ToolCall): string | null {
		const parts: string[] = [];
		const collection = tool.arguments.collection;
		const id = tool.arguments.id;
		if (typeof collection === 'string') parts.push(collection);
		if (typeof id === 'string') parts.push(id);
		const location = parts.join(' · ');

		return [location, toolResultNote(tool)].filter(Boolean).join(' — ') || null;
	}

	// The turn's collapsed summary line — unique tool verbs in first-use order, e.g.
	// "Listed collections, updated a document".
	function toolsSummary(turn: Turn): string {
		const seen = new Set<string>();
		const verbs: string[] = [];
		for (const tool of turn.toolCalls) {
			if (seen.has(tool.name)) continue;
			seen.add(tool.name);
			verbs.push(toolVerb(tool.name));
		}
		const sentence = verbs.join(', ');
		return sentence.charAt(0).toUpperCase() + sentence.slice(1);
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
		class="bg-background/90 relative flex h-14 shrink-0 items-center justify-between border-b px-4 backdrop-blur sm:px-6 {embedded
			? 'pr-20 sm:pr-20'
			: ''}"
	>
		<div class="flex min-w-0 items-center gap-3">
			<div
				class="bg-primary/10 text-primary flex size-8 shrink-0 items-center justify-center rounded-lg"
			>
				<Sparkles class="size-4" />
			</div>
			<div class="min-w-0">
				<h1 class="truncate text-sm font-semibold">{title}</h1>
				<p class="text-muted-foreground truncate text-xs">{subtitle}</p>
			</div>
		</div>
		{#if agentChatState.turns.length > 0}
			<Button
				variant="ghost"
				size="icon-sm"
				onclick={clearConversation}
				disabled={streaming}
				aria-label="Clear conversation"
				class={embedded ? 'absolute top-2 right-14' : ''}
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
					{#if agentChatState.turns.length === 0}
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
									{@const text = typeof suggestion === 'string' ? suggestion : suggestion.text}
									{@const Icon = typeof suggestion === 'string' ? null : suggestion.icon}
									<button
										type="button"
										class="bg-background hover:bg-accent flex cursor-pointer items-start gap-2 rounded-xl border p-3 text-left text-xs leading-relaxed shadow-xs transition-colors"
										onclick={() => send(text)}
									>
										{#if Icon}
											<Icon class="text-muted-foreground mt-0.5 size-3.5 shrink-0" />
										{/if}
										<span>{text}</span>
									</button>
								{/each}
							</div>
						</div>
					{:else}
						{#each agentChatState.turns as turn, index (turn.id)}
							<MessageScrollerItem messageId={turn.id} scrollAnchor={turn.role === 'user'}>
								<Message align={turn.role === 'user' ? 'end' : 'start'}>
									<MessageContent>
										{#if turn.role === 'user'}
											<Bubble variant="secondary" align="end"
												><BubbleContent class="rounded-xl">{turn.text}</BubbleContent></Bubble
											>
										{:else}
											{#if turn.toolCalls.length > 0}
												<details class="group/tools mb-2 w-full">
													<summary
														class="text-muted-foreground hover:text-foreground flex cursor-pointer list-none items-center gap-1.5 text-xs transition-colors"
													>
														<span
															class={turn.toolCalls.some((t) => t.status === 'running')
																? 'shimmer'
																: ''}>{toolsSummary(turn)}</span
														>
														<ChevronDown
															class="size-3 transition-transform group-open/tools:rotate-180"
														/>
													</summary>
													<div
														class="bg-muted/40 mt-1.5 flex flex-col gap-2.5 rounded-lg px-2.5 py-2"
													>
														{#each turn.toolCalls as tool (tool.id)}
															{@const Icon = toolIcon(tool.name)}
															{@const detail = toolDetail(tool)}
															<div class="flex flex-col gap-0.5">
																<div class="text-muted-foreground flex items-center gap-2 text-xs">
																	{#if tool.status === 'running'}
																		<LoaderCircle class="size-3 shrink-0 animate-spin" />
																	{:else if tool.status === 'error'}
																		<CircleAlert class="text-destructive size-3 shrink-0" />
																	{:else}
																		<Icon class="size-3 shrink-0" />
																	{/if}
																	<span>{toolTitle(tool)}</span>
																</div>
																{#if tool.error}
																	<p class="text-destructive pl-5 text-xs">{tool.error}</p>
																{:else if detail}
																	<p class="text-muted-foreground/80 pl-5 text-xs">{detail}</p>
																{/if}
															</div>
														{/each}
														<div class="text-muted-foreground flex items-center gap-2 text-xs">
															{#if turn.toolCalls.some((t) => t.status === 'running')}
																<LoaderCircle class="size-3 animate-spin" /> Working…
															{:else if turn.toolCalls.some((t) => t.status === 'error')}
																<CircleAlert class="text-destructive size-3" /> Done with errors
															{:else}
																<Check class="size-3" /> Done
															{/if}
														</div>
													</div>
												</details>
											{/if}

											{#if turn.text}
												<Bubble variant="ghost"
													><BubbleContent class="markdown-body px-0"
														>{@html renderMarkdown(turn.text)}</BubbleContent
													></Bubble
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
		{#if documentLabel}
			<div
				class="mx-auto mb-2 flex max-w-3xl items-center gap-1.5 text-xs {documentLabel.editing
					? 'text-primary'
					: 'text-muted-foreground'}"
			>
				{#if documentLabel.editing}
					<Pencil class="size-3.5 shrink-0" />
					<span class="truncate font-medium">Editing: {documentLabel.text}</span>
				{:else}
					<FileText class="size-3.5 shrink-0" />
					<span class="truncate">Viewing: {documentLabel.text}</span>
				{/if}
			</div>
		{/if}
		{#if isGettingLong}
			<div
				class="border-rule bg-muted/60 text-muted-foreground mx-auto mb-2 flex max-w-3xl items-center gap-2 rounded-lg border px-3 py-2 text-xs"
			>
				<CircleAlert class="size-3.5 shrink-0" />
				<span class="flex-1"
					>This conversation is getting long (~{Math.round(agentChatState.lastPromptTokens / 1000)}K
					tokens sent each turn) — consider clearing it for better results.</span
				>
				<Button variant="ghost" size="sm" class="h-6 shrink-0 px-2" onclick={clearConversation}
					>Clear</Button
				>
			</div>
		{/if}
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

<style>
	/* `{@html}`-injected markdown bypasses Svelte's scoped-style attribute, so these rules
	   have to be :global — they only ever target `.markdown-body`, scoped by that class alone. */
	:global(.markdown-body > :first-child) {
		margin-top: 0;
	}
	:global(.markdown-body > :last-child) {
		margin-bottom: 0;
	}
	:global(.markdown-body p) {
		margin: 0.5em 0;
	}
	:global(.markdown-body ul),
	:global(.markdown-body ol) {
		margin: 0.5em 0;
		padding-left: 1.25em;
	}
	:global(.markdown-body ul) {
		list-style: disc;
	}
	:global(.markdown-body ol) {
		list-style: decimal;
	}
	:global(.markdown-body li) {
		margin: 0.15em 0;
	}
	:global(.markdown-body li > p) {
		margin: 0;
	}
	:global(.markdown-body h1),
	:global(.markdown-body h2),
	:global(.markdown-body h3) {
		font-weight: 600;
		margin: 0.75em 0 0.35em;
	}
	:global(.markdown-body h1) {
		font-size: 1.15em;
	}
	:global(.markdown-body h2) {
		font-size: 1.08em;
	}
	:global(.markdown-body h3) {
		font-size: 1.02em;
	}
	:global(.markdown-body a) {
		color: var(--primary);
		text-decoration: underline;
		text-underline-offset: 2px;
	}
	:global(.markdown-body code) {
		background: var(--muted);
		padding: 0.1em 0.35em;
		border-radius: 0.3em;
		font-size: 0.85em;
	}
	:global(.markdown-body pre) {
		background: var(--muted);
		padding: 0.6em 0.75em;
		border-radius: 0.5em;
		overflow-x: auto;
		margin: 0.5em 0;
	}
	:global(.markdown-body pre code) {
		background: none;
		padding: 0;
	}
	:global(.markdown-body blockquote) {
		border-left: 2px solid var(--border);
		padding-left: 0.75em;
		margin: 0.5em 0;
		color: var(--muted-foreground);
	}
	:global(.markdown-body table) {
		border-collapse: collapse;
		margin: 0.5em 0;
	}
	:global(.markdown-body th),
	:global(.markdown-body td) {
		border: 1px solid var(--border);
		padding: 0.25em 0.5em;
	}
	:global(.markdown-body strong) {
		font-weight: 600;
	}
</style>
