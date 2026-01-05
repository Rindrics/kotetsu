# ADR 0002: System Architecture - Data Storage Strategy

## Status

Accepted

## Context

We are building a web application to manage bibliographic data (`references.bib`) and blog-specific metadata. The application needs to:

1. Search local library and Google Books
2. Add books with validation
3. Edit blog-specific metadata
4. Push changes to GitHub

We need to decide how to store and manage the data.

## Options Considered

### Option A: File-based (Git-native)

Store data as files in GitHub repository:

- `references.bib` - BibTeX entries
- `custom_info.json` - Blog-specific metadata

**Architecture**:

```text
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Web App   │────▶│  GitHub API │────▶│  Git Repo   │
│  (Frontend) │◀────│             │◀────│ .bib + .json│
└─────────────┘     └─────────────┘     └─────────────┘
```

**Pros**:

- Zero infrastructure cost
- Native version control with full history
- Simple architecture
- Data is human-readable in repository
- CI/CD integration (format, lint) works naturally
- Offline access possible (clone repo)

**Cons**:

- Search requires loading entire file into memory
- No real-time collaboration
- File size limits (~100MB per file on GitHub)
- Merge conflicts possible with concurrent edits

### Option B: Document Database (Firestore)

Use Firebase Firestore as primary data store, sync to GitHub.

**Architecture**:

```text
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Web App   │────▶│  Firestore  │────▶│  Cloud Fn   │
│  (Frontend) │◀────│             │     │  (Sync)     │
└─────────────┘     └─────────────┘     └──────┬──────┘
                                               │
                                        ┌──────▼──────┐
                                        │  Git Repo   │
                                        └─────────────┘
```

**Pricing (Firestore - as of 2024)**:

| Tier | Storage | Reads/day | Writes/day | Cost |
|------|---------|-----------|------------|------|
| Spark (Free) | 1 GiB | 50,000 | 20,000 | $0 |
| Blaze (Pay-as-you-go) | $0.18/GiB | $0.06/100K | $0.18/100K | Variable |

For a personal library (~1,000 books):

- Storage: < 10 MB (well within free tier)
- Daily operations: < 100 reads, < 10 writes (well within free tier)
- **Estimated cost: $0/month** (free tier sufficient)

**Pros**:

- Powerful query capabilities
- Real-time updates
- Automatic scaling
- Field name indexing for suggestions
- Free tier likely sufficient for personal use

**Cons**:

- Additional complexity (sync logic)
- Vendor lock-in
- Requires Cloud Functions for GitHub sync
- Two sources of truth (potential drift)
- Firestore schema design learning curve

### Option C: Document Database (MongoDB Atlas)

Similar to Option B but with MongoDB Atlas.

**Pricing (MongoDB Atlas - as of 2024)**:

| Tier | Storage | Cost |
|------|---------|------|
| M0 (Free) | 512 MB | $0 |
| M10 (Dedicated) | 10 GB | ~$57/month |

**Estimated cost: $0/month** (M0 free tier sufficient for personal use)

## Decision

**Recommended: Option A (File-based / Git-native)**

### Rationale

1. **Simplicity**: For a personal library with < 10,000 entries, file-based storage is more than sufficient
2. **Cost**: Truly zero cost (no database, no cloud functions)
3. **Version Control**: Git provides natural versioning without additional sync logic
4. **CI/CD Integration**: Current Makefile workflow (format, lint) continues to work
5. **Data Portability**: Plain files are portable and future-proof

### Search Strategy

For the search requirement, we can:

1. **Client-side search**: Load JSON into memory, use libraries like Fuse.js for fuzzy search
2. **Build-time indexing**: Generate search index during CI, serve as static JSON
3. **GitHub Code Search API**: For simple queries (limited but free)

Expected dataset size (< 10,000 entries, < 5 MB) makes client-side search viable.

### When to Reconsider

Consider migrating to a database if:

- Library exceeds 50,000 entries
- Multiple users need real-time collaboration
- Complex queries become a bottleneck
- Search latency becomes unacceptable

## Consequences

### Positive

- No additional infrastructure to maintain
- No ongoing costs
- Simpler architecture
- Data remains human-readable
- Full version history in Git

### Negative

- Search limited to client-side (acceptable for expected scale)
- No real-time collaboration (single user, so acceptable)
- Manual conflict resolution if editing from multiple devices

## Implementation Notes

1. Web app reads/writes via GitHub API
2. Use GitHub App for authenticated pushes
3. Implement client-side search with Fuse.js or similar
4. Consider caching GitHub API responses for performance
