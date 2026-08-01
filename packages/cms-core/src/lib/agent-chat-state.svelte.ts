// Module-level state for AgentChat.svelte — deliberately NOT local component state.
//
// The assistant panel is mounted inside a Sheet (Sidebar.svelte); bits-ui's Dialog.Content
// (which Sheet wraps) unmounts its children when closed, so a plain `$state` declared inside
// AgentChat.svelte gets destroyed and recreated every time the panel is closed and reopened —
// the conversation would vanish even without navigating away or reloading. A module-level
// singleton survives that remount (and client-side navigation, since it's the same JS module
// instance) — same pattern as `activeTabState` (apps/studio/src/lib/stores/activeTab.svelte.ts).
//
// Also mirrored to localStorage so it survives a hard reload too — still just this one
// browser tab's convenience cache, not real conversation persistence (a DB-backed, multi-
// conversation, cross-device history is a separate, bigger feature, deliberately not built
// yet — see the conversation that led here). Wrapped in try/catch throughout: private
// browsing / a full storage quota must never break the chat, just silently skip persisting.

const STORAGE_KEY = 'aphex:agent-chat-state:v1';

interface PersistedState {
	turns: Turn[];
	history: HistoryMessage[];
	contextSentFor: string | null;
	lastPromptTokens: number;
}

function loadPersisted(): PersistedState | null {
	if (typeof localStorage === 'undefined') return null;
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		return raw ? (JSON.parse(raw) as PersistedState) : null;
	} catch {
		return null;
	}
}

export type HistoryMessage = {
	role: 'system' | 'user' | 'assistant' | 'tool';
	content: string;
	toolCalls?: Array<{ id: string; name: string; arguments: Record<string, unknown> }>;
	toolCallId?: string;
};

export type ToolCall = {
	id: string;
	name: string;
	arguments: Record<string, unknown>;
	status: 'running' | 'complete' | 'error';
	result?: unknown;
	error?: string;
};

export type Turn = {
	id: string;
	role: 'user' | 'assistant';
	text: string;
	status: 'complete' | 'streaming' | 'error' | 'stopped';
	toolCalls: ToolCall[];
	error?: string;
	/** Only set on user turns — `history.length` right before this turn was sent, so
	 * `retry()` can roll `history` back to exactly that point rather than guessing an
	 * offset (a turn's server-reported `messages` can add more than 2 entries once tool
	 * calls are involved). */
	historyIndexBeforeTurn?: number;
};

function createAgentChatState() {
	const persisted = loadPersisted();
	let turns = $state<Turn[]>(persisted?.turns ?? []);
	let history = $state<HistoryMessage[]>(persisted?.history ?? []);
	let contextSentFor = $state<string | null>(persisted?.contextSentFor ?? null);
	// The most recent `usage.promptTokens` reported by the model — since this endpoint
	// resends the full conversation on every call, this is effectively "how big the
	// conversation currently is," used to warn before it gets unwieldy (or expensive).
	let lastPromptTokens = $state(persisted?.lastPromptTokens ?? 0);

	// A live turn mid-stream shouldn't be persisted as if it finished — reload would show a
	// permanently "streaming" bubble with a spinner that will never resolve. Reloading the
	// page always means the in-flight request is gone, so mark it stopped instead.
	for (const turn of turns) {
		if (turn.status === 'streaming') turn.status = 'stopped';
	}

	if (typeof localStorage !== 'undefined') {
		$effect.root(() => {
			$effect(() => {
				// Reading `turns`/`history`/`contextSentFor` here is what makes this effect
				// re-run on every mutation (including in-place `.push()`, via `$state`'s deep
				// reactivity) — not just on reassignment.
				const snapshot: PersistedState = { turns, history, contextSentFor, lastPromptTokens };
				try {
					localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
				} catch {
					// Quota exceeded / private browsing — best-effort only, drop it.
				}
			});
		});
	}

	return {
		get turns() {
			return turns;
		},
		set turns(value: Turn[]) {
			turns = value;
		},
		get history() {
			return history;
		},
		set history(value: HistoryMessage[]) {
			history = value;
		},
		get contextSentFor() {
			return contextSentFor;
		},
		set contextSentFor(value: string | null) {
			contextSentFor = value;
		},
		get lastPromptTokens() {
			return lastPromptTokens;
		},
		set lastPromptTokens(value: number) {
			lastPromptTokens = value;
		}
	};
}

export const agentChatState = createAgentChatState();
