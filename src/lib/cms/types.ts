// Core CMS Types - Sanity-compatible MVP
import type { Rule } from '../validation/Rule.js';

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

// Union of all field types
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

// Document type definition (Sanity-style)
export interface DocumentType {
  type: 'document';
  name: string;
  title: string;
  description?: string;
  fields: Field[];
}

// Object type definition (reusable objects)
export interface ObjectType {
  type: 'object';
  name: string;
  title: string;
  description?: string;
  fields: Field[];
}

// Schema type for all definitions
export interface SchemaType {
  type: 'document' | 'object';
  name: string;
  title: string;
  description?: string;
  fields: Field[];
}

// Runtime data structures (Sanity-compatible)
export interface Document {
  id: string;
  type: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- // TODO: EVENTUALLY CHANGE TO SOME GENERICS
  data: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

// CMS Configuration (simplified for MVP)
export interface CMSConfig {
  schemaTypes: SchemaType[];
  database: {
    url: string;
  };
  media?: {
    uploadDir: string;
    maxFileSize: number;
  };
}
