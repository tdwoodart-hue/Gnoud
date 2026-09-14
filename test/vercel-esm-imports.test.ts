import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { existsSync } from 'node:fs';
import { globSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

test('Vercel functions only import physical JavaScript helpers', () => {
  const invalid: string[] = [];
  for (const file of globSync('api/notifications/*.ts')) {
    const source = readFileSync(file, 'utf8');
    for (const match of source.matchAll(/(?:from\s+|import\()(['"])(\.\.?\/[^'"]+)\1/g)) {
      if (!match[2].endsWith('.js') || !existsSync(resolve(dirname(file), match[2]))) invalid.push(`${file}: ${match[2]}`);
    }
  }
  assert.deepEqual(invalid, []);
});
