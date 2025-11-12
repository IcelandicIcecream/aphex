// types/filters.ts
//
// Database-agnostic filter types for the unified Local API
// These interfaces define the contract that all database adapters must implement

/**
 * Valid filter value types
 */
export type FilterValue = string | number | boolean | Date | null;

/**
 * Field filter operators with type-safe constraints
 * Each adapter will parse these into their specific query language
 */
export interface FieldFilter<T = unknown> {
	// Comparison operators (work with any type)
	equals?: T;
	not_equals?: T;
	in?: T[];
	not_in?: T[];

	// Existence check
	exists?: boolean;

	// Numeric/Date comparisons only
	greater_than?: T extends number | Date ? T : number | Date;
	greater_than_equal?: T extends number | Date ? T : number | Date;
	less_than?: T extends number | Date ? T : number | Date;
	less_than_equal?: T extends number | Date ? T : number | Date;

	// String operations only
	like?: T extends string ? string : string;
	contains?: T extends string ? string : string;
	starts_with?: T extends string ? string : string;
	ends_with?: T extends string ? string : string;
}

/**
 * WHERE clause for filtering (database-agnostic)
 * Each adapter will parse this into their specific query language
 *
 * Examples:
 * ```typescript
 * // Simple field filters
 * { title: { contains: 'blog' } }
 * { status: { equals: 'published' } }
 *
 * // Multiple conditions (implicit AND)
 * {
 *   status: { equals: 'published' },
 *   publishedAt: { greater_than: new Date('2024-01-01') }
 * }
 *
 * // Nested OR logic
 * {
 *   status: { equals: 'published' },
 *   or: [
 *     { 'author.name': { equals: 'John' } },
 *     { 'author.name': { equals: 'Jane' } }
 *   ]
 * }
 *
 * // Nested AND logic
 * {
 *   and: [
 *     { 'seo.title': { contains: 'blog' } },
 *     { content: { exists: true } }
 *   ]
 * }
 * ```
 */
export interface Where<T = unknown> {
	// Nested logical operators
	and?: Where<T>[];
	or?: Where<T>[];

	// Field filters - using index signature for dynamic field names
	// When T is provided, this will be overridden by WhereTyped<T> in FindOptions
	[field: string]: FieldFilter<unknown> | FilterValue | FieldFilter<unknown>[] | Where<T>[] | undefined;
}

/**
 * Helper type to flatten object into dot-notation paths
 * Limits depth to 3 levels to avoid infinite recursion and improve performance
 */
type DotNotation<T, D extends number = 3> = D extends 0
	? never
	: T extends object
	? {
			[K in keyof T & string]:
				| K
				| (T[K] extends object
						? T[K] extends Array<any>
							? never
							: `${K}.${DotNotation<T[K], Prev[D]>}`
						: never);
	  }[keyof T & string]
	: never;

type Prev = [never, 0, 1, 2, 3];

/**
 * Helper type to extract the value type at a given path
 * Handles both direct keys and dot-notation paths
 */
type PathValue<T, P> = P extends `${infer K}.${infer Rest}`
	? K extends keyof T
		? PathValue<T[K], Rest>
		: unknown
	: P extends keyof T
	? T[P]
	: unknown;

/**
 * Type-safe WHERE clause with autocomplete for field names
 * Provides autocomplete for known fields while still allowing dynamic field names
 */
export type WhereTyped<T> = {
	and?: WhereTyped<T>[];
	or?: WhereTyped<T>[];
} & {
	// Typed fields with autocomplete - all top-level and nested paths
	// Now properly infers the field type at each path!
	[K in DotNotation<T> | (keyof T & string)]?: FieldFilter<PathValue<T, K>> | FilterValue;
} & {
	// Allow any additional string key for dynamic field names (backwards compatibility)
	[field: string]: FieldFilter<unknown> | FilterValue | WhereTyped<T>[] | undefined;
};

/**
 * Options for find operations (database-agnostic)
 */
export interface FindOptions<T = unknown> {
	/**
	 * Filter conditions
	 * When T is provided, you get autocomplete on field names!
	 */
	where?: WhereTyped<T>;

	/**
	 * Maximum number of results to return
	 * @default 50
	 */
	limit?: number;

	/**
	 * Number of results to skip (for pagination)
	 * @default 0
	 */
	offset?: number;

	/**
	 * Sort order
	 * - Single field: 'title' (ascending) or '-publishedAt' (descending)
	 * - Multiple fields: ['title', '-publishedAt']
	 */
	sort?: string | string[];

	/**
	 * Reference resolution depth
	 * - 0: No reference resolution
	 * - 1: Resolve first-level references
	 * - 2: Resolve second-level references
	 * @default 0
	 */
	depth?: number;

	/**
	 * Field selection (projection)
	 * - Only return specified fields
	 * - Example: ['id', 'title', 'slug']
	 */
	select?: string[];

	/**
	 * Perspective to query
	 * - 'draft': Query draft data
	 * - 'published': Query published data
	 * @default 'draft'
	 */
	perspective?: 'draft' | 'published';
}

/**
 * Result from find operations with pagination metadata
 */
export interface FindResult<T> {
	/**
	 * Array of documents matching the query
	 */
	docs: T[];

	/**
	 * Total number of documents matching the query (without limit/offset)
	 */
	totalDocs: number;

	/**
	 * Maximum number of results returned per page
	 */
	limit: number;

	/**
	 * Number of results skipped
	 */
	offset: number;

	/**
	 * Current page number (1-indexed)
	 */
	page: number;

	/**
	 * Total number of pages
	 */
	totalPages: number;

	/**
	 * Whether there is a next page
	 */
	hasNextPage: boolean;

	/**
	 * Whether there is a previous page
	 */
	hasPrevPage: boolean;
}
