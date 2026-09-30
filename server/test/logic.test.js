import test from 'node:test';
import assert from 'node:assert/strict';
import { safePreview } from '../src/routes/public.js';
import { originAllowed } from '../src/routes/checkout.js';

test('safePreview: content under the limit is returned unchanged', () => {
  assert.equal(safePreview('short content'), 'short content');
});

test('safePreview: never cuts in the middle of a word', () => {
  const content = 'word '.repeat(400) + 'tail'; // well over the 1500-char limit
  const preview = safePreview(content);
  assert.ok(preview.endsWith('…'));
  const body = preview.slice(0, -1);
  assert.equal(body, body.trimEnd());
  assert.notEqual(body.at(-1), ' ');
  // every remaining token must be a whole "word", never a fragment
  assert.ok(body.split(' ').every((w) => w === '' || w === 'word'));
});

test('safePreview: prefers a paragraph break over a mid-sentence cut when one is close by', () => {
  const para = 'a'.repeat(1400);
  const content = `${para}\n\n${'This second paragraph goes on for a while past the limit and should be dropped entirely. '.repeat(3)}`;
  assert.ok(content.length > 1500, 'test content must exceed the preview limit');
  const preview = safePreview(content);
  assert.ok(preview.startsWith(para));
  assert.ok(!preview.includes('second paragraph'));
});

test('originAllowed: same-origin and no-origin (non-browser) requests pass', () => {
  process.env.CLIENT_URL = 'https://app.example.com';
  delete process.env.ALLOWED_ORIGINS;
  const doc = { customDomain: undefined };
  assert.equal(originAllowed({ headers: {} }, doc), true);
  assert.equal(originAllowed({ headers: { origin: 'https://app.example.com' } }, doc), true);
});

test('originAllowed: an unrelated third-party site is rejected', () => {
  process.env.CLIENT_URL = 'https://app.example.com';
  const doc = { customDomain: undefined };
  assert.equal(originAllowed({ headers: { origin: 'https://evil.example.net' } }, doc), false);
});

test('originAllowed: a book\'s own custom domain is allowed even if not in ALLOWED_ORIGINS', () => {
  process.env.CLIENT_URL = 'https://app.example.com';
  const doc = { customDomain: 'docs.author.com' };
  assert.equal(originAllowed({ headers: { origin: 'https://docs.author.com' } }, doc), true);
  assert.equal(originAllowed({ headers: { origin: 'https://other-authors-site.com' } }, doc), false);
});
