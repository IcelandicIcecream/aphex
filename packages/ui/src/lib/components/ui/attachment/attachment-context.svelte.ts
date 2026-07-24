import { getContext, setContext } from 'svelte';

const ATTACHMENT = Symbol.for('aphexcms.ui.attachment');
export type AttachmentState = 'idle' | 'uploading' | 'processing' | 'error' | 'done';
export type AttachmentSize = 'default' | 'sm' | 'xs';
export type AttachmentOrientation = 'horizontal' | 'vertical';

export class AttachmentContext {
	state = $state<AttachmentState>('done');
	size = $state<AttachmentSize>('default');
	orientation = $state<AttachmentOrientation>('horizontal');
}

export function setAttachmentContext() {
	return setContext(ATTACHMENT, new AttachmentContext());
}

export function getAttachmentContext() {
	return getContext<AttachmentContext>(ATTACHMENT) ?? new AttachmentContext();
}
