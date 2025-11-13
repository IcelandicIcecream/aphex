// PostgreSQL filter parser - converts Where filters to Drizzle SQL conditions
// Handles JSONB columns (draftData/publishedData) for document fields
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
	ilike,
	isNull,
	isNotNull,
	and as drizzleAnd,
	or as drizzleOr
} from 'drizzle-orm';
import type { Where, FieldFilter } from '@aphexcms/cms-core/server';

/**
 * JSONB columns that contain document data
 * These are NOT accessed as regular columns
 */
const JSONB_DATA_COLUMNS = new Set(['draftData', 'publishedData']);

/**
 * Parse a Where clause into Drizzle SQL conditions
 *
 * @param where - The where filter object
 * @param table - The Drizzle table object
 * @param perspective - Which JSONB column to query ('draft' or 'published')
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
	table: any, // PgTable type - use any for flexibility
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

	// Determine if this is a top-level column or JSONB field
	// Check if the field exists on the table and is not a JSONB data column
	const isTopLevelColumn =
		actualFieldPath in table && !JSONB_DATA_COLUMNS.has(actualFieldPath);

	// If filter is a direct value (not an object), treat as equals
	if (filter === null || filter === undefined || typeof filter !== 'object') {
		if (isTopLevelColumn) {
			const column = table[actualFieldPath];
			return column ? eq(column, filter) : undefined;
		} else {
			return buildJsonbCondition(fieldPath, 'equals', filter, table, perspective);
		}
	}

	// If it's an array, treat as 'in' operation
	if (Array.isArray(filter)) {
		if (isTopLevelColumn) {
			const column = table[actualFieldPath];
			return column ? inArray(column, filter) : undefined;
		} else {
			return buildJsonbCondition(fieldPath, 'in', filter, table, perspective);
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
			: buildJsonbCondition(fieldPath, operator, value, table, perspective);

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
			return ilike(column, `%${value}%`);
		case 'starts_with':
			return ilike(column, `${value}%`);
		case 'ends_with':
			return ilike(column, `%${value}`);
		default:
			console.warn(`[Filter Parser] Unknown operator: ${operator}`);
			return undefined;
	}
}

/**
 * Build a condition for a JSONB field
 * Uses PostgreSQL JSONB operators
 */
function buildJsonbCondition(
	fieldPath: string,
	operator: string,
	value: unknown,
	table: any,
	perspective: 'draft' | 'published'
): SQL | undefined {
	// Get the JSONB column (draftData or publishedData)
	const jsonbColumnName = perspective === 'draft' ? 'draftData' : 'publishedData';
	const jsonbColumn = table[jsonbColumnName];

	if (!jsonbColumn) {
		console.warn(`[Filter Parser] JSONB column not found: ${jsonbColumnName}`);
		return undefined;
	}

	// Split field path for nested access (e.g., 'author.name' -> ['author', 'name'])
	const pathParts = fieldPath.split('.');

	// Build JSONB path: draftData->'author'->>'name' or draftData->>'title'
	// -> returns JSONB, ->> returns text
	const buildPath = (asText: boolean = true) => {
		if (pathParts.length === 1) {
			// Simple field: draftData->>'title'
			return asText
				? sql`${jsonbColumn}->>${pathParts[0]}`
				: sql`${jsonbColumn}->${pathParts[0]}`;
		} else {
			// Nested field: draftData->'author'->>'name'
			const allButLast = pathParts.slice(0, -1);
			const last = pathParts[pathParts.length - 1];

			let pathSql: SQL = jsonbColumn;
			for (const part of allButLast) {
				pathSql = sql`${pathSql}->${part}`;
			}

			return asText ? sql`${pathSql}->>${last}` : sql`${pathSql}->${last}`;
		}
	};

	switch (operator) {
		case 'equals':
			// For JSONB, handle different types appropriately
			if (typeof value === 'boolean') {
				// Cast JSONB text to boolean for comparison
				return sql`(${buildPath(true)})::boolean = ${value}`;
			} else if (typeof value === 'number') {
				// Cast JSONB text to numeric for comparison
				return sql`(${buildPath(true)})::numeric = ${value}`;
			} else {
				// Text comparison (default)
				return sql`${buildPath(true)} = ${value}`;
			}

		case 'not_equals':
			// Handle different types for not_equals too
			if (typeof value === 'boolean') {
				return sql`(${buildPath(true)})::boolean != ${value}`;
			} else if (typeof value === 'number') {
				return sql`(${buildPath(true)})::numeric != ${value}`;
			} else {
				return sql`${buildPath(true)} != ${value}`;
			}

		case 'in':
			// Check if JSONB value is in array
			return sql`${buildPath(true)} = ANY(${value})`;

		case 'not_in':
			return sql`${buildPath(true)} != ALL(${value})`;

		case 'exists':
			// Check if JSONB key exists
			if (value) {
				return sql`${buildPath(false)} IS NOT NULL`;
			} else {
				return sql`${buildPath(false)} IS NULL`;
			}

		case 'greater_than':
			// Cast to appropriate type for comparison
			return sql`(${buildPath(true)})::numeric > ${value}`;

		case 'greater_than_equal':
			return sql`(${buildPath(true)})::numeric >= ${value}`;

		case 'less_than':
			return sql`(${buildPath(true)})::numeric < ${value}`;

		case 'less_than_equal':
			return sql`(${buildPath(true)})::numeric <= ${value}`;

		case 'like':
			return sql`${buildPath(true)} LIKE ${value}`;

		case 'contains':
			// Case-insensitive contains
			return sql`${buildPath(true)} ILIKE ${'%' + value + '%'}`;

		case 'starts_with':
			return sql`${buildPath(true)} ILIKE ${value + '%'}`;

		case 'ends_with':
			return sql`${buildPath(true)} ILIKE ${'%' + value}`;

		default:
			console.warn(`[Filter Parser] Unknown operator for JSONB: ${operator}`);
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
 * @param perspective - Which JSONB column to query for non-column fields
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

		// Check if top-level column or JSONB field
		const isTopLevelColumn =
			actualFieldName in table && !JSONB_DATA_COLUMNS.has(actualFieldName);

		if (isTopLevelColumn) {
			const column = table[actualFieldName];
			if (column) {
				orderBy.push(descending ? sql`${column} DESC` : sql`${column} ASC`);
			}
		} else {
			// JSONB field
			const jsonbColumnName = perspective === 'draft' ? 'draftData' : 'publishedData';
			const jsonbColumn = table[jsonbColumnName];

			if (jsonbColumn) {
				const pathParts = fieldName.split('.');
				let pathSql: SQL = jsonbColumn;

				// Build path
				for (let i = 0; i < pathParts.length - 1; i++) {
					pathSql = sql`${pathSql}->${pathParts[i]}`;
				}
				const finalPath = sql`${pathSql}->>${pathParts[pathParts.length - 1]}`;

				orderBy.push(descending ? sql`${finalPath} DESC` : sql`${finalPath} ASC`);
			}
		}
	}

	return orderBy;
}
