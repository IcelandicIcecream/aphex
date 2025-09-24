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

// Base field interface (Sanity-style)
export interface BaseField {
  name: string;
  type: FieldType;
  title: string;
  description?: string;
  validation?: (rule: Rule) => Rule;
}

// Simplified field types (Sanity-compatible)
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

// Type reference for array items (Sanity-style)
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
  type: string; // Document type name (e.g., 'page', 'post')
  data: Record<string, any>; // TODO: EVENTUALLY CHANGE TO SOME GENERICS
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
