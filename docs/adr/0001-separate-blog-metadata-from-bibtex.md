# ADR 0001: Separate Blog Metadata from BibTeX

## Status

Accepted

## Context

We want to use `references.bib` to write book reviews on blogs (Hugo, potentially Astro in the future). Each blog may have different metadata requirements such as tags, reviews, and custom fields.

We considered two approaches:

1. **Embed custom fields directly in BibTeX**: Add blog-specific fields like `blog_hugo`, `blog_astro` to each BibTeX entry
2. **Maintain a separate JSON file**: Keep a `custom_info.json` file that joins with BibTeX entries by citation key

## Decision

We will maintain blog metadata in a separate JSON file (`custom_info.json`), joining with BibTeX entries by citation key.

## Consequences

### Positive

- **Separation of concerns**: Bibliographic data stays pure; blog-specific data is isolated
- **Validation compatibility**: `biber --validate-datamodel` passes without warnings about non-standard fields
- **Flexible structure**: JSON supports nested structures (e.g., per-blog tags, multiple review versions)
- **Direct integration**: Hugo/Astro can consume JSON as a data file without transformation
- **Extensibility**: Easy to add new blogs or fields without touching BibTeX

### Negative

- **Two files to maintain**: Adding a new entry requires updating both `references.bib` and `custom_info.json`
- **Sync discipline required**: Citation keys must match between files
- **Potential drift**: Orphaned entries may accumulate if not careful

### Mitigations

- Consider adding a `make validate-sync` target to check that all keys in `custom_info.json` exist in `references.bib`
- Document the workflow for adding new entries

## Alternatives Considered

### Alternative A: Embed nested custom fields in BibTeX

We initially considered embedding blog metadata directly in BibTeX:

```bibtex
@book{suwa-2018-karadaga,
  title = {身体が生み出すクリエイティブ},
  blog_a = {
    tags {foo, bar},
    review = {lorem ipsum},
  },
}
```

**Why rejected**: BibTeX syntax only supports flat `key = {value}` structures. Nested structures like the above are syntax errors and cause parsing failures.

### Alternative B: Flat custom fields in BibTeX with biber cleanup

We noticed that `biber --tool` outputs a clean BibTeX file (`references_bibertool.bib`) that strips invalid fields. This suggested a workflow:

1. Maintain `references.bib` with flat custom fields (e.g., `blog_hugo_tags = {foo, bar}`)
2. Use `references_bibertool.bib` for academic purposes
3. Use original `references.bib` for blog integration

**Why rejected**: Flat structure is insufficient for our needs. We require nested structures such as:

- Per-blog configurations with multiple fields
- Arrays of tags
- Potentially nested review sections with metadata

BibTeX cannot express these structures, making JSON the better choice.

## Example Structure

```text
references.bib     # Pure bibliographic data
custom_info.json       # Blog metadata indexed by citation key
```

```json
{
  "suwa-2018-karadaga": {
    "cover_url": "https://books.google.com/books/content?id=yibkswEACAAJ&printsec=frontcover&img=1&zoom=1",
    "blogs": {
      "hugo": {
        "tags": ["creativity", "embodiment"],
        "review": "A fascinating exploration of..."
      },
      "astro": {
        "tags": ["books"],
        "review": "Different perspective for..."
      }
    }
  }
}
```

