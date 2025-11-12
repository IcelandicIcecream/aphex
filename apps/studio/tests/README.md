# Comprehensive API Test Suite

This directory contains comprehensive tests for all three API layers:
- **LocalAPI** - Direct TypeScript API
- **HTTP/REST API** - RESTful HTTP endpoints
- **GraphQL API** - GraphQL queries and mutations

## Test Files

### 1. `comprehensive-local-api.test.ts`
Tests the LocalAPI layer directly, covering:
- ✅ CREATE operations for all collections (Page, Catalog, Movie)
- ✅ READ operations (find, findByID, count)
- ✅ UPDATE operations
- ✅ DELETE operations
- ✅ PUBLISH/UNPUBLISH operations
- ✅ Filtering with where clauses
- ✅ Pagination (limit, offset)
- ✅ Sorting
- ✅ Nested object fields (hero, items)
- ✅ Validation errors

### 2. `comprehensive-http-api.test.ts`
Tests the HTTP/REST API endpoints, covering:
- ✅ POST /api/documents (Create)
- ✅ GET /api/documents (List with filtering)
- ✅ GET /api/documents/:id (Get by ID)
- ✅ PUT /api/documents/:id (Update)
- ✅ DELETE /api/documents/:id (Delete)
- ✅ POST /api/documents/:id/publish (Publish)
- ✅ DELETE /api/documents/:id/publish (Unpublish)
- ✅ Query parameters (type, limit, status, etc.)
- ✅ Pagination metadata
- ✅ Error responses (404, 400, etc.)

### 3. `comprehensive-graphql-api.test.ts`
Tests the GraphQL API, covering:
- ✅ Queries: `page(id)`, `allPage`, `catalog`, `movie`
- ✅ Mutations: `createPage`, `updatePage`, `deletePage`, `publishPage`, `unpublishPage`
- ✅ Where clause filtering
- ✅ OR filters
- ✅ Pagination (limit, offset)
- ✅ Sorting
- ✅ Nested field queries
- ✅ Variables in queries
- ✅ Error handling

### 4. `local-api.test.ts` (Original)
The original LocalAPI test file with:
- Basic operations
- JSONB filtering
- Sorting
- Pagination
- Type safety
- Perspective (draft vs published)
- Reference resolution
- Validation

## Running the Tests

### Run All Tests
```bash
pnpm test
```

### Run Specific Test Suites

**LocalAPI tests:**
```bash
pnpm test comprehensive-local-api
```

**HTTP/REST API tests:**
```bash
pnpm test comprehensive-http-api
```

**GraphQL API tests:**
```bash
pnpm test comprehensive-graphql-api
```

**Original LocalAPI tests:**
```bash
pnpm test local-api
```

### Watch Mode
```bash
pnpm test --watch
```

### Coverage
```bash
pnpm test --coverage
```

## Test Data

### Fixtures
Test data is defined in `fixtures/test-data.ts` and includes:
- **Pages**: 6 test pages with hero sections
- **Catalogs**: 2 catalogs with multiple items (with proper `_type` fields)
- **Movies**: 2 movies with release dates and directors

### Seed Helper
The `helpers/seed.ts` file provides a `seedDatabase()` function that:
- Clears existing test data
- Seeds fresh test data for all collections
- Used in test setup

## Test Structure

Each comprehensive test file follows this pattern:

```typescript
describe('API Layer - Collection', () => {
  describe('CREATE Operations', () => {
    it('should create a document', async () => {
      // Test implementation
    });
  });

  describe('READ Operations', () => {
    it('should find documents', async () => {
      // Test implementation
    });
  });

  describe('UPDATE Operations', () => {
    it('should update a document', async () => {
      // Test implementation
    });
  });

  describe('DELETE Operations', () => {
    it('should delete a document', async () => {
      // Test implementation
    });
  });

  describe('PUBLISH/UNPUBLISH Operations', () => {
    it('should publish/unpublish', async () => {
      // Test implementation
    });
  });
});
```

