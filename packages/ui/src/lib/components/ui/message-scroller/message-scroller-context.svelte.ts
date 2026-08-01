import { getContext, setContext } from 'svelte';

const MESSAGE_SCROLLER = Symbol.for('aphexcms.ui.message-scroller');

export type ScrollPosition = 'start' | 'end' | 'last-anchor';

export type MessageScrollerOptions = {
	autoScroll: boolean;
	defaultScrollPosition: ScrollPosition;
	preserveScrollOnPrepend: boolean;
	scrollPreviousItemPeek: number;
};

export class MessageScrollerState {
	viewport = $state<HTMLDivElement | null>(null);
	content = $state<HTMLDivElement | null>(null);
	autoscrolling = $state(false);
	initialized = $state(false);
	canScrollStart = $state(false);
	canScrollEnd = $state(false);
	currentAnchorId = $state<string | null>(null);
	visibleMessageIds = $state<string[]>([]);
	options: MessageScrollerOptions;

	#items = new Map<string, { element: HTMLElement; anchor: boolean }>();
	#visible = new Set<string>();
	#following = false;
	#frame = 0;
	#previousIds: string[] = [];
	#previousHeight = 0;
	#lastAnchorId: string | null = null;

	constructor(options: MessageScrollerOptions) {
		this.options = options;
	}

	setViewport(element: HTMLDivElement | null) {
		this.viewport = element;
		this.scheduleLayout();
	}

	setContent(element: HTMLDivElement | null) {
		this.content = element;
		this.scheduleLayout();
	}

	registerItem(id: string, element: HTMLElement, anchor: boolean) {
		this.#items.set(id, { element, anchor });
		this.scheduleLayout();
		return () => {
			this.#items.delete(id);
			this.#visible.delete(id);
			this.scheduleLayout();
		};
	}

	setItemVisible(id: string, visible: boolean) {
		if (visible) this.#visible.add(id);
		else this.#visible.delete(id);
		this.visibleMessageIds = this.orderedItems()
			.filter(([messageId]) => this.#visible.has(messageId))
			.map(([messageId]) => messageId);
		this.updateCurrentAnchor();
	}

	releaseFollow() {
		this.#following = false;
	}

	handleScroll(trusted = false) {
		const viewport = this.viewport;
		if (!viewport) return;
		const distance = viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight;
		this.canScrollStart = viewport.scrollTop > 1;
		this.canScrollEnd = distance > 1;
		if (trusted && this.options.autoScroll) this.#following = distance <= 2;
		this.updateCurrentAnchor();
	}

	scrollToStart(behavior: ScrollBehavior = 'smooth') {
		this.#following = false;
		this.scrollTo(0, behavior);
	}

	scrollToEnd(behavior: ScrollBehavior = 'smooth') {
		this.#following = this.options.autoScroll;
		this.scrollTo(this.viewport?.scrollHeight ?? 0, behavior);
	}

	scrollToMessage(id: string, behavior: ScrollBehavior = 'smooth'): boolean {
		const item = this.#items.get(id);
		if (!item || !this.viewport) return false;
		this.#following = false;
		this.scrollTo(item.element.offsetTop, behavior);
		return true;
	}

	scheduleLayout() {
		cancelAnimationFrame(this.#frame);
		this.#frame = requestAnimationFrame(() => this.layout());
	}

	destroy() {
		cancelAnimationFrame(this.#frame);
	}

	private orderedItems() {
		return [...this.#items.entries()].sort(
			(a, b) => a[1].element.offsetTop - b[1].element.offsetTop
		);
	}

	private layout() {
		const viewport = this.viewport;
		const content = this.content;
		if (!viewport || !content) return;

		const items = this.orderedItems();
		const ids = items.map(([id]) => id);
		const anchors = items.filter(([, item]) => item.anchor);
		const lastAnchor = anchors.at(-1) ?? null;

		if (!this.initialized) {
			this.initialized = true;
			if (this.options.defaultScrollPosition === 'start') this.scrollToStart('auto');
			else if (this.options.defaultScrollPosition === 'last-anchor' && lastAnchor) {
				this.scrollTo(
					Math.max(0, lastAnchor[1].element.offsetTop - this.options.scrollPreviousItemPeek),
					'auto'
				);
			} else this.scrollToEnd('auto');
			this.#following = this.options.autoScroll && !this.canScrollEnd;
		} else {
			const previousFirst = this.#previousIds[0];
			const previousFirstIndex = previousFirst ? ids.indexOf(previousFirst) : -1;
			const prepended = previousFirstIndex > 0;
			if (prepended && this.options.preserveScrollOnPrepend) {
				viewport.scrollTop += content.scrollHeight - this.#previousHeight;
			} else if (lastAnchor && lastAnchor[0] !== this.#lastAnchorId) {
				this.#following = false;
				this.scrollTo(
					Math.max(0, lastAnchor[1].element.offsetTop - this.options.scrollPreviousItemPeek),
					'smooth'
				);
			} else if (this.#following && this.options.autoScroll) {
				this.scrollToEnd('auto');
			}
		}

		this.#previousIds = ids;
		this.#previousHeight = content.scrollHeight;
		this.#lastAnchorId = lastAnchor?.[0] ?? null;
		this.handleScroll();
	}

	private scrollTo(top: number, behavior: ScrollBehavior) {
		if (!this.viewport) return;
		this.autoscrolling = true;
		this.viewport.scrollTo({ top, behavior });
		requestAnimationFrame(() => {
			this.autoscrolling = false;
			this.handleScroll();
		});
	}

	private updateCurrentAnchor() {
		const viewport = this.viewport;
		if (!viewport) return;
		const top = viewport.scrollTop + this.options.scrollPreviousItemPeek + 1;
		for (const [id, item] of this.orderedItems()) {
			if (item.anchor && item.element.offsetTop <= top) this.currentAnchorId = id;
		}
	}
}

export function setMessageScroller(options: MessageScrollerOptions) {
	return setContext(MESSAGE_SCROLLER, new MessageScrollerState(options));
}

export function useMessageScroller() {
	const state = getContext<MessageScrollerState>(MESSAGE_SCROLLER);
	if (!state) throw new Error('Message scroller parts must be inside MessageScrollerProvider');
	return state;
}

export const useMessageScrollerVisibility = useMessageScroller;
export const useMessageScrollerScrollable = useMessageScroller;
