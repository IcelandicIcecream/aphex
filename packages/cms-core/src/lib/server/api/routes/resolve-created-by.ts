import type { AuthProvider } from '../../../auth/provider';

/**
 * Resolves `createdBy` user ids on a list of rows to a display name (or `'API Key'` for a
 * `apikey:<id>` synthetic id — see `authToContext`'s API-key branch). Shared by every
 * read-only history view (`GET /api/events`, `GET /api/agent/change-sets`, ...) — an audit
 * trail whose whole point is accountability needs to show *who*, not a raw id.
 */
export async function withCreatedByNames<T extends { createdBy: string | null }>(
	rows: T[],
	auth: AuthProvider | undefined
): Promise<Array<T & { createdByName: string | null }>> {
	const userIds = [...new Set(rows.map((r) => r.createdBy).filter((id): id is string => !!id))];
	const userMap = new Map<string, string>();

	if (userIds.length > 0 && auth) {
		await Promise.all(
			userIds.map(async (userId) => {
				if (userId.startsWith('apikey:')) {
					userMap.set(userId, 'API Key');
					return;
				}
				try {
					const user = await auth.getUserById(userId);
					if (user) userMap.set(userId, user.name || user.email);
				} catch {
					// User not found — skip
				}
			})
		);
	}

	return rows.map((r) => ({
		...r,
		createdByName: r.createdBy ? (userMap.get(r.createdBy) ?? null) : null
	}));
}
