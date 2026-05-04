# ADR 0007: Email-Based Bibliography Entry Submission

**Date**: 2026-05-05
**Status**: Accepted
**Authors**: @rindrics
**Depends On**: ADR-0003 (YAML metadata structure), ADR-0002 (Git-native architecture)

## Context

Kotetsu manages bibliography entries via Git workflows. Users currently must manually edit BibTeX and YAML files, which requires Git knowledge and local setup. This creates friction for non-technical users who want to contribute bibliography entries.

### Current State

- Bibliography entries live in `contents/references.bib` (BibTeX) and `contents/custom_info.yaml` (metadata)
- Changes require Git commits and pull requests
- Reading date (`readDate`) is stored at entry level (post-refactor)
- Multi-site custom info stored per-site under each entry

### Requirements

1. **Low friction entry submission**: Email-based workflow for non-Git users
2. **Automatic validation**: ISBN format, date parsing, SPF/DKIM/DMARC authentication
3. **GitOps workflow**: Submission triggers GitHub Actions to create PR for manual review
4. **ISBN lookup**: Auto-match submitted ISBN to existing entry in `references.bib`
5. **Security**: Sender whitelist, strict email authentication
6. **No persistent email storage**: Email content used once and discarded

### Related ADRs

- **ADR-0001**: Citation keys as single source of truth ✓
- **ADR-0002**: Git-native architecture (PRs as review mechanism) ✓
- **ADR-0003**: Entry-level readDate in YAML (post-refactor) ✓

## Decision

Implement email-to-PR workflow using:

1. **Email Reception**: AWS SES with domain-based receipt rules
2. **Message Processing**: SNS → Lambda function (Node.js 18)
3. **Workflow Trigger**: GitHub Actions `repository_dispatch` event
4. **PR Creation**: GitHub CLI within Actions workflow

### Architecture

```
User Email (add@kotetsu.rindrics.com)
    ↓
AWS SES (domain MX records configured)
    ↓
SES Receipt Rules (recipient: add@kotetsu.rindrics.com)
    ↓
SNS Topic (ses-email-topic)
    ↓
Lambda Function (email-parser)
    ├─ Parse email body (ISBN + readDate)
    ├─ Validate sender (whitelist)
    ├─ Verify SPF/DKIM/DMARC (all required to pass)
    ├─ Call GitHub API: repository_dispatch event
    └─ Timeout: 5 seconds
    ↓
GitHub Actions Workflow (email-add-entry)
    ├─ Search references.bib for ISBN (awk-based record parser)
    ├─ Auto-generate citation key if not found (isbn-{ISBN})
    ├─ Append entry to custom_info.yaml with readDate
    ├─ Create feature branch (sanitized name: add-{citation_key})
    ├─ Create PR with ISBN/readDate/status in body
    └─ Manual merge required (human review)
```

### Infrastructure (Pulumi/AWS)

**File**: `infrastructure/email-setup.ts`

- **SNS Topic**: `ses-email-topic` (for SES receipt notifications)
- **Lambda Function**: `email-parser`
  - Runtime: Node.js 18.x
  - Handler: `infrastructure/lambda/index.ts`
  - Code source: `infrastructure/lambda/email-parser.ts`
  - Env vars: `ALLOWED_EMAIL_ADDRESSES`, `GITHUB_DISPATCH_TOKEN`
  - Timeout: 5 seconds (GitHub API call timeout)
- **SES Receipt Rule**: Routes emails to SNS topic
  - Recipient: Configurable via `sesReceiverEmail` Pulumi config (required, no default)

**Configuration** (`infrastructure/email-setup.ts`):

All configuration values are **required** (no defaults):

```typescript
const sesReceiverEmail = config.require('sesReceiverEmail');
const allowedEmailAddresses = config.require('allowedEmailAddresses');  // CSV format
const githubDispatchToken = config.requireSecret('githubDispatchToken');
```

Set via:
```bash
pulumi config set kotetsu:sesReceiverEmail "add@kotetsu.rindrics.com"
pulumi config set kotetsu:allowedEmailAddresses "alice@example.com,bob@example.com"
pulumi config set --secret kotetsu:githubDispatchToken "ghp_xxxx"
```

Or via GitHub Secrets (in CI/CD workflow):
```bash
pulumi config set kotetsu:sesReceiverEmail ${{ secrets.SES_RECEIVER_EMAIL }}
pulumi config set kotetsu:allowedEmailAddresses ${{ vars.ALLOWED_EMAIL_ADDRESSES }}
pulumi config set --secret kotetsu:githubDispatchToken ${{ secrets.GITHUB_TOKEN }}
```

### Workflow (GitHub Actions)

**File**: `.github/workflows/email-add-entry.yml`

1. **Trigger**: `repository_dispatch` event (type: `add-entry`)
2. **Payload**: `isbn`, `readDate` (from Lambda)
3. **Steps**:
   - ISBN lookup in BibTeX (awk-based record parser)
   - Duplicate check in YAML (awk field-equality)
   - readDate format validation (YYYY-MM-DD)
   - Append new entry to `custom_info.yaml`
   - Create feature branch (name sanitized: `add-{citation_key}`)
   - Create PR with status (matching BibTeX or auto-generated key warning)

### Security Considerations

