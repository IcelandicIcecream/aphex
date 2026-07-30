// chunk-recovery.ts — standalone on purpose (importable as `@aphexcms/cms-core/chunk-recovery`
// via the package's `./*` wildcard export), NOT re-exported from `/client`: that barrel pulls in
// the admin UI component tree, and this is meant to run from a public-facing site's
// `hooks.client.ts` — the hottest of hot paths, loaded by every visitor. No npm dependencies;
// `installNavigationTimeoutRecovery` uses SvelteKit's own `$app/navigation` virtual module (not
// an installed package) and must be called from a `.svelte` component's `<script>`, not
// `hooks.client.ts` — see its doc comment.
//
// A route's lazily-loaded JS chunk (or the entry module itself) can fail to fetch from a
// transient CDN/proxy blip — a dropped connection between an edge network and the origin, or a
// stale cached HTML document referencing since-replaced hashed filenames.
//
// Three distinct gaps, three distinct hooks:
//  1. The *initial* hydration path (the entry module itself fails to load) throws/rejects in a
//     way the browser surfaces globally — `installChunkLoadRecovery()`'s `window` listeners below
//     catch this.
//  2. A client-side *navigation* (clicking a link to a lazily-loaded route) fails differently:
//     SvelteKit's own router catches the rejected dynamic import internally, routes it through
//     the app's `handleError` client hook, and resolves the navigation as failed — it never
//     becomes an `unhandledrejection` or a global `error` event, so case 1's listeners are
//     structurally blind to it. Confirmed live: a real "click Blog, nothing happens" report
//     produced exactly this — three `handleError`-logged "Failed to fetch dynamically imported
//     module" errors with no reload, since nothing was listening. `handleChunkLoadClientError`
//     is meant to be called from that hook (see `hooks.client.ts`'s `handleError` export).
//  3. Both (1) and (2) only fire once SvelteKit (or the browser) has already decided the load
//     failed — and on a real transient origin blip, that decision can ride on the CDN/proxy's own
//     gateway timeout, which is not fast (observed live: ~90s on an actual 522). A visitor
//     watching a click do nothing for a minute-plus before it silently self-heals has not had a
//     good experience, even though the page technically "recovered." `installNavigationTimeoutRecovery`
//     doesn't wait for that — it pre-empts it, forcing a hard navigation to the destination itself
//     after a short, generous timeout if SvelteKit's own client-side navigation hasn't finished by
//     then, rather than reacting to a failure that may take a minute to be reported as one.

import { beforeNavigate, afterNavigate } from '$app/navigation';

const SESSION_KEY = 'aphex:chunk-reload-attempted';

function isChunkLoadFailure(message: string): boolean {
	return /Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed|Load failed/i.test(
		message
	);
}

function reloadOnce(destination?: string): void {
	// One retry masks a transient blip. A second failure in the same session means something
	// is actually wrong (origin down, not just a hiccup) — reloading again would just loop
	// forever, and the visitor is better served by the broken-but-stable page at that point.
	if (sessionStorage.getItem(SESSION_KEY)) return;
	sessionStorage.setItem(SESSION_KEY, '1');
	// A failed *navigation* means the address bar is still showing the page the visitor was
	// leaving, not the one they clicked into — reloading `location.href` re-fetches the old
	// page, not the destination. Reload straight to the destination when we know it.
	if (destination) {
		location.href = destination;
	} else {
		location.reload();
	}
}

/**
 * Call once from `hooks.client.ts`. Reloads the page a single time if a code-split chunk or
 * the entry module fails to load during initial hydration, masking a transient CDN/origin
 * hiccup instead of leaving the page rendered-but-unresponsive. Does NOT cover a failed
 * client-side navigation — see `handleChunkLoadClientError` for that.
 */
export function installChunkLoadRecovery(): void {
	if (typeof window === 'undefined') return;

	// Resource load errors (a <script src> that 404s/522s) don't bubble — only the capture
	// phase on window sees them.
	window.addEventListener(
		'error',
		(event) => {
			const target = event.target;
			if (target instanceof HTMLScriptElement && target.src.includes('/_app/immutable/')) {
				reloadOnce();
			}
		},
		true
	);

	window.addEventListener('unhandledrejection', (event) => {
		const message = event.reason instanceof Error ? event.reason.message : String(event.reason);
		if (isChunkLoadFailure(message)) {
			reloadOnce();
		}
	});
}

/**
 * Call from `hooks.client.ts`'s exported `handleError` (SvelteKit's `HandleClientError`) with
 * the error it received and `event.url` (the destination of the failed navigation — SvelteKit
 * doesn't update `location`/the address bar until a navigation resolves, so at the moment this
 * fires the browser is still showing wherever the visitor came *from*). Covers a failed
 * client-side navigation to a lazily-loaded route — the one case `installChunkLoadRecovery`'s
 * global listeners can't see, since SvelteKit's router catches that rejection internally before
 * it ever reaches `window`.
 */
export function handleChunkLoadClientError(error: unknown, destinationUrl?: URL | string): void {
	if (typeof window === 'undefined') return;
	const message = error instanceof Error ? error.message : String(error);
	if (isChunkLoadFailure(message)) {
		reloadOnce(destinationUrl ? String(destinationUrl) : undefined);
	}
}

/**
 * Call once, at the top level of the root `+layout.svelte`'s `<script>` (must run during
 * component initialization — `beforeNavigate`/`afterNavigate` require it). Starts a `timeoutMs`
 * timer on every client-side navigation; if it hasn't finished by then, forces a hard navigation
 * to the destination instead of waiting for SvelteKit to eventually report the failure itself.
 * Shares `reloadOnce`'s session guard, so if this fires, the reactive `handleError`-based recovery
 * for the same failed navigation (which may still resolve later) is a no-op rather than a second,
 * redundant navigation.
 *
 * `timeoutMs` defaults to 4000 — several times a normal navigation's real-world latency (observed
 * consistently under 1s), generous enough to avoid pre-empting a legitimately-slow-but-working
 * request, while still bounding the worst case to seconds instead of however long the CDN/proxy's
 * own gateway timeout happens to be.
 */
export function installNavigationTimeoutRecovery(timeoutMs = 4000): void {
	if (typeof window === 'undefined') return;

	let timer: ReturnType<typeof setTimeout> | undefined;

	beforeNavigate((nav) => {
		clearTimeout(timer);
		const target = nav.to?.url;
		// `willUnload` navigations (external links, full-page nav) are already real browser
		// navigations with their own native loading behavior — nothing to pre-empt there.
		if (!target || nav.willUnload) return;
		timer = setTimeout(() => {
			if (sessionStorage.getItem(SESSION_KEY)) return;
			sessionStorage.setItem(SESSION_KEY, '1');
			location.href = target.href;
		}, timeoutMs);
	});

	afterNavigate(() => {
		clearTimeout(timer);
	});
}
