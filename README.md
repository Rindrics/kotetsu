# Kotetsu

A bibliography management system for personal blogs.

## Overview

Manage a single BibTeX file (`references.bib`) as a database, with blog-specific metadata stored in a separate YAML file (`custom_info.yaml`). Both files are joined by citation key.

## Development

Start local server:

```bash
cd web
pnpm run dev
```

### Adding Bibliography Entries

#### Option 1: Direct Import (Workaround)

For quick bulk imports, place `.bibtex` files in the `contents/` directory and run:

```bash
make import
```

This merges all `*.bibtex` files into `references.bib` and removes the originals.

**Note**: This is a temporary workaround until a proper frontend UI for adding entries is built. In the future, entries will be added through the web interface.

#### Option 2: Manual Addition

1. Add entries directly to `contents/references.bib`
2. Format and validate:

   ```bash
   make format
   make check
   ```

3. Add blog-specific metadata to `contents/custom_info.yaml` if needed

### Validation

Ensure data integrity:

```bash
make check          # Format + lint
make validate-sync  # Verify keys match between .bib and .yaml
```
