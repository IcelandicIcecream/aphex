// types/schemas.ts
import type { Rule } from '../field-validation/rule';
import type { Icon as LucideIcon } from 'lucide-svelte';

// From root types.ts
export type FieldType =
	| 'string'
	| 'text'
	| 'number'
	| 'boolean'
	| 'slug'
	| 'image'
	| 'array'
	| 'object'
	| 'reference'
	| 'date';

export interface BaseField {
	name: string;
	type: FieldType;
	title: string;
	description?: string;
	validation?: ((rule: Rule) => Rule) | Array<(rule: Rule) => Rule>;
}

export interface DependentList {
	dependsOn: string;
	options: Record<string, Array<string | { title: string; value: string }>>;
}

export interface StringField extends BaseField {
	type: 'string';
	maxLength?: number;
	placeholder?: string;
	initialValue?: string;
	list?: Array<string | { title: string; value: string }> | DependentList;
	options?: {
		layout?: 'dropdown' | 'radio';
		direction?: 'horizontal' | 'vertical';
	};
}

export interface TextField extends BaseField {
	type: 'text';
	rows?: number;
	maxLength?: number;
	placeholder?: string;
}

export interface NumberField extends BaseField {
	type: 'number';
	min?: number;
	max?: number;
}

export interface BooleanField extends BaseField {
	type: 'boolean';
	initialValue?: boolean;
}

export interface SlugField extends BaseField {
	type: 'slug';
	source?: string;
	maxLength?: number;
}

export interface ImageField extends BaseField {
	type: 'image';
	accept?: string;
	hotspot?: boolean; // Enable hotspot/crop UI
	metadata?: string[]; // e.g., ['palette', 'exif', 'location']
	fields?: Field[]; // Additional fields like caption, attribution
	private?: boolean; // Default: false (public). Set true to require auth for access
}

export interface TypeReference {
	type: string; // References a SchemaType by name or inline type definition
	title?: string;
	name?: string; // For inline objects
	fields?: Field[]; // For inline object definitions (like Sanity)
}

export interface ArrayField extends BaseField {
	type: 'array';
	of: TypeReference[];
}

export interface ObjectField extends BaseField {
	type: 'object';
	fields: Field[];
}

export interface DateField extends BaseField {
	type: 'date';
	options?: {
		dateFormat?: string; // Default: 'YYYY-MM-DD' (Moment.js format)
		calendarTodayLabel?: string; // Label for "today" button
	};
}

export interface ReferenceField extends BaseField {
	type: 'reference';
	to: Array<{ type: string }>;
}

export type Field =
	| StringField
	| TextField
	| NumberField
	| BooleanField
	| SlugField
	| ImageField
	| ArrayField
	| ObjectField
	| DateField
	| ReferenceField;

export interface PreviewConfig {
	select?: {
		title?: string;
		subtitle?: string;
		media?: string;
	};
}

export interface DocumentType {
	id: string;
	type: 'document';
	name: string;
	title: string;
	description?: string;
	icon?: typeof LucideIcon;
	fields: Field[];
	preview?: PreviewConfig;
	createdAt: Date | null;
	updatedAt: Date | null;
}

export interface ObjectType {
	type: 'object';
	name: string;
	title: string;
	description?: string;
	icon?: typeof LucideIcon;
	fields: Field[];
	preview?: PreviewConfig;
}

// From db/types.ts
/**
 * Schema type - represents document and object type definitions stored in the DB
 */
// Schema type for all definitions
export interface SchemaType {
	id?: string;
	type: 'document' | 'object';
	name: string;
	title: string;
	description?: string;
	icon?: typeof LucideIcon;
	fields: Field[];
	preview?: PreviewConfig;
	createdAt?: Date | null;
	updatedAt?: Date | null;
}

export interface NewSchemaType {
	id?: string;
	type: 'document' | 'object';
	name: string;
	title: string;
	description?: string;
	icon?: typeof LucideIcon;
	fields: Field[];
	preview?: PreviewConfig;
	createdAt?: Date | null;
	updatedAt?: Date | null;
}
