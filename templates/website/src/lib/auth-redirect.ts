/**
 * Resolve the page shown after creating an account.
 *
 * Kept outside the login component so this security-sensitive navigation rule
 * has a small, deterministic regression test.
 */
export function postSignUpDestination(instanceWasUnclaimed: boolean): '/admin' | '/invitations' {
	return instanceWasUnclaimed ? '/admin' : '/invitations';
}