## Key Testing Patterns

### 1. Test Isolation
Each test creates its own data and cleans up after itself:
```typescript
afterEach(async () => {
  // Clean up created documents
  for (const id of createdDocIds.pages) {
    await localAPI.collections.page.delete(context, id);
  }
});
```

### 2. Proper _type Fields
When creating array items (like catalogItem), always include `_type`:
```typescript
{
  items: [
    {
      _type: 'catalogItem',  // ✅ Required for array items
      title: 'Item 1',
      shortDescription: 'Description',
      price: 10.99
    }
  ]
}
```

### 3. Testing Validation
Test both success and failure cases:
```typescript
it('should fail without required fields', async () => {
  await expect(
    localAPI.collections.page.create(context, {
      title: 'No Slug'  // Missing required slug
    })
  ).rejects.toThrow();
});
```

### 4. Testing Nested Fields
Access nested objects and arrays:
```typescript
expect(page.hero?.heading).toBe('Welcome');
expect(catalog.items).toHaveLength(2);
expect(catalog.items?.[0]?.title).toBe('Item 1');
```

## Coverage

The comprehensive test suites cover:

### LocalAPI
- ✅ All CRUD operations
- ✅ All collections (Page, Catalog, Movie)
- ✅ Validation errors
- ✅ Publish/unpublish workflows
- ✅ Filtering, sorting, pagination
- ✅ Nested objects and arrays

### HTTP/REST API
- ✅ All endpoints (GET, POST, PUT, DELETE)
- ✅ Query parameters
- ✅ Request/response bodies
- ✅ HTTP status codes
- ✅ Error responses
- ✅ Pagination metadata

### GraphQL API
- ✅ All queries
- ✅ All mutations
- ✅ Where clause filters
- ✅ Variables
- ✅ Nested field selection
- ✅ Error handling
- ✅ OR filters, sorting, pagination

## Common Issues

### 1. Missing _type in Array Items
**Problem:** Catalog items missing `_type` field
**Solution:** Always add `_type: 'catalogItem'` to each item

### 2. Test Data Conflicts
**Problem:** Tests interfere with each other
**Solution:** Use `afterEach` to clean up test data

### 3. Authentication in Tests
**Problem:** API calls require authentication
**Solution:** Use `overrideAccess: true` for LocalAPI or mock auth for HTTP/GraphQL

### 4. Async Operations
**Problem:** Tests fail due to timing issues
**Solution:** Always `await` API calls and use proper async/await

## Debugging Tests

### Enable Verbose Output
```bash
pnpm test --reporter=verbose
```

### Run Single Test
```bash
pnpm test -t "should create a page"
```

### Debug with Console Logs
```typescript
it('should create a page', async () => {
  const result = await localAPI.collections.page.create(...);
  console.log('Created:', result);  // Temporary debug log
  expect(result.id).toBeDefined();
});
```

## Best Practices

1. **Test One Thing**: Each test should verify one specific behavior
2. **Clear Names**: Test names should describe what they test
3. **Arrange-Act-Assert**: Structure tests in three clear sections
4. **Clean Up**: Always clean up test data
5. **Independent Tests**: Tests should not depend on each other
6. **Use Fixtures**: Reuse test data from fixtures
7. **Test Edge Cases**: Test both success and failure scenarios

## Future Improvements

- [ ] Add performance benchmarks
- [ ] Add concurrent operation tests
- [ ] Add more complex filtering scenarios
- [ ] Add reference resolution tests
- [ ] Add permission/RLS tests
- [ ] Add webhook tests (when implemented)
- [ ] Add caching tests (when implemented)

## Contributing

When adding new tests:
1. Follow the existing file structure
2. Add cleanup in `afterEach`
3. Use descriptive test names
4. Test both success and error cases
5. Update this README if adding new test files
