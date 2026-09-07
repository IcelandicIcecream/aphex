import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { authService } from '$lib/server/auth';
import { ApiKeyRevocationError } from '@aphexcms/auth';
import { hasCapability } from '@aphexcms/cms-core';

// DELETE - Delete an API key
export const DELETE: RequestHandler = async ({ params, locals }) => {
	if (!locals.auth || locals.auth.type !== 'session') {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const session = locals.auth;

	try {
		// The same gate as creating a key (POST /api/settings/api-keys), for the same reason:
		// issuing and revoking are two halves of one permission. This previously read the
		// org role directly and allowed `owner | admin | editor`, which drifted from the
		// capability in both directions — `editor` doesn't hold `apiKey.manage` and could
		// nonetheless delete keys, while a custom role that *was* granted `apiKey.manage`
		// could create keys it then couldn't revoke.
		if (!hasCapability(session, 'apiKey.manage')) {
			return json(
				{
					error: 'Forbidden',
					message: 'You do not have permission to delete API keys'
				},
				{ status: 403 }
			);
		}

		const { id } = params;

		if (!id) {
			return json({ error: 'ID not found in params' }, { status: 400 });
		}

		// Through the service rather than better-auth directly: it scopes the
		// delete to the calling user, so a key id from another account can't be
		// removed by guessing it.
		const deleted = await authService.deleteApiKey(session.user.id, id);

		if (deleted) {
			return json({ success: true });
		}

		return json({ error: 'Failed to delete API key' }, { status: 500 });
	} catch (error) {
		// Revocation that half-succeeded: the row is gone but the cached copy survived, so
		// the key may still authenticate. Reported distinctly and verbatim — "failed to
		// delete" would imply the key is untouched and still revocable by trying again,
		// when in fact it needs a cache flush.
		if (error instanceof ApiKeyRevocationError) {
			console.error('Incomplete API key revocation:', error);
			return json({ error: 'Revocation incomplete', message: error.message }, { status: 500 });
		}
		console.error('Error deleting API key:', error);
		return json({ error: 'Failed to delete API key' }, { status: 500 });
	}
};
