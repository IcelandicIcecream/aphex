// Field-level access helpers.
//
// Applied on top of document-level SchemaAccess (which already decided whether
// the caller can touch the collection at all). These helpers are the gate
// between "has read/update on the collection" and "has read/update on this
// specific field".

import type { Field, SchemaType } from './types/schemas';
import type { Auth } from './types/auth';
import { effectiveOrganizationRole, isInstanceRole } from './types/capabilities';

/**
 * Return the set of field names the caller may NOT read.
 * Fields with no `access.read` list are readable by default.
 */
export function hiddenReadFields(schema: SchemaType, auth: Auth | undefined): Set<string> {
	const hidden = new Set<string>();
	if (!auth) return hidden;
	if (isInstanceRole(auth)) return hidden;
	const role = effectiveOrganizationRole(auth);
	for (const field of schema.fields) {
		const list = field.access?.read;
		if (!list) continue;
		if (!role || !list.includes(role)) hidden.add(field.name);
	}
	return hidden;
}

/**
 * Return the set of field names the caller may NOT write.
 * Fields with no `access.update` list are writable by default.
 */
export function hiddenWriteFields(schema: SchemaType, auth: Auth | undefined): Set<string> {
	const hidden = new Set<string>();
	if (!auth) return hidden;
	if (isInstanceRole(auth)) return hidden;
	const role = effectiveOrganizationRole(auth);
	for (const field of schema.fields) {
		const list = field.access?.update;
		if (!list) continue;
		if (!role || !list.includes(role)) hidden.add(field.name);
	}
	return hidden;
}

/**
 * Strip read-hidden fields from a document payload shape in place.
 * Safe to call on undefined / non-object values (returns the input).
 */
export function stripHiddenFields<T extends Record<string, unknown>>(
	data: T | null | undefined,
	hidden: ReadonlySet<string>
): T | null | undefined {
	if (!data || typeof data !== 'object' || hidden.size === 0) return data;
	const copy: Record<string, unknown> = { ...data };
	for (const name of hidden) delete copy[name];
	return copy as T;
}

/**
 * Remove write-locked fields from incoming mutation data. Prevents a caller
 * with collection-level update from silently overwriting fields the schema
 * protects at the field level.
 */
export function dropLockedWrites<T extends Record<string, unknown>>(
	data: T,
	locked: ReadonlySet<string>
): T {
	if (locked.size === 0) return data;
	const copy: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(data)) {
		if (locked.has(key)) continue;
		copy[key] = value;
	}
	return copy as T;
}

/**
 * Extract the raw field definitions for reading (not mutating).
 * Kept separate from hiddenReadFields so callers can iterate fields directly
 * when they need richer context than the name set.
 */
export function fieldByName(schema: SchemaType, name: string): Field | undefined {
	return schema.fields.find((f) => f.name === name);
}
