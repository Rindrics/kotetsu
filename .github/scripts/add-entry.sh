#!/bin/bash
set -euo pipefail

ISBN="${1:?ISBN is required}"
READDATE="${2:?READDATE is required}"

# Validate readDate format (YYYY-MM-DD)
if ! [[ "$READDATE" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}$ ]]; then
  echo "Invalid readDate format: $READDATE"
  exit 1
fi

# Use awk for robust BibTeX record-based parsing
CITATION_KEY=$(awk -v isbn="$ISBN" 'BEGIN{RS=""; FS="\n"} tolower($0) ~ tolower("isbn.*" isbn) {
  for (i=1; i<=NF; i++) {
    if ($i ~ /^@/) {
      match($i, /{([^,]+)/, arr)
      print arr[1]
      exit
    }
  }
}' contents/references.bib 2>/dev/null || true)

# If not found, generate citation key from ISBN
if [ -z "$CITATION_KEY" ]; then
  echo "No matching .bib entry found, generating citation key from ISBN"
  CITATION_KEY="isbn-$ISBN"
fi

# Check if entry already exists in custom_info.yaml
if awk -v k="$CITATION_KEY" -F: '$1==k{exit 0} END{exit 1}' contents/custom_info.yaml 2>/dev/null; then
  echo "duplicate=true"
  exit 0
fi

# Append new entry to custom_info.yaml
cat >> contents/custom_info.yaml << EOF

"$CITATION_KEY":
  readDate: '$READDATE'
EOF

# Sanitize CITATION_KEY for use in branch name
SAFE_KEY="${CITATION_KEY//[^A-Za-z0-9._-]/-}"

# Create and checkout new branch
git checkout -b "add-$SAFE_KEY"

# Stage and commit (use original CITATION_KEY for message)
git add contents/custom_info.yaml
git commit -m "feat: add $CITATION_KEY (read $READDATE)"

# Push branch
git push origin "add-$SAFE_KEY"

# Determine BibTeX status
BIB_STATUS="matching .bib entry found"
if [[ "$CITATION_KEY" == isbn-* ]]; then
  BIB_STATUS="⚠️ No matching .bib entry - citation key auto-generated from ISBN. Please add to references.bib manually."
fi

# Create Pull Request
gh pr create \
  --title "Add $CITATION_KEY" \
  --body "$(printf 'Added from email\n\n**ISBN**: %s\n**Read date**: %s\n**Status**: %s\n\nPlease review, add to references.bib if needed, and merge if correct.' "$ISBN" "$READDATE" "$BIB_STATUS")" \
  --head "add-$SAFE_KEY" \
  --base "main"

echo "citation_key=$CITATION_KEY"
echo "safe_key=$SAFE_KEY"
