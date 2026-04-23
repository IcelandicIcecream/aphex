// Svelte context for capability-based UI gating.
//
// Set once at the root of the admin shell with a reactive capability source;
// descendants consume via `usePermissions()`. Mirrors the server-side
// `hasCapability()` API so the same mental model applies on both sides.

import { getContext, setContext } from 'svelte';
import type { Capability } from './types/capabilities';

const KEY = Symbol.for('aphex.permissions');

export interface PermissionsContext {
	/** Current capability list (reactive). */
	readonly capabilities: readonly string[];
	/**
	 * Effective organization role name (reactive). `null` when the caller has
	 * no role (API key, unauthenticated). Used for role-name-based checks
	 * such as field-level access lists.
	 */
	readonly role: string | null;
	/** True if the session has the named capability. */
	can(cap: Capability): boolean;
	/** True if the session has at least one of the capabilities. */
	canAny(...caps: Capability[]): boolean;
	/** True if the session has every one of the capabilities. */
	canAll(...caps: Capability[]): boolean;
}

/**
 * Publish a capability context to descendants.
 *
 * `getCapabilities` is a getter rather than a static array so reactive
 * sources (Svelte state, `$page.data.rbac.capabilities`) propagate: every
 * `can()` call re-reads through the closure.
 *
 * @example
 * ```svelte
 * <script>
 *   import { page } from '$app/state';
 *   import { setPermissionsContext } from '@aphexcms/cms-core';
 *   setPermissionsContext(() => page.data.rbac?.capabilities ?? []);
 * </script>
 * ```
 */
export function setPermissionsContext(
	getCapabilities: () => readonly string[],
	getRole: () => string | null = () => null
): PermissionsContext {
	const ctx: PermissionsContext = {
		get capabilities() {
			return getCapabilities();
		},
		get role() {
			return getRole();
		},
		can(cap) {
			return getCapabilities().includes(cap);
		},
		canAny(...caps) {
			const current = getCapabilities();
			return caps.some((c) => current.includes(c));
		},
		canAll(...caps) {
			const current = getCapabilities();
			return caps.every((c) => current.includes(c));
		}
	};
	setContext(KEY, ctx);
	return ctx;
}

/**
 * Read the capability context set by an ancestor.
 *
 * When no provider is present (e.g. a component rendered in isolation during
 * tests or Storybook), returns a deny-all stub with a one-time dev warning
 * rather than throwing — that way consumers degrade to "no affordances shown"
 * instead of crashing the tree.
 */
export function usePermissions(): PermissionsContext {
	const ctx = getContext<PermissionsContext | undefined>(KEY);
	if (ctx) return ctx;
	warnOnce();
	return DENY_ALL;
}

const DENY_ALL: PermissionsContext = Object.freeze({
	capabilities: Object.freeze([]) as readonly string[],
	role: null,
	can: () => false,
	canAny: () => false,
	canAll: () => false
});

let warned = false;
function warnOnce(): void {
	if (warned) return;
	warned = true;
	if (typeof window !== 'undefined') {
		// eslint-disable-next-line no-console
		console.warn(
			'[aphex] usePermissions() called outside a PermissionsContext provider. ' +
				'All capability checks will return false. Call setPermissionsContext() in an ancestor.'
		);
	}
}
