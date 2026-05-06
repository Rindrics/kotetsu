/**
 * GitHub Actions workflow: Add bibliography entry from email
 *
 * Environment variables:
 * - ISBN: Book ISBN
 * - READDATE: Read date (YYYY-MM-DD)
 * - LAMBDA_API_URL: API Gateway endpoint (prod stage URL)
 * - LAMBDA_JWT_TOKEN: JWT token for API Gateway authorization
 * - GH_TOKEN: GitHub token for git operations
 */

import { execSync } from 'child_process';
import { appendFileSync, readFileSync } from 'fs';

const ISBN = process.env.ISBN;
const READDATE = process.env.READDATE;
const LAMBDA_API_URL = process.env.LAMBDA_API_URL;
const LAMBDA_JWT_TOKEN = process.env.LAMBDA_JWT_TOKEN;

if (!ISBN || !READDATE || !LAMBDA_API_URL || !LAMBDA_JWT_TOKEN) {
  console.error('Missing required environment variables');
  process.exit(1);
}

// Validate readDate format
if (!/^\d{4}-\d{2}-\d{2}$/.test(READDATE)) {
  console.error('Invalid readDate format:', READDATE);
  process.exit(1);
}

interface BookInfo {
  title: string;
  author: { first: string; last: string };
  year: number;
  publisher?: string;
  isbn13: string;
  isbn10?: string;
  url?: string;
}

async function main() {
  try {
    // Step 1: Fetch book info from Lambda
    console.log(`Fetching book info for ISBN: ${ISBN}`);

    const response = await fetch(`${LAMBDA_API_URL}isbn-search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LAMBDA_JWT_TOKEN}`,
      },
      body: JSON.stringify({ isbn: ISBN }),
    });

    if (!response.ok) {
      console.error(`Lambda error: ${response.status} ${response.statusText}`);
      process.exit(1);
    }

    const bookData = (await response.json()) as BookInfo | { error: string };

    if ('error' in bookData) {
      console.error('Lambda returned error:', bookData.error);
      process.exit(1);
    }

    const book = bookData as BookInfo;
    console.log(`Book: ${book.title} by ${book.author.last}, ${book.author.first} (${book.year})`);

    // Step 2: Generate citation key
    const { buildCitationKey } = await import('../models/isbn/citation-key');
    const { hasJapanese } = await import('../lib/romanize');

    // Romanizer function
    const romanizer = hasJapanese(book.author.last) || hasJapanese(book.title)
      ? async (text: string) => {
          const res = await fetch(`${LAMBDA_API_URL}romanize`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${LAMBDA_JWT_TOKEN}`,
            },
            body: JSON.stringify({ text }),
          });
          const data = (await res.json()) as { romaji: string };
          return data.romaji;
        }
      : undefined;

    const citationKey = await buildCitationKey(book.author, book.year, book.title, romanizer);
    console.log(`Generated citation key: ${citationKey}`);

    // Step 3: Check if entry already exists
    const customInfoPath = 'contents/custom_info.yaml';
    const customInfo = readFileSync(customInfoPath, 'utf-8');

    if (customInfo.includes(`"${citationKey":`)) {
      console.log('Entry already exists');
      console.log('duplicate=true');
      process.exit(0);
    }

    // Step 4: Add entry to YAML
    appendFileSync(
      customInfoPath,
      `\n"${citationKey}":\n  readDate: '${READDATE}'\n`,
    );

    // Step 5: Generate and add BibTeX entry
    const { formatAsBibEntry } = await import('../models/isbn/bibtex-formatter');

    const bibEntry = formatAsBibEntry(book, citationKey);
    appendFileSync('contents/references.bib', `\n${bibEntry}`);

    // Step 6: Format files
    try {
      execSync('make format', { stdio: 'inherit' });
    } catch {
      console.warn('Warning: make format failed, continuing anyway');
    }

    try {
      execSync('make format-yaml', { stdio: 'inherit' });
    } catch {
      console.warn('Warning: make format-yaml failed, continuing anyway');
    }

    // Step 7: Git operations
    const BRANCH_NAME = 'add-entry';

    // Check if PR exists
    let prNumber = '';
    try {
      const prList = JSON.parse(
        execSync(
          `gh pr list --head ${BRANCH_NAME} --base main --state open --json number`,
        ).toString(),
      ) as Array<{ number: string }>;
      if (prList.length > 0) {
        prNumber = prList[0].number;
      }
    } catch {
      // No PR found
    }

    if (prNumber) {
      execSync(`git fetch origin ${BRANCH_NAME} 2>/dev/null || true`);
      try {
        execSync(`git checkout ${BRANCH_NAME}`);
      } catch {
        execSync(`git checkout -b ${BRANCH_NAME} --track origin/${BRANCH_NAME}`);
      }
    } else {
      try {
        execSync(`git checkout -b ${BRANCH_NAME}`);
      } catch {
        execSync(`git checkout ${BRANCH_NAME}`);
      }
    }

    // Stage and commit
    execSync('git add contents/custom_info.yaml contents/references.bib');
    execSync(`git commit -m "feat: add ${citationKey} (read ${READDATE})"`);
    execSync(`git push --force-with-lease origin ${BRANCH_NAME} || true`);

    // Step 8: Create or update PR
    if (prNumber) {
      console.log(`Updated PR #${prNumber} with new entry: ${citationKey}`);
    } else {
      execSync(
        `gh pr create --title "Add entry" --body "Added from email

**ISBN**: \`${ISBN}\`
**Read date**: \`${READDATE}\`
**Citation key**: \`${citationKey}\`
**Title**: \`${book.title}\`
**Author**: ${book.author.last}, ${book.author.first}
**Year**: ${book.year}

Please review and merge if correct." --head ${BRANCH_NAME} --base main`,
      );
      console.log(`Created new PR with entry: ${citationKey}`);
    }

    console.log(`citation_key=${citationKey}`);
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
