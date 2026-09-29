import test from 'node:test';
import assert from 'node:assert/strict';
import { splitChapters } from '../src/lib/markdown.js';

test('splits on top-level headings and ignores # inside code fences', () => {
  const ch = splitChapters('# One\nhello\n```bash\n# not a chapter\n```\n# Two\nworld', 'Book');
  assert.deepEqual(ch.map((c) => c.title), ['One', 'Two']);
  assert.match(ch[0].content, /not a chapter/);
});

test('content before the first heading uses the fallback title; empty input still yields a chapter', () => {
  assert.equal(splitChapters('intro\n# A', 'Book')[0].title, 'Book');
  assert.equal(splitChapters('', 'Book').length, 1);
});
