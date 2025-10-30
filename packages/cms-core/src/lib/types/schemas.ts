// types/schemas.ts
import type { Rule } from '../field-validation/rule';

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
	| 'reference';

export interface BaseField {
	name: string;
	type: FieldType;
	title: string;
	description?: string;
	validation?: ((rule: Rule) => Rule) | Array<(rule: Rule) => Rule>;
}

export interface StringField extends BaseField {
	type: 'string';
	maxLength?: number;
	placeholder?: string;
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
	type: string; // References a SchemaType by name
	title?: string;
}

export interface ArrayField extends BaseField {
	type: 'array';
	of: TypeReference[];
	max?: number;
}

export interface ObjectField extends BaseField {
	type: 'object';
	fields: Field[];
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
	fields: Field[];
	preview?: PreviewConfig;
	createdAt?: Date | null;
	updatedAt?: Date | null;
}
