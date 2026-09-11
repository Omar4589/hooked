import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';

// Mounts the app on an ephemeral port; no database needed for this route.
const withServer = async (fn) => {
  const server = createApp().listen(0);
  try {
    await fn(`http://127.0.0.1:${server.address().port}`);
  } finally {
    server.close();
  }
};

test('GET /api/health answers ok', async () => {
  await withServer(async (base) => {
    const res = await fetch(`${base}/api/health`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.ok, true);
    assert.equal(body.service, 'hooked-api');
  });
});

test('unknown routes answer JSON 404', async () => {
  await withServer(async (base) => {
    const res = await fetch(`${base}/api/nope`);
    assert.equal(res.status, 404);
    assert.deepEqual(await res.json(), { error: 'Not found' });
  });
});
