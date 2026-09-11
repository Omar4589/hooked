// packages/levels/src must stay importable by Vite and Metro, exactly like the engine's: no
// Node-only APIs, no filesystem. The one construct the engine bans that the registry needs is
// the JSON import attribute, so that pattern is deliberately absent from the list below.

import { readdirSync, readFileSync } from 'node:fs';

const srcDir = new URL('../src/', import.meta.url);

const stripCommentsAndStrings = (code) =>
  code
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/\/\/[^\n]*/g, ' ')
    .replace(/`(?:\\.|[^`\\])*`/g, '``')
    .replace(/'(?:\\.|[^'\\\n])*'/g, "''")
    .replace(/"(?:\\.|[^"\\\n])*"/g, '""');

const forbidden = [
  /\brequire\s*\(/,
  /\bprocess\s*\./,
  /\bBuffer\b/,
  /\bcrypto\b/,
  /\bstructuredClone\b/,
  /\bsetTimeout\b/,
  /\bsetInterval\b/,
  // Hermes / Node 20 subset (plan): keep these out of src/
  /\.at\s*\(/,
  /\bObject\.hasOwn\b/,
  /\.toSorted\s*\(/,
  /\bObject\.groupBy\b/,
  /\.union\s*\(/,
];

const nodeImport = /from\s+['"]node:|from\s+['"](fs|path|os|crypto|child_process|url)['"]/;

test('the comment and string stripper ignores prose', () => {
  const code = "// not cryptographically secure\nconst s = 'process.'; /* Buffer */ let x = 1;";
  const stripped = stripCommentsAndStrings(code);
  expect(stripped).not.toMatch(/crypto/);
  expect(stripped).not.toMatch(/process\./);
  expect(stripped).not.toMatch(/Buffer/);
});

test('no src module reaches for Node-only APIs', () => {
  const files = readdirSync(srcDir).filter((f) => f.endsWith('.js'));
  expect(files.length).toBeGreaterThan(0);
  for (const file of files) {
    const raw = readFileSync(new URL(file, srcDir), 'utf8');
    expect({ file, nodeImport: nodeImport.test(raw) }).toEqual({ file, nodeImport: false });
    const code = stripCommentsAndStrings(raw);
    for (const re of forbidden) {
      expect({ file, pattern: String(re), hit: re.test(code) }).toEqual({
        file,
        pattern: String(re),
        hit: false,
      });
    }
  }
});
