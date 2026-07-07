// SQLite filter parser - converts Where filters to Drizzle SQL conditions
// Handles JSON columns (draftData/publishedData) for document fields via json_extract().
// Dialect notes vs the PostgreSQL parser:
// - JSON paths use json_extract(col, '$."a"."b"') instead of ->/->>
// - JSON booleans are stored as 0/1, so boolean filters compare against integers
// - LIKE replaces ILIKE (SQLite's LIKE is case-insensitive for ASCII by default)
// - IN (...) replaces = ANY(...) since SQLite has no ANY/ALL
import {
	SQL,
	sql,
	eq,
	ne,
	gt,
	gte,
	lt,
	lte,
	inArray,
	notInArray,
	like,
	isNull,
	isNotNull,
	and as drizzleAnd,
	or as drizzleOr
} from 'drizzle-orm';
import type { Where, FieldFilter } from '@aphexcms/cms-core/server';

/**
 * JSON columns that contain document data
 * These are NOT accessed as regular columns
 */
const JSON_DATA_COLUMNS = new Set(['draftData', 'publishedData']);

/**
 * Build a SQLite JSON path string from dotted field parts.
 * Each part is quoted so keys with dots/spaces/dashes resolve correctly:
 * ['author', 'name'] -> '$."author"."name"'
 */
function jsonPath(pathParts: string[]): string {
	return '$' + pathParts.map((p) => `."${p.replace(/"/g, '""')}"`).join('');
}

/**
 * Parse a Where clause into Drizzle SQL conditions
 *
 * @param where - The where filter object
 * @param table - The Drizzle table object
 * @param perspective - Which JSON column to query ('draft' or 'published')
 * @returns SQL condition
 *
 * @example
 * ```typescript
 * const condition = parseWhere(
 *   {
 *     status: { equals: 'published' },
 *     title: { contains: 'blog' }
 *   },
 *   documentsTable,
 *   'draft'
 * );
 * ```
 */
export function parseWhere(
	where: Where | undefined,
	table: any, // SQLiteTable type - use any for flexibility
	perspective: 'draft' | 'published' = 'draft'
): SQL | undefined {
	if (!where) {
		return undefined;
	}

	const conditions: SQL[] = [];

	// Handle AND operator
	if (where.and && Array.isArray(where.and)) {
		const andConditions = where.and
			.map((w) => parseWhere(w, table, perspective))
			.filter((c): c is SQL => c !== undefined);
		if (andConditions.length > 0) {
			conditions.push(drizzleAnd(...andConditions)!);
		}
	}

	// Handle OR operator
	if (where.or && Array.isArray(where.or)) {
		const orConditions = where.or
			.map((w) => parseWhere(w, table, perspective))
			.filter((c): c is SQL => c !== undefined);
		if (orConditions.length > 0) {
			conditions.push(drizzleOr(...orConditions)!);
		}
	}

	// Handle field filters
	for (const [field, filter] of Object.entries(where)) {
		// Skip logical operators (already handled above)
		if (field === 'and' || field === 'or') {
			continue;
		}

		// Parse the filter
		const condition = parseFieldFilter(field, filter, table, perspective);
		if (condition) {
			conditions.push(condition);
		}
	}

	// Combine all conditions with AND
	if (conditions.length === 0) {
		return undefined;
	}
	if (conditions.length === 1) {
		return conditions[0];
	}
	return drizzleAnd(...conditions);
}

/**
 * Parse a single field filter into a Drizzle SQL condition
 */
