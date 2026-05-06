#!/usr/bin/env node

import fs from 'fs';
import * as yaml from 'yaml';

const filepath = process.argv[2] || 'contents/custom_info.yaml';

try {
  const content = fs.readFileSync(filepath, 'utf8');
  const data = yaml.parse(content);

  // Sort keys alphabetically
  const sortedData = {};
  Object.keys(data)
    .sort()
    .forEach((key) => {
      sortedData[key] = data[key];
    });

  // Write back with proper formatting
  const output = yaml.stringify(sortedData, { lineWidth: -1 });
  fs.writeFileSync(filepath, output);
  console.log(`Sorted ${filepath}`);
} catch (error) {
  console.error(`Error: ${error.message}`);
  process.exit(1);
}
