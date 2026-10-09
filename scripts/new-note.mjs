#!/usr/bin/env node
// Usage: npm run new "My note title" [tag1,tag2]
import { writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const title = process.argv[2];
if (!title) {
  console.error('Usage: npm run new "Note title" [tag1,tag2]');
  process.exit(1);
}
const tags = (process.argv[3] ?? '').split(',').map((t) => t.trim()).filter(Boolean);
const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const file = join('src', 'content', 'notes', `${slug}.md`);
if (existsSync(file)) {
  console.error(`Already exists: ${file}`);
  process.exit(1);
}
const today = new Date().toISOString().slice(0, 10);
writeFileSync(
  file,
  `---\ntitle: ${JSON.stringify(title)}\nstatus: seedling\ncreated: ${today}\ntags: [${tags.join(', ')}]\n---\n\n`
);
console.log(`Planted ${file}`);