function parseFieldFilter(
	fieldPath: string,
	filter: unknown,
	table: any,
	perspective: 'draft' | 'published'
): SQL | undefined {
	// Handle _meta.* paths - strip _meta prefix to access actual column
	// e.g., '_meta.createdBy' -> 'createdBy'
	let actualFieldPath = fieldPath;
	if (fieldPath.startsWith('_meta.')) {
		actualFieldPath = fieldPath.substring(6); // Remove '_meta.'
	}

	// Determine if this is a top-level column or JSON field
	// Check if the field exists on the table and is not a JSON data column
	const isTopLevelColumn = actualFieldPath in table && !JSON_DATA_COLUMNS.has(actualFieldPath);

	// If filter is a direct value (not an object), treat as equals
	if (filter === null || filter === undefined || typeof filter !== 'object') {
		if (isTopLevelColumn) {
			const column = table[actualFieldPath];
			return column ? eq(column, filter) : undefined;
		} else {
			return buildJsonCondition(fieldPath, 'equals', filter, table, perspective);
		}
	}

	// If it's an array, treat as 'in' operation
	if (Array.isArray(filter)) {
		if (isTopLevelColumn) {
			const column = table[actualFieldPath];
			return column ? inArray(column, filter) : undefined;
		} else {
			return buildJsonCondition(fieldPath, 'in', filter, table, perspective);
		}
	}

	// Otherwise, it should be a FieldFilter object
	const fieldFilter = filter as FieldFilter;
	const conditions: SQL[] = [];

	// Process each operator
	for (const [operator, value] of Object.entries(fieldFilter)) {
		if (value === undefined) continue;

		const condition = isTopLevelColumn
			? buildColumnCondition(actualFieldPath, operator, value, table)
			: buildJsonCondition(fieldPath, operator, value, table, perspective);

		if (condition) {
			conditions.push(condition);
		}
	}

	// Combine all conditions for this field with AND
	if (conditions.length === 0) {
		return undefined;
	}
	if (conditions.length === 1) {
		return conditions[0];
	}
	return drizzleAnd(...conditions);
}

/**
 * Build a condition for a top-level column
 */
function buildColumnCondition(
	fieldPath: string,
	operator: string,
	value: unknown,
	table: any
): SQL | undefined {
	const column = table[fieldPath];
	if (!column) {
		console.warn(`[Filter Parser] Column not found: ${fieldPath}`);
		return undefined;
	}

	switch (operator) {
		case 'equals':
			return eq(column, value);
		case 'not_equals':
			return ne(column, value);
		case 'in':
			return inArray(column, value as any[]);
		case 'not_in':
			return notInArray(column, value as any[]);
		case 'exists':
			return value ? isNotNull(column) : isNull(column);
		case 'greater_than':
			return gt(column, value);
		case 'greater_than_equal':
			return gte(column, value);
		case 'less_than':
			return lt(column, value);
		case 'less_than_equal':
			return lte(column, value);
		case 'like':
			return like(column, value as string);
		case 'contains':
			// SQLite LIKE is case-insensitive for ASCII (parity with Postgres ILIKE)
			return like(column, `%${value}%`);
		case 'starts_with':
			return like(column, `${value}%`);
		case 'ends_with':
			return like(column, `%${value}`);
		default:
			console.warn(`[Filter Parser] Unknown operator: ${operator}`);
			return undefined;
	}
}

/**
 * Build a condition for a field inside a JSON document column
 * Uses SQLite's json_extract()
 */
