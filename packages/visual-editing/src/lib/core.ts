import { stegaDecode } from './stega.js';

export interface AphexPreviewOptions {
	/**
	 * Whether to scan DOM text nodes for stega markers and auto-stamp data-aphex-field.
	 * Set to false if you add data-aphex-field attributes manually. Default: true.
	 */
	stega?: boolean;
	/** Called whenever the CMS pushes a new document snapshot via postMessage. */
	onData?: (doc: Record<string, unknown>) => void;
}

/**
 * Vanilla JS entry point for Aphex live preview.
 * Call this once in your frontend (framework-agnostic).
 * Returns a cleanup function — call it on unmount.
 *
 * @example
 * // SvelteKit
 * $effect(() => enableAphexPreview({ onData: (doc) => { preview.current = doc; } }));
 *
 * // Vanilla / React useEffect
 * const cleanup = enableAphexPreview({ onData: setPost });
 * return cleanup;
 */
export function enableAphexPreview(options: AphexPreviewOptions = {}): () => void {
	const { stega = true, onData } = options;

	if (typeof window === 'undefined' || window.parent === window) return () => {};

	// Cursor style for all field elements
	const style = document.createElement('style');
	style.textContent = '[data-aphex-field] { cursor: pointer !important; }';
	document.head.appendChild(style);

	// Floating overlay
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

	// Walk text nodes for stega markers and stamp navigation data on their parent element.
	function scanStega() {
		if (!stega) return;
		const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
		let node: Node | null;
		while ((node = walker.nextNode())) {
			const text = node.textContent ?? '';
			const decoded = stegaDecode(text);
			if (decoded?.field) {
				const el = node.parentElement;
				if (el) {
					if (!el.dataset.aphexField) el.dataset.aphexField = decoded.field;
					if (decoded.blockIndex != null && !el.dataset.aphexBlockIndex) {
						el.dataset.aphexBlockIndex = String(decoded.blockIndex);
					}
					if (decoded.blockKey && !el.dataset.aphexBlockKey) {
						el.dataset.aphexBlockKey = decoded.blockKey;
					}
					if (decoded.arrayIndex != null && !el.dataset.aphexArrayIndex) {
						el.dataset.aphexArrayIndex = String(decoded.arrayIndex);
					}
					if (decoded.objectPath && !el.dataset.aphexObjectPath) {
						el.dataset.aphexObjectPath = decoded.objectPath;
					}
				}
			}
		}
	}

	scanStega();

	let editMode = true;
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
		if (!editMode) return;
		const el = (e.target as Element).closest<HTMLElement>('[data-aphex-field]');
		el ? showOn(el) : hide();
	};

	const onClick = (e: MouseEvent) => {
		// Always prevent default — links/buttons must not navigate in preview
		e.preventDefault();
		if (!editMode) return;
		const el = (e.target as Element).closest<HTMLElement>('[data-aphex-field]');
		if (el?.dataset.aphexField) {
			e.stopPropagation();
			const d = el.dataset;
			window.parent.postMessage(
				{
					type: 'aphex:field-click',
					fieldPath: d.aphexField,
					blockIndex: d.aphexBlockIndex != null ? parseInt(d.aphexBlockIndex, 10) : undefined,
					blockKey: d.aphexBlockKey ?? undefined,
					arrayIndex: d.aphexArrayIndex != null ? parseInt(d.aphexArrayIndex, 10) : undefined,
					objectPath: d.aphexObjectPath ?? undefined
				},
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

		if (type === 'aphex:edit-mode') {
			editMode = (e.data as { enabled: boolean }).enabled;
			if (!editMode) {
				hide();
				style.textContent = '';
			} else {
				style.textContent = '[data-aphex-field] { cursor: pointer !important; }';
			}
		} else if (type === 'aphex:data' && doc) {
			onData?.(doc);
			// Re-scan after the framework re-renders with the new stega-encoded values
			requestAnimationFrame(scanStega);
		} else if (type === 'aphex:field-focus' && fieldPath) {
			const el = document.querySelector<HTMLElement>(`[data-aphex-field="${fieldPath}"]`);
			if (!el) return;
			el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
			showOn(el);
			el.animate(
				[
					{ outline: '3px solid #3b82f6', outlineOffset: '4px' },
					{ outline: '3px solid #3b82f600', outlineOffset: '8px' }
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
	window.parent.postMessage({ type: 'aphex:ready', stega }, '*');

	return () => {
		document.removeEventListener('mouseover', onMouseOver);
		document.removeEventListener('click', onClick, true);
		window.removeEventListener('scroll', onScroll, true);
		window.removeEventListener('message', onMessage);
		overlay.remove();
		style.remove();
	};
}
