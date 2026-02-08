# ADR 0005: Multi-Site Bibliography API via Cloudflare Workers

**Date**: 2026-02-08
**Status**: Proposed
**Authors**: @rindrics

## Context

Kotetsu manages a shared bibliography database (BibTeX + YAML metadata) that multiple independent blogs/sites use. Each site stores its own metadata (tags, reviews) per citation key in `custom_info.yaml`:

```yaml
citation-key:
  akirahayashi_com:
    tags: [...]
    review: "..."
    memo: "internal only"
  other_blog_com:
    tags: [...]
    review: "..."
```



Currently, the system generates a single static `bibliography.json` with all data. As more sites join, each client downloads unnecessary data (other sites' entries, memo fields).

**Related ADRs**:

- ADR-0001: Multiple blogs share single bibliography ✓
- ADR-0002: File-based, Git-native storage ✓
- ADR-0003: YAML format for metadata ✓
- ADR-0004: Cloudflare Pages + Workers infrastructure ✓



## Decision

Implement a **server-side filtering API using Cloudflare Workers** to serve site-specific data:

1. **Endpoint**: `GET /api/bibliography?siteId=<site-id>`
2. **Input**: Query parameter `siteId` (e.g., `siteId=akirahayashi_com`)
3. **Output**: JSON array with only entries belonging to that site
4. **Data filtering**: Removes `memo` field (internal only)
5. **Deployment**: Cloudflare Workers bound to same Pages project (extends ADR-0004)

### Implementation Architecture

```text
Request: GET /api/bibliography?siteId=akirahayashi_com
              ↓
         Cloudflare Workers
              ↓
    - Load bibliography.json (static)
    - Filter entries by siteId
    - Remove memo field from customInfo
              ↓
Response: [{ id, type, title, author, customInfo: { tags, review } }]
```



### Data Flow

```text
contents/
├── references.bib          ← BibTeX database
└── custom_info.yaml        ← Multi-site metadata

web/
├── scripts/generate-data.ts ← Merges both, generates bibliography.json
├── static/data/
│   └── bibliography.json    ← Full data (static file)
└── ...

infrastructure/
├── workers/
│   └── bibliography-api.ts  ← NEW: API filtering logic
└── Pulumi configuration     ← Deploy Workers
```



## Consequences

### Positive

- ✅ **Network Efficient**: Only relevant data transferred to each site
- ✅ **Stateless**: Workers are scalable, no persistent state required
- ✅ **Security**: Memo fields and other sites' data not exposed
- ✅ **Cache-Friendly**: Response cached at edge with `siteId` in cache key
- ✅ **No Breaking Changes**: Static `bibliography.json` unchanged, existing clients unaffected
- ✅ **Native Integration**: Workers run on same Cloudflare infrastructure as Pages (per ADR-0004)
- ✅ **Consistent with ADR-0001**: Supports multiple sites sharing one database
- ✅ **Consistent with ADR-0002**: Maintains file-based data storage (no database required)

### Negative

- ⚠️ **Operational Overhead**: Must maintain Workers code alongside SvelteKit
- ⚠️ **Dynamic Requests**: API responses consume more resources than static files
- ⚠️ **Rate Limiting**: Need strategy to prevent abuse



## Alternatives Considered

### Alternative 1: Static Files per Site
Generate separate JSON files at build time:
- `/data/bibliography-akirahayashi_com.json`
- `/data/bibliography-other_com.json`

**Rejected**: Increases build complexity, doesn't scale as sites are added, requires coordination between sites and Makefile.

### Alternative 2: Client-Side Filtering
Return full `bibliography.json` to all clients; let each site filter its own data.

**Rejected**: Wastes network bandwidth (full payload), exposes memos and other sites' data, poor performance.

### Alternative 3: Database-Backed API
Use a database (Firestore, MongoDB) for bibliography data.

**Rejected**: Violates ADR-0002 decision (file-based, Git-native); adds cost and complexity; loses version control benefits.

## Implementation Plan

### Phase 1: Core API

1. Create `/infrastructure/workers/bibliography-api.ts`
   - Fetch `bibliography.json` from static storage
   - Filter by `siteId` parameter
   - Remove `memo` field
   - Return JSON response

2. Update Pulumi configuration
   - Deploy Workers script
   - Bind `/api/*` routes
   - Set environment variables (data path)

### Phase 2: Robustness

3. Query parameter validation
   - Require `siteId` parameter (400 Bad Request if missing)
   - Return 404 if `siteId` not found in data
   - Validate `siteId` format

4. Response headers
   - Set `Cache-Control: public, max-age=3600` (1 hour)
   - Include `ETag` for cache validation
   - Add `Content-Type: application/json`

### Phase 3: Documentation & Monitoring

5. API documentation
   - Endpoint specification
   - Example requests/responses
   - Error codes
   - Rate limiting policy

6. Monitoring (optional)
   - Log request counts per siteId
   - Monitor Worker execution time
   - Track cache hit rates



## API Specification (Example)

### Request

```text
GET /api/bibliography?siteId=akirahayashi_com
```

### Response (200 OK)

```json
[
  {
    "id": "suwa-2018-karadaga-umidasu",
    "type": "book",
    "title": "身体が生み出すクリエイティブ",
    "author": "諏訪, 正樹",
    "year": 2018,
    "publisher": "筑摩書房",
    "customInfo": {
      "tags": ["ライブ", "体感覚"],
      "review": "日々の練習において..."
    }
  }
]
```

### Error Response (400 Bad Request)

```json
{
  "error": "Missing required parameter: siteId"
}
```

### Error Response (404 Not Found)

```json
{
  "error": "siteId not found: invalid_site"
}
```



## Testing Strategy

1. **Unit Tests**: Filter logic in isolation
2. **Integration Tests**: Workers + static JSON file
3. **Manual Testing**:
   - Test with valid `siteId`
   - Test with invalid/missing `siteId`
   - Verify memo field not in response
   - Verify caching headers present



## Timeline & Effort

- **Small feature**: ~4-8 hours (Phase 1-2)
- **Includes documentation & monitoring**: ~2 additional hours

## Questions/Unknowns

1. Should we cache `bibliography.json` in Workers memory, or fetch on each request?
   - Recommendation: Fetch per-request initially; optimize if needed
2. Should siteId be case-sensitive?
   - Recommendation: Match YAML keys exactly (case-sensitive)
3. Should we version this API (`/api/v1/bibliography`)?
   - Recommendation: Start without versioning; add if breaking changes expected

## Related Resources

- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [Cloudflare KV Store (optional, for caching)](https://developers.cloudflare.com/workers/runtime-apis/kv/)
- [SvelteKit + Cloudflare Pages Integration](https://kit.svelte.dev/docs/adapter-cloudflare)
