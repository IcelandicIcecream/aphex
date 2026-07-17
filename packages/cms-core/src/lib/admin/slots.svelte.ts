/**
 * Admin slot registry — the extension-point primitive for the admin shell.
 *
 * Named regions ("slots") in the admin chrome that any component can render UI
 * into at runtime, without the shell knowing who the contributor is and without
 * anyone patching AdminApp/Sidebar directly. This is the client-side half of the
 * plugin system's "extension slots" (see references/PLUGIN_SYSTEM_PLAN.md §4):
 * registration happens in the browser via context + snippets, never through
 * SvelteKit `load` (load data must stay serializable — components can't cross it).
 *
 * Today's first consumer is the document editor, which registers its toolbar into
 * the `navbar-start` / `navbar-end` slots so its controls live in the single top
 * bar. Tomorrow, plugin document-actions and admin tools register the same way.
 *
 * Usage:
 *   // shell (once, high in the tree)
 *   const slots = setAdminSlots();
 *   // outlet
 *   {#each slots.get('navbar-end') as entry (entry.id)}{@render entry.snippet()}{/each}
 *   // contributor (auto-cleans up)
 *   const slots = useAdminSlots();
 *   $effect(() => slots?.register('navbar-end', { id: 'editor', snippet: bar }));
 */
import { getContext, setContext, untrack, type Snippet } from 'svelte';
import { SvelteMap } from 'svelte/reactivity';

/** Well-known slot names. Plain strings are allowed too (e.g. plugin-defined). */
export type AdminSlotName =
	| 'navbar-start'
	| 'navbar-end'
	| 'document-actions'
	| 'admin-tabs'
	| (string & {});

export interface AdminSlotEntry {
	/** Stable id — re-registering with the same id replaces the prior entry. */
	id: string;
	snippet: Snippet;
	/** Ascending sort within the slot. Defaults to 0. */
	order?: number;
}

export class AdminSlots {
	// Reactive so outlets re-render as entries come and go.
	#slots = new SvelteMap<string, AdminSlotEntry[]>();

	/**
	 * Register a snippet into a slot. Returns an unregister function — call it on
	 * cleanup (returning it from an `$effect` does this automatically).
	 */
	register(name: AdminSlotName, entry: AdminSlotEntry): () => void {
		const current = untrack(() => this.#slots.get(name) ?? []);
		const next = [...current.filter((e) => e.id !== entry.id), entry].sort(
			(a, b) => (a.order ?? 0) - (b.order ?? 0)
		);
		this.#slots.set(name, next);

		return () => {
			const list = untrack(() => this.#slots.get(name));
			if (!list) return;
			const filtered = list.filter((e) => e.id !== entry.id);
			if (filtered.length > 0) this.#slots.set(name, filtered);
			else this.#slots.delete(name);
		};
	}

	/** Entries registered in a slot, in sort order. Empty array if none. */
	get(name: AdminSlotName): AdminSlotEntry[] {
		return this.#slots.get(name) ?? [];
	}

	/** Whether a slot has any entries — handy for conditional chrome. */
	has(name: AdminSlotName): boolean {
		return this.get(name).length > 0;
	}
}

const ADMIN_SLOTS_KEY = Symbol.for('aphex.admin.slots');

/** Create a registry and publish it to descendants. Call once in the admin shell. */
export function setAdminSlots(): AdminSlots {
	const slots = new AdminSlots();
	setContext(ADMIN_SLOTS_KEY, slots);
	return slots;
}

/** Read the registry. Returns `undefined` outside an admin shell (safe to guard). */
export function useAdminSlots(): AdminSlots | undefined {
	return getContext<AdminSlots | undefined>(ADMIN_SLOTS_KEY);
}
