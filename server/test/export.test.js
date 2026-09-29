import test from 'node:test';
import assert from 'node:assert/strict';
import { toEpub, toPdf } from '../src/lib/export.js';

const doc = { title: 'Test Book', slug: 'test-book', content: '# Intro\nHello **world**.\n\n- a\n- b\n\n```js\nconst x = 1;\n```\n# Two\n> quote' };

test('EPUB export is a zip file', async () => {
  const buf = await toEpub(doc);
  assert.equal(buf.subarray(0, 2).toString(), 'PK');
});

test('PDF export is a PDF file', async () => {
  const buf = await toPdf(doc);
  assert.equal(buf.subarray(0, 4).toString(), '%PDF');
});
