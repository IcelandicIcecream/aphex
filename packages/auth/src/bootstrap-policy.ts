import { openFirstUser, type BootstrapPolicy } from '@aphexcms/cms-core/server';

/**
 * Resolves the configured first-administrator policy, or the default.
 *
 * Lives in its own module because two call sites need the same answer: the auth
 * instance creates a profile in its `/sign-up/email` hook, and the auth service
 * creates one lazily in `getSession` for any user who somehow reaches a request
 * without one. If those two disagreed about the default, who becomes the first
 * administrator would depend on which path happened to run first.
 */
export function resolveBootstrapPolicy(policy?: BootstrapPolicy): BootstrapPolicy {
	return policy ?? openFirstUser();
}
