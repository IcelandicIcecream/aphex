# GraphQL Plugin - Improvements & TODOs

## Current Known Issues

### 1. Performance
- **N+1 Query Problem**: Reference fields trigger individual database queries for each referenced document
  - **Impact**: Deep nested queries with many references can be slow
  - **Solution**: Implement DataLoader pattern to batch and cache reference lookups
  - **Priority**: High (for production use)

### 2. Perspective Handling
- **No `publishedAt` timestamp**: Currently always returns `null`
  - **Impact**: Can't query when documents were published
  - **Solution**: Add `publishedAt` to Document type and include in resolvers
  - **Priority**: Medium

### 3. Array Field Normalization
- **Recursive normalization is expensive**: Happens on every query
  - **Impact**: Performance overhead for large documents
  - **Solution**: Consider caching normalized data or doing it at write-time
  - **Priority**: Low (only matters at scale)

## Proposed Improvements

### High Priority

#### 1. Implement DataLoader for References
```typescript
import DataLoader from 'dataloader';

const documentLoader = new DataLoader(async (ids: string[]) => {
  const docs = await cms.databaseAdapter.findMany({
    id: { $in: ids }
  });
  // Return in same order as requested ids
  return ids.map(id => docs.find(d => d.id === id) || null);
});
```

#### 2. Add Query Filtering & Pagination
Currently `allDocuments` queries have no filtering or pagination:
```graphql
type Query {
  allPage(
    perspective: String
    status: String
    limit: Int
    offset: Int
    where: PageWhereInput  # Add filtering
    orderBy: PageOrderByInput  # Add sorting
  ): PageConnection!  # Use connection pattern
}

type PageConnection {
  edges: [PageEdge!]!
  pageInfo: PageInfo!
  totalCount: Int!
}
```

#### 3. Add Mutations
Currently read-only. Add mutations for:
- Creating documents
- Updating documents
- Publishing/unpublishing
- Deleting documents

### Medium Priority

#### 4. Add `publishedAt` Field
Update resolvers to include actual published timestamp:
```typescript
publishedAt: document.publishedAt?.toISOString() || null
```

#### 5. Better Error Handling
- Return specific error codes for different failure types
- Add field-level error handling for partial data returns
- Log errors with document context for debugging

#### 6. Depth Limiting
Prevent deeply nested queries from causing performance issues:
```typescript
// In plugin config
maxDepth: 10  // Default depth limit
```

#### 7. Query Complexity Analysis
Calculate and limit query complexity based on:
- Number of fields requested
- Depth of nesting
- Number of array items

### Low Priority

#### 8. Subscriptions Support
Add real-time updates via GraphQL subscriptions:
```graphql
type Subscription {
  documentUpdated(type: String!): Document!
  documentPublished(type: String!): Document!
}
```

#### 9. Custom Scalars
Add proper scalar types for:
- `DateTime` instead of `String`
- `JSON` for arbitrary data
- `URL` for links

#### 10. Schema Stitching/Federation
Support Apollo Federation for splitting schema across services

#### 11. Persisted Queries
Allow clients to send query IDs instead of full query strings

## Technical Debt

### 1. Type Safety
- Reference resolver uses `(field as any)` - should have proper types
- `normalizeArrayFields` uses `any` - should be generic typed

### 2. Testing
- No unit tests yet
- Need integration tests for complex queries
- Add snapshot tests for generated schema

### 3. Documentation
- Add inline JSDoc comments
- Create examples for common queries
- Document plugin configuration options

### 4. Schema Generation
- Handle custom field types better
- Support field directives (e.g., `@deprecated`)
- Generate descriptions from schema definitions

## Performance Benchmarks to Add

- [ ] Single document query (cold cache)
- [ ] Single document query (warm cache)
- [ ] Collection query (10 items)
- [ ] Collection query (100 items)
- [ ] Nested reference (depth 1)
- [ ] Nested reference (depth 3)
- [ ] Complex query with unions and references

## Breaking Changes to Consider

### v2.0 Ideas
- Use GraphQL Code Generator for type safety
- Switch to Pothos for schema-first approach
- Implement field-level authorization
- Add caching layer (Redis/in-memory)
- Support multiple database adapters simultaneously

## Notes

### Array Normalization
The current implementation converts `null` arrays to `[]` recursively. This is necessary because:
- Database stores `null` for empty arrays
- GraphQL expects arrays to be `[]` not `null`
- Happens at query time (could be optimized to happen at write time)

### Perspective Context Passing
Perspectives are passed through GraphQL context to ensure nested references use the correct data version:
- Query args → context.perspective
- Parent status → used if available
- Falls back to defaultPerspective config

### Union Type Resolution
Union types (like array items) use the `_type` field to determine their GraphQL type. This matches Sanity's approach.

---

Last Updated: 2025-01-XX
