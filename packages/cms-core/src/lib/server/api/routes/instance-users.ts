import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { deleteInstanceUserRequest } from '../../../api/schemas/instance';
import { eraseAccount, isDeletionBlocked } from '../../../auth/erase';
import { cmsLogger } from '../../../utils/logger';
import type { AphexEnv } from '../index';

/** Accounts across the instance, for super admins (God Mode). */
export const instanceUsersRouter: Hono<AphexEnv> = new Hono<AphexEnv>().delete(
	'/:id',
	zValidator('json', deleteInstanceUserRequest, (result, c) => {
		if (!result.success) {
			return c.json(
				{ success: false, error: 'Invalid request body', issues: result.error.issues },
				400
			);
		}
	}),
	async (c) => {
		const auth = c.var.auth;
		if (!auth || auth.type !== 'session') {
			return c.json({ success: false, error: 'Unauthorized' }, 401);
		}
		const refuse = (status: 400 | 403 | 404, message: string) =>
			c.json({ success: false, error: message, message }, status);
		if (auth.user.role !== 'super_admin') {
			return refuse(403, 'Only super admins can delete accounts');
		}

		const cms = c.var.aphexCMS;
		const id = c.req.param('id');
		if (!cms.auth?.deleteUser) return refuse(404, 'Accounts are managed elsewhere');
		// Their own has a page that asks for the password.
		if (id === auth.user.id) return refuse(400, 'Delete your own account in Account settings');

		const user = await cms.auth.getUserById(id);
		if (!user) return refuse(404, 'Account not found');
		if (c.req.valid('json').email.toLowerCase() !== user.email.toLowerCase()) {
			return refuse(400, 'The address doesn’t match this account');
		}
		const profile = await cms.databaseAdapter.findUserProfileById(id);
		if (profile?.role === 'super_admin') {
			return refuse(403, 'A super admin can only delete their own account');
		}

		try {
			await eraseAccount(cms, user, { actorId: auth.user.id });
			await cms.auth.deleteUser(id);
			return c.json({ success: true });
		} catch (error) {
			if (isDeletionBlocked(error)) {
				return c.json({ success: false, error: error.message, message: error.message }, 409);
			}
			cmsLogger.error('Failed to delete account:', error);
			return c.json({ success: false, error: 'Failed to delete account' }, 500);
		}
	}
);
