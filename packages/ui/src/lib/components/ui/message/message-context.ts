import { getContext, setContext } from 'svelte';

const MESSAGE = Symbol.for('aphexcms.ui.message');
export type MessageAlign = 'start' | 'end';

export function setMessageContext(align: () => MessageAlign) {
	setContext(MESSAGE, align);
}

export function getMessageContext(): () => MessageAlign {
	return getContext<() => MessageAlign>(MESSAGE) ?? (() => 'start');
}
