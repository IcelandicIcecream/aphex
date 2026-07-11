/**
 * Admin URL navigation — the single place that knows the admin's query-param
 * vocabulary and how each navigation intent maps onto it.
 *
 * The admin encodes its whole view state in the URL (`?view`, `?docType`, `?docId`,
 * `?action`, `?stack`, …) and a URL-watching effect derives component state from it.
 * That's good (shareable, back-button-friendly) but the writes were scattered as
 * ad-hoc `SvelteURLSearchParams` + `goto` blocks, each hand-clearing the params it
 * happened to remember — which is how "opening a doc left a stale ?view" slipped in.
 *
 * This module replaces those with named intents. Each intent declares the FULL set
 * of params it touches (setting some, clearing others), so no caller has to
 * remember the interactions. `patch()` remains for the rare bespoke case.
 */
import { getContext, setContext } from 'svelte';
import { goto } from '$app/navigation';
import { page } from '$app/state';
import { SvelteURLSearchParams } from 'svelte/reactivity';
import type { AdminArea } from './types';

/** The known admin URL params. Central list so intents never typo a key. */
export type AdminParam =
	| 'view'
	| 'docType'
	| 'docId'
	| 'action'
	| 'stack'
	| 'history'
	| 'focus'
	| 'orgId'
	| 'fromDocId'
	| 'fromDocType';

/** A set of param changes: a value sets the key, `null` clears it. */
export type ParamPatch = Partial<Record<AdminParam, string | null>>;

export interface AdminNav {
	/** Apply a param patch and navigate. `replace` defaults to true. */
	patch(changes: ParamPatch, opts?: { replace?: boolean }): Promise<void>;

	/** Switch the top-level area/tab. `structure` clears `?view`; others set it. */
	openArea(area: AdminArea): Promise<void>;
	/** Show a document type's list (structure area). */
	openType(docType: string): Promise<void>;
	/**
	 * Open a document in the editor (structure area). `docType` is optional — when
	 * omitted the existing `?docType` is preserved (the URL effect resolves it).
	 */
	openDocument(docId: string, docType?: string, opts?: { replace?: boolean }): Promise<void>;
	/** Start creating a new document of a type. */
	createDocument(docType: string): Promise<void>;
	/** Close the current document, back to its type's list. */
	closeToType(docType: string): Promise<void>;
	/** Back to the dashboard (no type, no doc). */
	goHome(): Promise<void>;
}

const ADMIN_NAV_KEY = Symbol.for('aphex.admin.nav');

/** Create an admin nav and publish it to descendants (call once in the shell). */
export function setAdminNav(basePath = '/admin'): AdminNav {
	const nav = createAdminNav(basePath);
	setContext(ADMIN_NAV_KEY, nav);
	return nav;
}

/** Read the admin nav. `undefined` outside the admin shell (safe to guard). */
export function useAdminNav(): AdminNav | undefined {
	return getContext<AdminNav | undefined>(ADMIN_NAV_KEY);
}

export function createAdminNav(basePath = '/admin'): AdminNav {
	async function patch(changes: ParamPatch, { replace = true }: { replace?: boolean } = {}) {
		const params = new SvelteURLSearchParams(page.url.searchParams);
		for (const [key, value] of Object.entries(changes)) {
			if (value == null) params.delete(key);
			else params.set(key, value);
		}
		const query = params.toString();
		await goto(`${basePath}${query ? `?${query}` : ''}`, {
			replaceState: replace,
			keepFocus: true
		});
	}

	return {
		patch,
		openArea: (area) =>
			// A plugin/other area is addressable via ?view; structure is the default (no ?view).
			// Leaving an area always drops any open document.
			patch({
				view: area === 'structure' ? null : area,
				docId: null,
				docType: null,
				stack: null,
				action: null
			}),
		openType: (docType) =>
			patch(
				{ docType, docId: null, action: null, stack: null, history: null, view: null },
				{ replace: false }
			),
		openDocument: (docId, docType, opts) =>
			patch(
				{
					docId,
					...(docType ? { docType } : {}),
					action: null,
					fromDocId: null,
					fromDocType: null,
					view: null
				},
				{ replace: opts?.replace ?? false }
			),
		createDocument: (docType) =>
			patch(
				{ docType, action: 'create', docId: null, stack: null, view: null },
				{ replace: false }
			),
		closeToType: (docType) =>
			patch(
				{ docType, docId: null, action: null, stack: null, focus: null, history: null, view: null },
				{ replace: false }
			),
		goHome: () =>
			patch({
				view: null,
				docType: null,
				docId: null,
				action: null,
				stack: null,
				focus: null,
				history: null
			})
	};
}
