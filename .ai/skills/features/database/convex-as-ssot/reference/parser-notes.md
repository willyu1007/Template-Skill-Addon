# Parser Notes and Known Limits

The included controller uses a **lightweight source parser**, not a full TypeScript AST.

## Supported patterns

The parser is designed for common Convex code:

- `export default defineSchema({ ... })`
- `defineTable({ ... })`
- chained `.index(...)`, `.searchIndex(...)`, `.vectorIndex(...)`
- `export const name = query({ ... })`
- `export const name = mutation({ ... })`
- `export const name = action({ ... })`
- internal function variants
- `httpAction(...)`

## Known limits

- very dynamic schema composition may not parse fully
- heavily abstracted validator builders may degrade type inference quality
- auth detection is heuristic
- usage detection is heuristic
- nested object validators are preserved structurally, but downstream tools may need extra adaptation for deep field querying

## Recommendation

For long-term production use, replace the lightweight parser with a TypeScript AST-based extractor once the overall Convex workflow is accepted.
