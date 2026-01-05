# ADR 0003: Custom Info File Format

## Status

Accepted

## Context

We need to store blog-specific metadata (`custom_info`) that joins with `references.bib` by citation key. The standard JSON format has limitations:

- No trailing commas (inconvenient for editing)
- No comments
- No string interpolation or value reuse

We evaluated alternative formats to improve developer experience.

## Options Considered

### Option A: JSON (Current)

Standard JSON format.

```json
{
  "suwa-2018-karadaga-umidasu": {
    "cover_url": "https://...",
    "blogs": {
      "hugo": {
        "tags": ["creativity"]
      }
    }
  }
}
```

**Pros**:
- Universal support
- Simple parsing

**Cons**:
- No trailing commas
- No comments
- No value reuse

### Option B: JSON5 / JSONC

JSON with relaxed syntax (trailing commas, comments).

**Pros**:
- Trailing commas supported
- Comments supported
- Similar to JSON

**Cons**:
- No string interpolation
- Requires special parser

### Option C: YAML

Human-readable data serialization format.

```yaml
suwa-2018-karadaga-umidasu:
  cover_url: https://...
  blogs:
    hugo:
      tags: [creativity, embodiment]
      review: 素晴らしい本
```

**Pros**:
- Trailing commas not needed (list syntax)
- Comments supported
- Anchors/aliases for value reuse
- Hugo/Astro native support (data files)
- High readability

**Cons**:
- Indentation-sensitive (potential errors)
- Multiple ways to express same data

### Option D: CUE

Configuration language with schema validation.

```cue
#BookInfo: {
    cover_url: string & =~"^https://"
    blogs: [string]: #BlogEntry
}

"suwa-2018-karadaga-umidasu": #BookInfo & {
    cover_url: "https://..."
}
```

**Pros**:
- Strong schema validation
- Powerful templating and inheritance
- Computed fields
- Constraints on values

**Cons**:
- Learning curve
- Requires export step (CUE → YAML/JSON)
- Overkill for small datasets
- Additional tooling required

## Decision

**Use YAML** (`custom_info.yaml`) instead of JSON.

Rename `custom_info.json` → `custom_info.yaml`.

### Rationale

1. **Trailing commas not needed**: YAML list syntax eliminates this pain point
2. **Comments**: Can document fields inline
3. **Value reuse**: Anchors/aliases enable DRY patterns
4. **Hugo/Astro integration**: Both frameworks natively support YAML data files
5. **Simplicity**: No build step required (unlike CUE)
6. **Readability**: More human-friendly for manual editing

### Why Not CUE

CUE offers powerful features (schema validation, computed fields), but:

- Current dataset is small (< 100 entries)
- Schema validation can be done with simpler tools if needed
- Export step adds complexity
- Learning curve not justified at this scale

**Future consideration**: If the dataset grows significantly and schema management becomes critical, migration to CUE can be revisited.

## Consequences

### Positive

- Better editing experience (comments, no trailing comma issues)
- Value reuse with anchors reduces duplication
- Direct integration with Hugo/Astro data files
- More readable configuration

### Negative

- Indentation errors possible (mitigated by editor support)
- Team members need basic YAML knowledge

### Migration

1. Rename `custom_info.json` → `custom_info.yaml`
2. Convert content to YAML format
3. Update `Makefile` (`JSON_FILE` → `YAML_FILE`)
4. Update `validate-sync` target for YAML parsing
5. Update documentation

## Example

```yaml
# custom_info.yaml

# Common defaults
defaults: &defaults
  tags: [books]

suwa-2018-karadaga-umidasu:
  cover_url: https://books.google.com/books/content?id=yibkswEACAAJ&printsec=frontcover&img=1&zoom=1
  blogs:
    hugo:
      <<: *defaults  # Merge defaults
      tags: [creativity, embodiment]  # Override
      review: 素晴らしい本
    astro:
      <<: *defaults
```

## Related ADRs

- docs/adr/0002-system-architecture.md
