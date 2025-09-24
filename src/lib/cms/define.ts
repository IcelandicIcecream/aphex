// Definition helpers - Pure Sanity-style API
import type {
  Field,
  CMSConfig,
  SchemaType,
  StringField,
  TextField,
  NumberField,
  BooleanField,
  SlugField,
  ImageField,
  ArrayField,
  ObjectField,
  ReferenceField
} from './types.js';

// Field definition helper
export function defineField<T extends Field>(field: T): T {
  return field;
}

// Schema type definition helper
export function defineSchemaType(schemaType: SchemaType): SchemaType {
  return schemaType;
}

// Sanity-style type definition helper (alias for defineSchemaType)
export function defineType(schemaType: SchemaType): SchemaType {
  return schemaType;
}

// Array member definition helper
export function defineArrayMember<T extends Field>(field: T): T {
  return field;
}

// CMS config helper
export function defineCMSConfig(config: CMSConfig): CMSConfig {
  return config;
}

// Sanity-style field creators
export const Fields = {
  string: (config: Omit<StringField, 'type'>): StringField => ({
    type: 'string',
    ...config
  }),

  text: (config: Omit<TextField, 'type'>): TextField => ({
    type: 'text',
    ...config
  }),

  number: (config: Omit<NumberField, 'type'>): NumberField => ({
    type: 'number',
    ...config
  }),

  boolean: (config: Omit<BooleanField, 'type'>): BooleanField => ({
    type: 'boolean',
    ...config
  }),

  slug: (config: Omit<SlugField, 'type'>): SlugField => ({
    type: 'slug',
    ...config
  }),

  image: (config: Omit<ImageField, 'type'>): ImageField => ({
    type: 'image',
    ...config
  }),

  array: (config: Omit<ArrayField, 'type'>): ArrayField => ({
    type: 'array',
    ...config
  }),

  object: (config: Omit<ObjectField, 'type'>): ObjectField => ({
    type: 'object',
    ...config
  }),

  reference: (config: Omit<ReferenceField, 'type'>): ReferenceField => ({
    type: 'reference',
    ...config
  })
} as const;
