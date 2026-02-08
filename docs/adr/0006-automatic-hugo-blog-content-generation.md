# ADR 0006: Multi-Site Bibliography Content Distribution

**Date**: 2026-02-08
**Status**: Proposed
**Authors**: @rindrics
**Depends On**: ADR-0005 (Cloudflare Workers API)

## Context

Kotetsu manages bibliography data (BibTeX + YAML metadata) that multiple external static sites need to consume. The system should automatically serve bibliography data to external sites (Hugo, Next.js, Astro, etc.) when entries are added or updated.

### Current Architecture

- **Platform**: SvelteKit + Cloudflare Pages (static site generation)
- **Data Flow**: `references.bib` + `custom_info.yaml` → `generate-data.ts` → `bibliography.json`
- **CI/CD**: GitHub Actions triggers on content changes
- **Multi-site Ready**: `custom_info.yaml` supports multiple site IDs per entry

### Problem Statement

Currently, Kotetsu only serves data for its own frontend. There is no mechanism for external sites to automatically consume bibliography data at build time. Users of external sites must manually sync data or create content, which is error-prone and tedious.

### Requirements

1. Support multiple external static site generators (Hugo, Next.js, Astro, etc.)
2. Build-time data consumption (confirmed content at build time is acceptable)
3. SEO-optimal: Pure static HTML generation (no JavaScript required)
4. Automatic filtering by siteId
5. No external API dependency during external site builds (fallback-safe)

### Related ADRs

- **ADR-0001**: Multiple blogs share single bibliography ✓
- **ADR-0002**: File-based, Git-native system architecture ✓
- **ADR-0003**: YAML format for multi-site metadata ✓
- **ADR-0005**: Multi-site API via Cloudflare Workers (REQUIRED for Option 3) ← Not yet started

## Alternatives Considered

### Option 1: Static JSON Export (Data File)

**How it works**: Kotetsu generates `bibliography.json`. External sites read it as a data file at build time, each filtering by their own `siteId`.

```text
Kotetsu                      External Site (Hugo, Next.js, etc.)
references.bib + YAML
      ↓
bibliography.json (all sites)  ─────→ data/bibliography.json
                                      ↓
                                site templates: filter by siteId, format
                                      ↓
                                static HTML
```

**Advantages**
- ✅ Simplest distribution (single JSON file)
- ✅ Works with any static site generator
- ✅ No build-time network dependency
- ✅ Version controlled if committed

**Disadvantages**
- ⚠️ All sites' data included (data bloat, privacy concern)
- ⚠️ Each site must implement filtering logic (memo excluded?)
- ⚠️ Template logic varies per site (inconsistent formatting)
- ⚠️ No centralized control over output format
- ⚠️ Manual file sync (copy/symlink) required

### Option 2: Content Generation Script (Hugo-Specific)

**How it works**: TypeScript script generates Hugo markdown files. Kotetsu generates, commits to Hugo repo via GitHub Actions cross-repo automation.

```text
references.bib + custom_info.yaml (siteId=hugo_blog)
           ↓
  generate-hugo-content.ts
           ↓
  hugo-repo/content/books/book-title.md (YAML frontmatter)
           ↓
  GitHub Actions auto-commits to Hugo repo
           ↓
  Hugo build → Static site
```

**Advantages**


- ✅ Hugo-native workflow (markdown files)
- ✅ Full control over frontmatter and content format
- ✅ Version controlled generated content
- ✅ Customizable per Hugo theme requirements
- ✅ Filters by siteId at generation time
- ✅ SEO-friendly (static HTML, no JavaScript)
- ✅ No external dependencies during Hugo build

**Disadvantages**
- ⚠️ **Hugo-specific only** (not reusable for Next.js, Astro, etc.)
- ⚠️ Two repos to manage + cross-repo CI/CD complexity
- ⚠️ Generated files committed (cleanup on deletion)
- ⚠️ Must maintain generation script separately
- ⚠️ Requires GitHub Secrets for cross-repo authentication

---

### Option 3: API Integration via Cloudflare Workers (PROPOSED)

**How it works**: Any static site generator fetches filtered data from Kotetsu API (ADR-0005) at build time. Each site's build process calls API → receives site-specific JSON → generates static HTML.

```text
Kotetsu API (Cloudflare Workers)
GET /api/bibliography?siteId=<site-id>
           ↑
    [Build time, any site]
           ↓
   Hugo, Next.js, Astro, etc.
           ↓
   fetch API → filter response → generate static HTML
```

**Site Integration Example (Hugo)**:


```hugo
{{- with getJSON (printf "https://kotetsu.rindrics.com/api/bibliography?siteId=%s" .Site.Params.siteId) }}
  {{- range . }}
    Create post from {{ .title }}...
  {{- end }}
{{- end }}
```

**Advantages**
- ✅ **Supports any static site generator** (Hugo, Next.js, Astro, etc.)
- ✅ Single API endpoint (reusable across all sites)
- ✅ Server-side filtering (automatic, consistent)
- ✅ Memo field automatically excluded
- ✅ No generated files or cross-repo commits needed
- ✅ Centralized control over data format
- ✅ Each site generates its own static HTML
- ✅ SEO-friendly (builds static HTML at build time)
- ✅ Scales to unlimited external sites

