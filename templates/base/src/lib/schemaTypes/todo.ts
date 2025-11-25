import type { SchemaType } from '@aphexcms/cms-core';
import ListTodo from '@lucide/svelte/icons/list-todo';

export const todo: SchemaType = {
	type: 'document',
	name: 'todo',
	title: 'Todo',
	description: 'A simple todo item',
	icon: ListTodo,
	fields: [
		{
			name: 'title',
			type: 'string',
			title: 'Title',
			description: 'Todo title',
			validation: (Rule) => Rule.required().max(200)
		},
		{
			name: 'description',
			type: 'text',
			title: 'Description',
			description: 'Optional description',
			rows: 3
		},
		{
			name: 'completed',
			type: 'boolean',
			title: 'Completed',
			description: 'Mark as completed',
			initialValue: false
		}
	],
	preview: {
		select: {
			title: 'title',
			subtitle: 'description'
		}
	}
};

export default todo;
