<script lang="ts">
	import { setLivePreviewContext } from '../../preview/live-preview.svelte.js';
	import type { Snippet } from 'svelte';

	interface Props {
		children: Snippet;
	}
	let { children }: Props = $props();

	const preview = setLivePreviewContext();

	$effect(() => {
		if (typeof window === 'undefined') return;
		if (!new URLSearchParams(window.location.search).has('aphex-preview')) return;

		// Cursor style for all field elements
		const style = document.createElement('style');
		style.textContent = '[data-aphex-field] { cursor: pointer !important; }';
		document.head.appendChild(style);

		// Overlay elements
		const overlay = document.createElement('div');
		const label = document.createElement('span');

		overlay.style.cssText = [
			'position:fixed',
			'pointer-events:none',
			'border:2px solid #3b82f6',
			'border-radius:4px',
			'z-index:2147483647',
			'display:none',
			'box-sizing:border-box',
			'transition:top 60ms,left 60ms,width 60ms,height 60ms'
		].join(';');

		label.style.cssText = [
			'position:absolute',
			'top:0',
			'left:0',
			'transform:translateY(-100%)',
			'background:#3b82f6',
			'color:#fff',
			'font-size:10px',
			'font-weight:600',
			'line-height:1',
			'padding:3px 7px',
			'border-radius:3px 3px 0 0',
			'white-space:nowrap',
			'font-family:ui-monospace,monospace',
			'text-transform:uppercase',
			'letter-spacing:0.05em'
		].join(';');

		overlay.appendChild(label);
		document.body.appendChild(overlay);

		let activeEl: HTMLElement | null = null;

		function positionOn(el: HTMLElement) {
			const r = el.getBoundingClientRect();
			overlay.style.left = `${r.left - 2}px`;
			overlay.style.top = `${r.top - 2}px`;
			overlay.style.width = `${r.width + 4}px`;
			overlay.style.height = `${r.height + 4}px`;
		}

		function showOn(el: HTMLElement) {
			activeEl = el;
			label.textContent = el.dataset.aphexField ?? '';
			positionOn(el);
			overlay.style.display = 'block';
		}

		function hide() {
			activeEl = null;
			overlay.style.display = 'none';
		}

		const onMouseOver = (e: MouseEvent) => {
			const el = (e.target as Element).closest<HTMLElement>('[data-aphex-field]');
			el ? showOn(el) : hide();
		};

		const onClick = (e: MouseEvent) => {
			const el = (e.target as Element).closest<HTMLElement>('[data-aphex-field]');
			if (el?.dataset.aphexField) {
				e.stopPropagation();
				window.parent.postMessage(
					{ type: 'aphex:field-click', fieldPath: el.dataset.aphexField },
					'*'
				);
			}
		};

		const onScroll = () => {
			if (activeEl) positionOn(activeEl);
		};

		const onMessage = (e: MessageEvent) => {
			if (!e.data || typeof e.data !== 'object') return;
			const {
				type,
				fieldPath,
				document: doc
			} = e.data as {
				type: string;
				fieldPath?: string;
				document?: Record<string, unknown>;
			};

			if (type === 'aphex:data' && doc) {
				preview.current = doc;
			} else if (type === 'aphex:field-focus' && fieldPath) {
				const el = document.querySelector<HTMLElement>(`[data-aphex-field="${fieldPath}"]`);
				if (!el) return;
				el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
				showOn(el);
				el.animate(
					[
						{ outline: '3px solid #3b82f6', outlineOffset: '4px', opacity: 1 },
						{ outline: '3px solid #3b82f600', outlineOffset: '8px', opacity: 1 }
					],
					{ duration: 1200, easing: 'ease-out', fill: 'none' }
				);
				setTimeout(hide, 1200);
			}
		};

		document.addEventListener('mouseover', onMouseOver);
		document.addEventListener('click', onClick, true);
		window.addEventListener('scroll', onScroll, true);
		window.addEventListener('message', onMessage);
		window.parent.postMessage({ type: 'aphex:ready' }, '*');

		return () => {
			document.removeEventListener('mouseover', onMouseOver);
			document.removeEventListener('click', onClick, true);
			window.removeEventListener('scroll', onScroll, true);
			window.removeEventListener('message', onMessage);
			overlay.remove();
			style.remove();
		};
	});
</script>

{@render children()}