**Disadvantages**
- ⚠️ Requires ADR-0005 implementation (Cloudflare Workers)
- ⚠️ Network call during each external site's build
- ⚠️ Potential build failure if API is down
- ⚠️ Each site must implement build-time fetch + template logic
- ⚠️ More infrastructure complexity (Workers + static site setup)

---

## Decision Matrix

| Factor | Option 1 (JSON) | Option 2 (Script) | Option 3 (API) |
| --- | --- | --- | --- |
| **Simplicity** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ |
| **Multi-Site Support** | ⭐⭐ | ⭐ (Hugo only) | ⭐⭐⭐⭐⭐ |
| **Generator Coverage** | 📦 Any | 🔧 Hugo only | 🌐 Any |
| **Automation** | Manual | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **SEO** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Infrastructure** | None | 🔄 Cross-repo CI | 🛠️ Workers |
| **Data Privacy** | ⚠️ All sites exposed | ✅ Filtered | ✅ Filtered |
| **Build Dependencies** | None | None | Network call |

---

## Decision: Option 3 - API Integration (Requires ADR-0005)

Implement **Cloudflare Workers API** (ADR-0005) to serve filtered bibliography data to external sites.

### Rationale

**Why Option 3 wins for multi-site support:**

1. **Multi-Generator Support**: Works with Hugo, Next.js, Astro, Eleventy, any static generator
   - Option 2 is Hugo-only (blocks future expansion)
   - Option 1 requires each site to implement filtering logic

2. **SEO-Optimal**: Each site generates static HTML at build time (API call → template → HTML)
   - Same SEO benefit as Option 2, without tying to one tool

3. **Scalable**: Add new external sites without code changes
   - New site just needs to call `/api/bibliography?siteId=newsite`
   - No cross-repo CI setup, no new scripts

4. **Data Privacy**: Server-side filtering
   - Removes memo field automatically
   - No other sites' data exposed

5. **Infrastructure Alignment**: Extends Kotetsu's native infrastructure (Cloudflare)
   - Workers run on same platform as Kotetsu frontend
   - Single source of truth (API endpoint)

**Trade-off accepted**: Network call during external sites' builds
   - But API is edge-cached, builds fail gracefully
   - Worth it for unlimited multi-site support

---

## Consequences

### Positive

- ✅ **Multi-Site Support**: Unlimited external sites (Hugo, Next.js, Astro, etc.)
- ✅ **No Cross-Repo Management**: No generated files, no commit automation
- ✅ **Centralized Control**: Single API endpoint for all data filtering and formatting
- ✅ **SEO-Optimal**: Each site builds static HTML at build time
- ✅ **Data Privacy**: Memo field filtered server-side, never exposed to external sites
- ✅ **Extensibility**: Add new sites without code changes (just configure siteId)
- ✅ **Edge-Cached**: Cloudflare Workers runs globally, responses cached
- ✅ **Consistent Behavior**: All sites get same filtered, formatted data

### Negative

- ⚠️ **Blocking Dependency**: Requires ADR-0005 (Cloudflare Workers) implementation
- ⚠️ **Network Dependency**: External sites' builds depend on API availability
- ⚠️ **Build Failures**: If API down, external site build can fail
- ⚠️ **Implementation Scope**: More complex than Option 1 or 2 (requires Workers code)
- ⚠️ **Each Site Owns Templates**: Hugo/Next.js/Astro sites implement their own formatting
- ⚠️ **Cold Start**: API calls add seconds to external site builds (edge-cached after)

---

## Implementation Overview

**This ADR depends on ADR-0005 completion.** ADR-0006 defines external site integration; ADR-0005 implements the API.

### Phase 1: Implement ADR-0005 (Cloudflare Workers API)

Implement `/api/bibliography?siteId=<site-id>` endpoint:
- Load `bibliography.json` (static file)
- Filter by siteId from YAML
- Remove memo field
- Return JSON with tags, review, readDate

See ADR-0005 for implementation details.

### Phase 2: Document External Site Integration

Provide integration guide for external sites:

**Hugo Example**:

```go
{{- with getJSON (printf "https://kotetsu.rindrics.com/api/bibliography?siteId=%s" .Site.Params.siteId) }}
```

**Next.js Example**:

```typescript
const books = await fetch(
  `https://kotetsu.rindrics.com/api/bibliography?siteId=nextjs_blog`
).then(r => r.json());
```

**Astro Example**:

```typescript
const books = await fetch(
  `https://kotetsu.rindrics.com/api/bibliography?siteId=astro_blog`
).then(r => r.json());
```

### Phase 3: Custom Metadata Configuration



Add site sections to `contents/custom_info.yaml`:

```yaml
suwa-2018-karadaga-umidasu:
  akirahayashi_com:
    tags: [...]
    review: "..."
    readDate: "2026-01-15"
  hugo_blog:              # New Hugo site
    tags: [...]
    review: "..."
    readDate: "2026-01-15"
  nextjs_blog:            # New Next.js site
    tags: [...]
    review: "..."
    readDate: "2026-01-15"
