#!/usr/bin/env node
/**
 * Interactive setup helper — copies .env.example -> .env if missing
 * and guides new contributors.
 */
const fs = require('fs');
const path = require('path');

function copyIfMissing(src, dest) {
  if (fs.existsSync(dest)) {
    console.log(`  ✓ ${dest} already exists — skipping`);
    return;
  }
  if (!fs.existsSync(src)) {
    console.log(`  ✗ Missing template: ${src}`);
    return;
  }
  fs.copyFileSync(src, dest);
  console.log(`  ✓ Created ${dest} from template`);
}

console.log('\n📦 DocuMind — First-time setup\n');

const root = path.resolve(__dirname, '..');
copyIfMissing(
  path.join(root, 'documind-backend', '.env.example'),
  path.join(root, 'documind-backend', '.env')
);
copyIfMissing(
  path.join(root, 'documind-frontend', '.env.local.example'),
  path.join(root, 'documind-frontend', '.env.local')
);

console.log(`
Next steps:
  1. Edit documind-backend/.env and add your MONGODB_URI + OPENAI_API_KEY
  2. Run  npm run install:all   (first time only)
  3. Run  npm run dev           (starts backend :5000 + frontend :3000)

Docs: see README.md
`);
