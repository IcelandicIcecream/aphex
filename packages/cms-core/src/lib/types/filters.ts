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
export interface Where {
	// Nested logical operators
	and?: Where[];
	or?: Where[];

	// Field filters - using index signature for dynamic field names
	[field: string]: FieldFilter<unknown> | FilterValue | FieldFilter<unknown>[] | Where[] | undefined;
}

/**
 * Options for find operations (database-agnostic)
 */
export interface FindOptions {
	/**
	 * Filter conditions
	 */
	where?: Where;

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
