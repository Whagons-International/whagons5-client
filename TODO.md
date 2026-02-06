# Frontend TODOs

## Type Generation from OpenAPI

Currently, the frontend uses `any` types for most data entities. This works but loses type safety benefits.

### Goal
Generate TypeScript types automatically from the Laravel backend's OpenAPI spec.

### Approach
1. Backend already generates OpenAPI spec (or can via `l5-swagger` or similar)
2. Use a tool like `openapi-typescript` to generate types:
   ```bash
   npx openapi-typescript http://localhost:8000/api/docs/openapi.json -o src/types/api.ts
   ```
3. Import generated types in genericSliceFactory and other places

### Benefits
- Type-safe API responses
- Autocomplete for entity fields
- Catch type mismatches at compile time
- No manual type maintenance when backend changes

### Blockers
- Need to ensure backend OpenAPI spec is complete and accurate
- Need to set up CI/CD step to regenerate types when API changes

### Resources
- https://github.com/drwpow/openapi-typescript
- https://swagger.io/tools/swagger-codegen/
