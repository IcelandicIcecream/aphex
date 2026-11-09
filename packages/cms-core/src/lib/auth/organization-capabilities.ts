import type { DatabaseAdapter } from '../db/index';
import type { OrganizationCapabilities } from '../types/config';
import { cmsLogger } from '../utils/logger';

/**
 * The organization capabilities this organization has, out of the declared `ids`. A
 * resolver that throws grants none, the safe side for a paid feature, and an id it
 * returns that wasn't declared is ignored: undeclared, roles could grant it too.
 */
export async function grantedOrganizationCapabilities(
	declared: OrganizationCapabilities,
	organizationId: string,
	databaseAdapter: DatabaseAdapter
): Promise<string[]> {
	let granted: readonly string[];
	try {
		granted = await declared.resolve({ organizationId, databaseAdapter });
	} catch (error) {
		cmsLogger.error(
			'[CMS]',
			`organizationCapabilities.resolve failed for ${organizationId}, so it has none of them:`,
			error
		);
		return [];
	}
	const known = new Set(declared.ids);
	const undeclared = granted.filter((id) => !known.has(id));
	if (undeclared.length > 0) {
		cmsLogger.warn(
			'[CMS]',
			`organizationCapabilities.resolve returned ${undeclared.join(', ')}, which aren't in its ids, so they're ignored.`
		);
	}
	return [...new Set(granted.filter((id) => known.has(id)))];
}

/**
 * A role's or key's capabilities with the organization ones swapped for what the
 * organization has. Removing them first is what stops a role (which an organization's
 * own admin can edit) or a key from granting a feature the organization doesn't have.
 */
export function withOrganizationCapabilities(
	capabilities: Iterable<string>,
	declared: OrganizationCapabilities,
	granted: readonly string[]
): string[] {
	const reserved = new Set(declared.ids);
	return [...[...capabilities].filter((id) => !reserved.has(id)), ...granted];
}
