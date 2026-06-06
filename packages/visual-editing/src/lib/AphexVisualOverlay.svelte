<script lang="ts">
	import { onMount } from 'svelte';
	import type { AphexInboundMessage, AphexOutboundMessage } from './types.js';

	interface Props {
		/** Set to false to disable overlays (e.g. in production builds). */
		enabled?: boolean;
		children?: import('svelte').Snippet;
	}

	let { enabled = true, children }: Props = $props();

	let active = $state(false);

	onMount(() => {
		if (!enabled || window.parent === window) return;

		active = true;

		// Tell the CMS we're ready
		const ready: AphexOutboundMessage = { type: 'aphex:ready' };
		window.parent.postMessage(ready, '*');

		// Listen for messages from the CMS
		function handleMessage(e: MessageEvent) {
			const msg = e.data as AphexInboundMessage;
			if (!msg?.type) return;

			if (msg.type === 'aphex:field-focus') {
				const prev = document.querySelector('[data-aphex-focused]');
				prev?.removeAttribute('data-aphex-focused');

				const el = document.querySelector(`[data-aphex-field="${msg.fieldPath}"]`);
				if (el) {
					el.setAttribute('data-aphex-focused', 'true');
					el.scrollIntoView({ behavior: 'smooth', block: 'center' });
					setTimeout(() => el.removeAttribute('data-aphex-focused'), 2000);
				}
			} else if (msg.type === 'aphex:refresh') {
				// Dispatch a custom event so SvelteKit load functions can invalidate.
				// Users can listen with: window.addEventListener('aphex:refresh', () => invalidateAll())
				window.dispatchEvent(new CustomEvent('aphex:refresh'));
			}
		}

		// Intercept clicks on elements with data-aphex-field
		function handleClick(e: MouseEvent) {
			if (!active) return;
			const target = e.target as Element;
			const fieldEl = target.closest('[data-aphex-field]');
			if (!fieldEl) return;

			e.preventDefault();
			e.stopPropagation();

			const msg: AphexOutboundMessage = {
				type: 'aphex:field-click',
				fieldPath: fieldEl.getAttribute('data-aphex-field')!,
				documentId: fieldEl.getAttribute('data-aphex-doc') ?? undefined
			};
			window.parent.postMessage(msg, '*');
		}

		window.addEventListener('message', handleMessage);
		document.addEventListener('click', handleClick, true);

		return () => {
			window.removeEventListener('message', handleMessage);
			document.removeEventListener('click', handleClick, true);
		};
	});
</script>

{@render children?.()}

{#if active}
	<style>
		:global([data-aphex-field]) {
			outline: 2px solid transparent;
			outline-offset: 3px;
			border-radius: 3px;
			transition:
				outline-color 120ms,
				outline-offset 120ms;
			cursor: pointer;
		}

		:global([data-aphex-field]:hover) {
			outline-color: oklch(0.6 0.2 250);
		}

		:global([data-aphex-field][data-aphex-focused='true']) {
			outline-color: oklch(0.6 0.2 250);
			animation: aphex-pulse 600ms ease-in-out 3;
		}

		@keyframes aphex-pulse {
			0%,
			100% {
				outline-color: oklch(0.6 0.2 250);
				outline-offset: 3px;
			}
			50% {
				outline-color: oklch(0.8 0.15 250 / 0.4);
				outline-offset: 5px;
			}
		}
	</style>
{/if}
