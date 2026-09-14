import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { globSync } from 'node:fs';

test('Vercel builder can resolve every relative TypeScript import', () => {
  const invalid: string[] = [];
  for (const file of globSync('api/**/*.ts')) {
    const source = readFileSync(file, 'utf8');
    for (const match of source.matchAll(/(?:from\s+|import\()(['"])(\.\.?\/[^'"]+)\1/g)) {
      if (!match[2].endsWith('.ts')) invalid.push(`${file}: ${match[2]}`);
    }
  }
  assert.deepEqual(invalid, []);
});