1. **Email Authentication** (Lambda):
   - All three required: SPF, DKIM, DMARC must pass (AWS SES verdict)
   - Verdict normalization: AWS uppercase → title case (Pass/Fail)
   - Reject if any verdict missing or failed

2. **Sender Whitelist** (Lambda):
   - CSV-format list stored in Pulumi config
   - Compared case-sensitively
   - Rejects unknown senders before parsing

3. **Command Injection Prevention** (Workflow):
   - GitHub Actions payload injected via step-level `env:`, not inline shell
   - CITATION_KEY sanitized for branch names (allowed: alphanumeric, `.`, `_`, `-`)
   - YAML written with quoted keys and values
   - readDate pre-validated before heredoc injection

4. **Rate Limiting / DoS**:
   - Lambda timeout: 5 seconds
   - SES rate limits apply per account
   - No persistent queue; messages discarded after processing

5. **PII / Logging**:
   - Sender email masked in CloudWatch logs (`***@domain.com`)
   - ISBN/readDate logged (user-provided data, not PII)
   - GitHub token never logged

### Data Format

**Email Body**:
```
9784103396512
2026-05-04
```

- Line 1: ISBN-10 (check digit validated) or ISBN-13 (check digit validated, mod-10)
- Line 2: Read date (YYYY-MM-DD or YYYY/MM/DD, normalized to YYYY-MM-DD)

**GitHub Dispatch Payload**:
```json
{
  "event_type": "add-entry",
  "client_payload": {
    "isbn": "9784103396512",
    "readDate": "2026-05-04"
  }
}
```

**YAML Entry** (created by workflow):
```yaml
entry-citation-key:
  readDate: '2026-05-04'
  akirahayashi_com:
    tags: []
    review: ''
```

## Consequences

### Positive

1. **Low friction**: Non-Git users can submit entries via email
2. **Familiar interface**: Email is universally accessible
3. **Automatic validation**: Format checks before human review
4. **GitOps**: Manual PR review ensures quality control
5. **Audit trail**: GitHub PR history and commits capture all submissions
6. **Extensible**: Easy to add more email commands or payloads

### Negative / Trade-offs

1. **AWS Costs**: SES, SNS, Lambda incur small monthly fees
2. **Setup complexity**: Requires AWS, Pulumi, GitHub Actions coordination
3. **Email latency**: 1-2 second delay before PR appears (vs. direct git push)
4. **Limited to two fields**: Only ISBN and readDate per submission
5. **No reply**: User does not receive confirmation email (silent success/failure)
6. **IP reputation**: Email delivery depends on domain MX records and sender reputation

### Operational Burden

1. **Monitoring**: CloudWatch logs for Lambda errors and timeouts
2. **Configuration**: Whitelist maintenance (Pulumi config)
3. **GitHub token rotation**: Secret key must be rotated periodically
4. **SES sandbox mode**: Testing requires verified sender addresses

## Alternatives Considered

### Option A: Mailgun Webhook

**Pros**:
- Simpler setup (managed webhook)
- Built-in email validation

**Cons**:
- Paid service (Kotetsu on free plan)
- Reliance on third-party service
- Webhook exposed to Cloudflare Pages (not ideal for sensitive operations)

**Decision**: Rejected. AWS SES is free for <10K emails/month and integrates with infrastructure stack.

### Option B: Direct Git Commit (GitHub Web UI)

**Pros**:
- No infrastructure overhead
- Single source of truth (GitHub)

**Cons**:
- Requires Git/GitHub knowledge
- No offline support
- Friction for non-technical contributors

**Decision**: Rejected. Email workflow designed to lower barrier for contributors.

### Option C: Standalone Web Form (Cloudflare Pages Function)

**Pros**:
- Hosted on existing infrastructure
- No additional services

**Cons**:
- Requires validation/sanitization logic (security risk)
- State management (database) needed for duplicate/rate limiting
- Ongoing maintenance burden

**Decision**: Rejected. Lambda + email is more secure and aligns with event-driven architecture.

## Testing

### Unit Tests

- ISBN-10/13 validation (check digit)
- Date format parsing (YYYY-MM-DD, YYYY/MM/DD)
- Email authentication mock (SPF/DKIM/DMARC verdicts)
- PII masking (email address)
- Timeout behavior (AbortController)

### Integration Tests

1. **Local Lambda test**: `pnpm test` in `web/`
2. **Pulumi preview**: `cd infrastructure && pulumi preview`
3. **E2E (optional)**: Send test email to verified SES sandbox address

### Production Safeguards

- Sender whitelist limits who can trigger workflow
- Duplicate detection prevents re-submission
- Manual PR review catches any edge cases
- GitHub branch protection prevents direct merge

## Related Issues / PRs

- Issue #24: Email-to-PR workflow implementation
- PR #27: Ultrareview findings (security hardening)

## Future Enhancements

1. **Email confirmation**: Reply with PR link or error message
2. **Batch submissions**: Support multiple entries per email
3. **ISBN lookup service**: Online ISBN database integration
4. **Duplicate ISBN detection**: Warn if ISBN already exists before submission
5. **Custom fields**: Accept additional metadata (tags, review excerpt)
6. **Rate limiting**: Per-sender quota to prevent abuse
7. **Domain-based allowlist**: Accept `@example.com` instead of individual emails
