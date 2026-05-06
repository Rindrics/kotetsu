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

# Track if entry was found in .bib
FOUND_IN_BIB="true"
if [ -z "$CITATION_KEY" ]; then
  echo "No matching .bib entry found, generating citation key from ISBN"
  CITATION_KEY="isbn-$ISBN"
  FOUND_IN_BIB="false"
fi

# Check if entry already exists in custom_info.yaml
if awk -v k="$CITATION_KEY" -F: '$1==k{exit 0} END{exit 1}' contents/custom_info.yaml 2>/dev/null; then
  echo "duplicate=true"
  exit 0
fi

# Fixed branch name
BRANCH_NAME="add-entry"

# Check if PR already exists
PR_NUMBER=$(gh pr list --head "$BRANCH_NAME" --base "main" --state open --json number --jq '.[0].number' 2>/dev/null || echo "")

if [ -n "$PR_NUMBER" ]; then
  # PR exists, checkout existing branch and add commit
  git fetch origin "$BRANCH_NAME" 2>/dev/null || true
  git checkout "$BRANCH_NAME" || git checkout -b "$BRANCH_NAME" --track "origin/$BRANCH_NAME"
else
  # PR doesn't exist, create new branch
  git checkout -b "$BRANCH_NAME" 2>/dev/null || git checkout "$BRANCH_NAME"
fi

# Append new entry to custom_info.yaml
cat >> contents/custom_info.yaml << EOF

"$CITATION_KEY":
  readDate: '$READDATE'
EOF

# Build commit message based on entry type
if [ "$FOUND_IN_BIB" = "true" ]; then
  COMMIT_MSG="feat: add $CITATION_KEY from BibTeX (read $READDATE)"
else
  COMMIT_MSG="feat: add ISBN $ISBN (read $READDATE)"
fi

# Sort YAML entries by key
make format-yaml

# Stage and commit
git add contents/custom_info.yaml
git commit -m "$COMMIT_MSG"

# Push branch
git push --force-with-lease origin "$BRANCH_NAME" || true

# Determine BibTeX status
BIB_STATUS="matching .bib entry found"
if [[ "$CITATION_KEY" == isbn-* ]]; then
  BIB_STATUS="⚠️ No matching .bib entry - citation key auto-generated from ISBN. Please add to references.bib manually."
fi

# Create or update PR
if [ -n "$PR_NUMBER" ]; then
  # PR already exists, just update it
  echo "Updated PR #$PR_NUMBER with new entry: $CITATION_KEY"
else
  # Create new PR with fixed title
  gh pr create \
    --title "Add entry" \
    --body "Added from email

**ISBN**: \`$ISBN\`
**Read date**: \`$READDATE\`
**Citation key**: \`$CITATION_KEY\`
**Status**: $BIB_STATUS

Please review, add to references.bib if needed, and merge if correct." \
    --head "$BRANCH_NAME" \
    --base "main"
  echo "Created new PR with entry: $CITATION_KEY"
fi

echo "citation_key=$CITATION_KEY"
exit 0
