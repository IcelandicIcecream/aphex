import { authToContext } from '@aphexcms/cms-core/local-api/auth-helpers';
import { error, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import type { FindResult } from '@aphexcms/cms-core';
import type { Todo } from '$lib/generated-types';

export const load: PageServerLoad = async ({ locals }) => {
	try {
		// Get Local API from the singleton (initialized in hooks)
		const { localAPI, databaseAdapter } = locals.aphexCMS;

		// Get organization by slug
		const organization = await databaseAdapter.findOrganizationBySlug('default');

		if (!organization) {
			return error(404, {
				message: "Organization doesn't exist"
			});
		}

		// Check if user is logged in (auth is now populated by handleAuthHook for all routes)
		const auth = locals.auth;
		let context;
		let isLoggedIn = false;
		let userRole = null;
		let userName = null;
		let result: FindResult<Todo> | null = null

		if (auth && auth.type == "session") {
			// User is logged in - use auth helper to create context
			isLoggedIn = true;
			userRole = auth.user.role;
			userName = auth.user.name || auth.user.email;
			context = authToContext(auth);

			result = await localAPI.collections.todo?.find(context, {
				limit: 100,
				depth: 1,
				perspective: 'draft',
			});
		}

		return {
			todos: result?.docs || [],
			isLoggedIn,
			userRole,
			userName
		};
	} catch (err) {
		console.error('Failed to fetch todos:', err);
		return {
			todos: [],
			isLoggedIn: false,
			userRole: null,
			userName: null
		};
	}
};

export const actions: Actions = {
	createTodo: async ({ request, locals }) => {
		const { localAPI } = locals.aphexCMS;
		const data = await request.formData();
		const title = data.get('title')?.toString();
		const description = data.get('description')?.toString();

		if (!title) {
			return fail(400, { error: 'Title is required' });
		}

		// Check if user is logged in
		const auth = locals.auth;
		if (!auth) {
			return fail(401, { error: 'You must be logged in to create todos' });
		}

		try {
			const context = authToContext(auth);

			// Create the todo
			await localAPI.collections.todo?.create(context, {
				title,
				description: description || '',
				completed: false
			});

			return { success: true, action: 'create' };
		} catch (err) {
			console.error('Failed to create todo:', err);
			return fail(500, { error: 'Failed to create todo' });
		}
	},
	toggleComplete: async ({ request, locals }) => {
		const { localAPI } = locals.aphexCMS;
		const data = await request.formData();
		const todoId = data.get('id')?.toString();
		const completed = data.get('completed') === 'true';

		if (!todoId) {
			return fail(400, { error: 'Todo ID is required' });
		}

		// Check if user is logged in
		const auth = locals.auth;
		if (!auth) {
			return fail(401, { error: 'You must be logged in to update todos' });
		}

		try {
			const context = authToContext(auth);

			// First fetch the existing todo to get all data
			const existingTodo = await localAPI.collections.todo?.findByID(context, todoId);

			if (!existingTodo) {
				return fail(404, { error: 'Todo not found' });
			}

			// Update with all existing data plus the new completed status
			await localAPI.collections.todo?.update(
				context,
				todoId,
				{
					title: existingTodo.title,
					description: existingTodo.description,
					completed: !completed
				},
				{ publish: false }
			);

			return { success: true };
		} catch (err) {
			console.error('Failed to toggle todo:', err);
			return fail(500, { error: 'Failed to update todo' });
		}
	},
	updateTodo: async ({ request, locals }) => {
		const { localAPI } = locals.aphexCMS;
		const data = await request.formData();
		const todoId = data.get('id')?.toString();
		const title = data.get('title')?.toString();
		const description = data.get('description')?.toString();

		if (!todoId || !title) {
			return fail(400, { error: 'Todo ID and title are required' });
		}

		// Check if user is logged in
		const auth = locals.auth;
		if (!auth) {
			return fail(401, { error: 'You must be logged in to update todos' });
		}

		try {
			const context = authToContext(auth);

			// Fetch existing todo to get completed status
			const existingTodo = await localAPI.collections.todo?.findByID(context, todoId);

			if (!existingTodo) {
				return fail(404, { error: 'Todo not found' });
			}

			// Update the todo with all data
			await localAPI.collections.todo?.update(
				context,
				todoId,
				{
					title,
					description: description || '',
					completed: existingTodo.completed
				},
				{ publish: false }
			);

			return { success: true, action: 'update' };
		} catch (err) {
			console.error('Failed to update todo:', err);
			return fail(500, { error: 'Failed to update todo' });
		}
	},
	deleteTodo: async ({ request, locals }) => {
		const { localAPI } = locals.aphexCMS;
		const data = await request.formData();
		const todoId = data.get('id')?.toString();

		if (!todoId) {
			return fail(400, { error: 'Todo ID is required' });
		}

		// Check if user is logged in
		const auth = locals.auth;
		if (!auth) {
			return fail(401, { error: 'You must be logged in to delete todos' });
		}

		try {
			const context = authToContext(auth);

			// Delete the todo
			await localAPI.collections.todo?.delete(context, todoId);

			return { success: true, action: 'delete' };
		} catch (err) {
			console.error('Failed to delete todo:', err);
			return fail(500, { error: 'Failed to delete todo' });
		}
	}
};
