import { getContext, setContext } from 'svelte';
import type { SchemaType } from './types/index.js';

const SCHEMA_CONTEXT_KEY = Symbol('aphex-schemas');

/**
 * Provides schemas to child components via Svelte context
 */
export function setSchemaContext(schemas: SchemaType[]) {
	setContext(SCHEMA_CONTEXT_KEY, schemas);
}

/**
 * Gets schemas from Svelte context
 */
export function getSchemaContext(): SchemaType[] {
	const schemas = getContext<SchemaType[]>(SCHEMA_CONTEXT_KEY);
	if (!schemas) {
		throw new Error(
			'Schema context not found. Make sure to call setSchemaContext() in a parent component.'
		);
	}
	return schemas;
}
