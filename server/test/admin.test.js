import test from 'node:test';
import assert from 'node:assert/strict';
import { requireAdmin } from '../src/middleware/admin.js';

const run = (header) => {
  let status = 0, nexted = false;
  const res = { status: (s) => ((status = s), { json: () => {} }) };
  requireAdmin({ headers: { authorization: header } }, res, () => (nexted = true));
  return { status, nexted };
};

test('open when ADMIN_PASSWORD is unset', () => {
  delete process.env.ADMIN_PASSWORD;
  assert.equal(run(undefined).nexted, true);
});

test('rejects wrong password and accepts the right one', () => {
  process.env.ADMIN_PASSWORD = 'secret-pass';
  assert.equal(run('Bearer nope').status, 401);
  assert.equal(run(undefined).status, 401);
  assert.equal(run('Bearer secret-pass').nexted, true);
});