```

---

## Critical Files

**Depends On (ADR-0005)**:

- `infrastructure/workers/bibliography-api.ts` - Implements `/api/bibliography` endpoint, filtering and memo removal logic

**Modified Files (This ADR)**:

- `contents/custom_info.yaml` - Add site sections for each external site (structure same as existing `akirahayashi_com`)
- `docs/INTEGRATION.md` (NEW) - Integration guide for external sites with example code for Hugo, Next.js, Astro

**Reused (No Changes)**:

- `web/src/lib/parsers/yaml.ts` - Existing YAML parser
- `web/scripts/generate-data.ts` - Existing generation logic

---

## Testing Strategy

### Phase 1: API Testing (ADR-0005)

Test `/api/bibliography` endpoint:

```bash
# Valid request
curl "https://kotetsu.rindrics.com/api/bibliography?siteId=akirahayashi_com"

# Should return filtered data:
# - Only entries with akirahayashi_com metadata
# - No memo field
# - Has tags, review, readDate

# Invalid siteId
curl "https://kotetsu.rindrics.com/api/bibliography?siteId=invalid"
# Should return 404 error
```

### Phase 2: External Site Integration Testing

**Hugo Test**:

```bash
cd /path/to/hugo-site
# Add to config.yaml:
# siteId: hugo_blog

# Test build
hugo server --buildFuture

# Verify: Check bibliography section renders
# Each book should have: title "X を読んだ", tags, review
```

**Next.js Test**:

```typescript
const books = await fetch(
  'https://kotetsu.rindrics.com/api/bibliography?siteId=nextjs_blog'
).then(r => r.json());

// Verify: books array has correct structure
// { id, title, author, customInfo: { tags, review, readDate } }
```

### Phase 3: End-to-End Workflow

```bash
# 1. Add new bibliography entry
echo "@book{test-2026,...}" >> contents/references.bib

# 2. Add metadata for multiple sites
# contents/custom_info.yaml:
# test-2026:
#   akirahayashi_com:
#     review: "..."
#   hugo_blog:
#     review: "..."

# 3. Push to main
git add contents/
git commit -m "feat: add test-2026"
git push

# 4. Test each external site
# Hugo: hugo server → see new post
# Next.js: npm run build → verify new book in output
# Astro: npm run build → verify new post
```

---

## Timeline & Effort

| Phase | Task | Effort | Blocker |
| --- | --- | --- | --- |
| 1 | ADR-0005: Implement Workers API | 4-8 hours | ⏳ Blocking |
| 2 | This ADR: Document integration | 1-2 hours | ✅ After Phase 1 |
| 3 | Testing + first external site | 2-3 hours | ✅ After Phase 1 |
| **Total** | | **7-13 hours** | Sequential |

**Note**: ADR-0006 cannot begin implementation until ADR-0005 is complete.

---

## Success Criteria

**ADR-0005 Complete**:

1. ✅ API endpoint `/api/bibliography?siteId=<site-id>` returns filtered JSON
2. ✅ Response includes only entries with matching siteId
3. ✅ Memo field is excluded from all responses
4. ✅ Error responses for invalid/missing siteId
5. ✅ Caching headers set (Cache-Control, ETag)

**ADR-0006 External Site Integration**:

6. ✅ Hugo site can fetch and build content from API
7. ✅ Hugo build generates static HTML with bibliography posts
8. ✅ Generated HTML includes title, review, tags, author
9. ✅ Multiple external sites can consume API independently
10. ✅ No manual data sync required (automatic via API)

---

## Open Questions for Implementation

1. **Rate Limiting**: Should `/api/bibliography` have rate limits? (Recommended: No limit per siteId, basic DDoS protection only)
2. **Caching Strategy**: Cache-Control header duration? (Recommended: 1 hour)
3. **ETag Validation**: Include ETag for conditional requests? (Recommended: Yes, for external site build optimization)
4. **Error Handling**: How should external sites handle API downtime? (Recommended: Fallback to cached response, warn in logs)
5. **Site Registration**: Should new siteIds be pre-configured? (Recommended: Any siteId accepted, filtered if exists in YAML)
6. **CORS Policy**: Should API support CORS for client-side requests? (Recommended: Yes, for future flexibility)

---

## Related Resources & References

- **ADR-0005**: Multi-Site Bibliography API via Cloudflare Workers (REQUIRED)
- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [Hugo getJSON Function](https://gohugo.io/functions/data/getjson/)
- [Next.js getStaticProps + fetch](https://nextjs.org/docs/basic-features/data-fetching)
- [Astro Static Generation](https://docs.astro.build/en/guides/content-collections/)

## ADR History

- **ADR-0001**: Separate Blog Metadata from BibTeX ✓
- **ADR-0002**: File-based System Architecture ✓
- **ADR-0003**: Custom Info YAML Format ✓
- **ADR-0004**: Web UI Technology Stack ✓
- **ADR-0005**: Cloudflare Workers API ← (Prerequisite for this ADR)
- **ADR-0006**: Multi-Site Bibliography Distribution ← You are here
