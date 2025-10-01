import { getContext, setContext } from 'svelte';
const SCHEMA_CONTEXT_KEY = Symbol('aphex-schemas');
/**
 * Provides schemas to child components via Svelte context
 */
export function setSchemaContext(schemas) {
    setContext(SCHEMA_CONTEXT_KEY, schemas);
}
/**
 * Gets schemas from Svelte context
 */
export function getSchemaContext() {
    const schemas = getContext(SCHEMA_CONTEXT_KEY);
    if (!schemas) {
        throw new Error('Schema context not found. Make sure to call setSchemaContext() in a parent component.');
    }
    return schemas;
}
