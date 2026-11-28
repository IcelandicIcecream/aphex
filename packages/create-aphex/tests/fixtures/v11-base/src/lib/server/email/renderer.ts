import Renderer, { toPlainText } from 'better-svelte-email/render';
import type { Component } from 'svelte';

const { render } = new Renderer();

export async function renderEmail<Props extends Record<string, unknown>>(
	component: Component<Props>,
	props: Props
): Promise<{ html: string; text: string }> {
	const html = await render(component, { props });
	const text = toPlainText(html);
	return { html, text };
}
