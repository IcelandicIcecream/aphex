// Nobody hands out more than they hold: the one rule behind inviting into a role,
// moving a member to one, and writing one.
import { isInstanceRole, normalizeCapabilities, resolveCapabilities } from '../types/capabilities';
import type { SessionAuth } from '../types/auth';

/** Whether `auth` may give someone these capabilities. Owners and instance admins may give any. */
export function canGrantCapabilities(auth: SessionAuth, capabilities: readonly string[]): boolean {
	if (auth.organizationRole === 'owner' || isInstanceRole(auth)) return true;
	const held = resolveCapabilities(auth);
	return normalizeCapabilities(capabilities).every((capability) => held.has(capability));
}

export const CANNOT_GRANT = {
	success: false,
	error: 'Forbidden',
	message: 'This role allows more than yours does. Ask an owner.'
};
