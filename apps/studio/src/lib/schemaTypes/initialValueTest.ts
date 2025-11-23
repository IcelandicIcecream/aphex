import type { DocumentType } from '@aphexcms/cms-core/types/schemas';
import { FileText } from 'lucide-svelte';
import { currentDate, currentDateTime, dateFromToday, firstDayOfMonth } from '@aphexcms/cms-core';

export const initialValueTest: DocumentType = {
	type: 'document',
	name: 'initialValueTest',
	title: 'Initial Value Test',
	description: 'Test document for all field types with initialValue support',
	icon: FileText,
	fields: [
		// String field with literal initialValue
		{
			name: 'stringLiteral',
			type: 'string',
			title: 'String (Literal)',
			description: 'Should default to "Hello World"',
			initialValue: 'Hello World'
		},
		// String field with function initialValue
		{
			name: 'stringFunction',
			type: 'string',
			title: 'String (Function)',
			description: 'Should default to current timestamp',
			initialValue: () => `Created at ${new Date().toLocaleString()}`
		},
		// String field with async function initialValue
		{
			name: 'stringAsync',
			type: 'string',
			title: 'String (Async Function)',
			description: 'Should default to delayed greeting',
			initialValue: async () => {
				await new Promise((resolve) => setTimeout(resolve, 100));
				return 'Async greeting!';
			}
		},
		// Text field with literal initialValue
		{
			name: 'textLiteral',
			type: 'text',
			title: 'Text (Literal)',
			description: 'Should default to multi-line text',
			initialValue: 'This is a long text field.\nWith multiple lines.\nFor testing purposes.'
		},
		// Text field with function initialValue
		{
			name: 'textFunction',
			type: 'text',
			title: 'Text (Function)',
			description: 'Should default to generated content',
			initialValue: () =>
				`Generated on:\n${new Date().toISOString()}\n\nEdit this content as needed.`
		},
		// Number field with literal initialValue
		{
			name: 'numberLiteral',
			type: 'number',
			title: 'Number (Literal)',
			description: 'Should default to 42',
			initialValue: 42
		},
		// Number field with function initialValue
		{
			name: 'numberFunction',
			type: 'number',
			title: 'Number (Function)',
			description: 'Should default to random number',
			initialValue: () => Math.floor(Math.random() * 100)
		},
		// Boolean field with literal initialValue (true)
		{
			name: 'booleanTrue',
			type: 'boolean',
			title: 'Boolean (True)',
			description: 'Should default to checked',
			initialValue: true
		},
		// Boolean field with literal initialValue (false)
		{
			name: 'booleanFalse',
			type: 'boolean',
			title: 'Boolean (False)',
			description: 'Should default to unchecked',
			initialValue: false
		},
		// Boolean field with function initialValue
		{
			name: 'booleanFunction',
			type: 'boolean',
			title: 'Boolean (Function)',
			description: 'Should default to random boolean',
			initialValue: () => Math.random() > 0.5
		},
		// Slug field with literal initialValue
		{
			name: 'slugLiteral',
			type: 'slug',
			title: 'Slug (Literal)',
			description: 'Should default to "test-slug"',
			source: 'stringLiteral',
			initialValue: 'test-slug'
		},
		// URL field with literal initialValue
		{
			name: 'urlLiteral',
			type: 'url',
			title: 'URL (Literal)',
			description: 'Should default to example.com',
			initialValue: 'https://example.com'
		},
		// URL field with function initialValue
		{
			name: 'urlFunction',
			type: 'url',
			title: 'URL (Function)',
			description: 'Should default to timestamped URL',
			initialValue: () => `https://example.com?created=${Date.now()}`
		},
		// Date field with literal initialValue
		{
			name: 'dateLiteral',
			type: 'date',
			title: 'Date (Literal)',
			description: 'Should default to 2024-01-01',
			initialValue: '2024-01-01'
		},
		// Date field with function initialValue
		{
			name: 'dateFunction',
			type: 'date',
			title: 'Date (Function)',
			description: 'Should default to today',
			initialValue: currentDate
		},
		// Date field with dateFromToday helper
		{
			name: 'dateFuture',
			type: 'date',
			title: 'Date (7 days from now)',
			description: 'Should default to 7 days from today',
			initialValue: () => dateFromToday(7)
		},
		// Date field with firstDayOfMonth helper
		{
			name: 'dateFirstOfMonth',
			type: 'date',
			title: 'Date (First of Month)',
			description: 'Should default to first day of current month',
			initialValue: firstDayOfMonth
		},
		// DateTime field with literal initialValue
		{
			name: 'datetimeLiteral',
			type: 'datetime',
			title: 'DateTime (Literal)',
			description: 'Should default to specific datetime',
			initialValue: '2024-01-01T12:00:00Z'
		},
		// DateTime field with function initialValue
		{
			name: 'datetimeFunction',
			type: 'datetime',
			title: 'DateTime (Function)',
			description: 'Should default to current datetime',
			initialValue: currentDateTime
		},
		// Array field with literal initialValue
		{
			name: 'arrayLiteral',
			type: 'array',
			title: 'Array (Literal)',
			description: 'Should default to array with 2 items',
			of: [
				{
					type: 'object',
					name: 'arrayItem',
					fields: [
						{
							name: 'text',
							type: 'string',
							title: 'Text'
						}
					]
				}
			],
			initialValue: [
				{ _type: 'arrayItem', text: 'First item' },
				{ _type: 'arrayItem', text: 'Second item' }
			]
		},
		// Array field with function initialValue
		{
			name: 'arrayFunction',
			type: 'array',
			title: 'Array (Function)',
			description: 'Should default to generated array',
			of: [
				{
					type: 'object',
					name: 'generatedItem',
					fields: [
						{
							name: 'label',
							type: 'string',
							title: 'Label'
						},
						{
							name: 'timestamp',
							type: 'string',
							title: 'Timestamp'
						}
					]
				}
			],
			initialValue: () => [
				{
					_type: 'generatedItem',
					label: 'Generated item',
					timestamp: new Date().toISOString()
				}
			]
		},
		// Object field with literal initialValue
		{
			name: 'objectLiteral',
			type: 'object',
			title: 'Object (Literal)',
			description: 'Should default to pre-filled object',
			fields: [
				{
					name: 'name',
					type: 'string',
					title: 'Name'
				},
				{
					name: 'email',
					type: 'string',
					title: 'Email'
				},
				{
					name: 'active',
					type: 'boolean',
					title: 'Active'
				}
			],
			initialValue: {
				name: 'John Doe',
				email: 'john@example.com',
				active: true
			}
		},
		// Object field with function initialValue
		{
			name: 'objectFunction',
			type: 'object',
			title: 'Object (Function)',
			description: 'Should default to generated object',
			fields: [
				{
					name: 'itemId',
					type: 'string',
					title: 'Item ID'
				},
				{
					name: 'timestamp',
					type: 'string',
					title: 'Timestamp'
				}
			],
			initialValue: () => ({
				itemId: Math.random().toString(36).substring(7),
				timestamp: new Date().toISOString()
			})
		},
		// Nested objects with initialValues
		{
			name: 'arrayOfObjectsWithInitialValues',
			type: 'array',
			title: 'Array of Objects (Nested initialValues)',
			description: 'Items should have initialValues when added',
			of: [
				{
					type: 'object',
					name: 'nestedItem',
					fields: [
						{
							name: 'title',
							type: 'string',
							title: 'Title',
							initialValue: 'New Item'
						},
						{
							name: 'priority',
							type: 'number',
							title: 'Priority',
							initialValue: 1
						},
						{
							name: 'enabled',
							type: 'boolean',
							title: 'Enabled',
							initialValue: true
						},
						{
							name: 'timestamp',
							type: 'string',
							title: 'Timestamp',
							initialValue: () => new Date().toISOString()
						}
					]
				}
			]
		}
	],
	preview: {
		select: {
			title: 'stringLiteral',
			subtitle: 'stringFunction'
		}
	}
};