function buildJsonCondition(
	fieldPath: string,
	operator: string,
	value: unknown,
	table: any,
	perspective: 'draft' | 'published'
): SQL | undefined {
	// Get the JSON column (draftData or publishedData)
	const jsonColumnName = perspective === 'draft' ? 'draftData' : 'publishedData';
	const jsonColumn = table[jsonColumnName];

	if (!jsonColumn) {
		console.warn(`[Filter Parser] JSON column not found: ${jsonColumnName}`);
		return undefined;
	}

	// Split field path for nested access (e.g., 'author.name' -> ['author', 'name'])
	const path = jsonPath(fieldPath.split('.'));

	// json_extract returns SQL NULL for missing keys, native types for JSON
	// scalars (integers for booleans, numbers for numerics, text for strings)
	const extract = sql`json_extract(${jsonColumn}, ${path})`;

	switch (operator) {
		case 'equals':
			if (typeof value === 'boolean') {
				// JSON booleans surface as 0/1 integers
				return sql`${extract} = ${value ? 1 : 0}`;
			}
			return sql`${extract} = ${value}`;

		case 'not_equals':
			if (typeof value === 'boolean') {
				return sql`${extract} != ${value ? 1 : 0}`;
			}
			return sql`${extract} != ${value}`;

		case 'in': {
			// SQLite has no = ANY(...) — expand to IN (...)
			const values = value as unknown[];
			if (!Array.isArray(values) || values.length === 0) {
				return sql`1 = 0`; // nothing can match an empty set
			}
			return sql`${extract} IN (${sql.join(
				values.map((v) => sql`${v}`),
				sql`, `
			)})`;
		}

		case 'not_in': {
			const values = value as unknown[];
			if (!Array.isArray(values) || values.length === 0) {
				return undefined; // != ALL(empty) is always true — no constraint
			}
			return sql`${extract} NOT IN (${sql.join(
				values.map((v) => sql`${v}`),
				sql`, `
			)})`;
		}

		case 'exists':
			// json_extract returns NULL for missing keys (and JSON null — same as pg's -> NULL check)
			if (value) {
				return sql`${extract} IS NOT NULL`;
			} else {
				return sql`${extract} IS NULL`;
			}

		case 'greater_than':
			return sql`CAST(${extract} AS REAL) > ${value}`;

		case 'greater_than_equal':
			return sql`CAST(${extract} AS REAL) >= ${value}`;

		case 'less_than':
			return sql`CAST(${extract} AS REAL) < ${value}`;

		case 'less_than_equal':
			return sql`CAST(${extract} AS REAL) <= ${value}`;

		case 'like':
			return sql`${extract} LIKE ${value}`;

		case 'contains':
			// SQLite LIKE is ASCII case-insensitive (parity with Postgres ILIKE)
			return sql`${extract} LIKE ${'%' + value + '%'}`;

		case 'starts_with':
			return sql`${extract} LIKE ${value + '%'}`;

		case 'ends_with':
			return sql`${extract} LIKE ${'%' + value}`;

		default:
			console.warn(`[Filter Parser] Unknown operator for JSON: ${operator}`);
			return undefined;
	}
}

/**
 * Parse a sort string or array into Drizzle order by clauses
 *
 * @param sort - Sort string or array of sort strings
 *   - Format: 'field' (ascending) or '-field' (descending)
 *   - Example: '-publishedAt' or ['title', '-createdAt']
 * @param table - The Drizzle table object
 * @param perspective - Which JSON column to query for non-column fields
 * @returns Array of SQL order by clauses
 */
export function parseSort(
	sort: string | string[] | undefined,
	table: any,
	perspective: 'draft' | 'published' = 'draft'
): SQL[] {
	if (!sort) {
		return [];
	}

	const sortArray = Array.isArray(sort) ? sort : [sort];
	const orderBy: SQL[] = [];

	for (const sortField of sortArray) {
		const trimmed = sortField.trim();
		if (!trimmed) continue;

		// Check if descending (starts with -)
		const descending = trimmed.startsWith('-');
		const fieldName = descending ? trimmed.substring(1) : trimmed;

		// Handle _meta.* paths - strip _meta prefix
		let actualFieldName = fieldName;
		if (fieldName.startsWith('_meta.')) {
			actualFieldName = fieldName.substring(6);
		}

		// Check if top-level column or JSON field
		const isTopLevelColumn = actualFieldName in table && !JSON_DATA_COLUMNS.has(actualFieldName);

		if (isTopLevelColumn) {
			const column = table[actualFieldName];
			if (column) {
				orderBy.push(descending ? sql`${column} DESC` : sql`${column} ASC`);
			}
		} else {
			// JSON field
			const jsonColumnName = perspective === 'draft' ? 'draftData' : 'publishedData';
			const jsonColumn = table[jsonColumnName];

			if (jsonColumn) {
				const path = jsonPath(fieldName.split('.'));
				const extract = sql`json_extract(${jsonColumn}, ${path})`;
				orderBy.push(descending ? sql`${extract} DESC` : sql`${extract} ASC`);
			}
		}
	}

	return orderBy;
}
