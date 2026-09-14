import assert from 'node:assert/strict';
import test from 'node:test';
import api, { articleAPI, authAPI, commentAPI } from './api.js';

test('guest reading stays on the article; protected actions still require login', async () => {
  const storage = new Map([['token', 'expired-token'], ['user', '{}']]);
  globalThis.localStorage = {
    getItem: (key) => storage.get(key) ?? null,
    removeItem: (key) => storage.delete(key),
  };
  globalThis.window = { location: { pathname: '/articles/1', href: '/articles/1' } };
  const originalAdapter = api.defaults.adapter;
  api.defaults.adapter = async (config) => {
    if (config.url === '/auth/me' || config.method === 'post') {
      throw Object.assign(new Error('Unauthorized'), { config, response: { status: 401 } });
    }
    assert.equal(config.headers.Authorization, undefined);
    return { config, status: 200, data: { content: 'Public content' } };
  };

  try {
    await assert.rejects(authAPI.getMe());
    assert.equal(window.location.href, '/articles/1');
    assert.equal(storage.has('token'), false);
    assert.equal(storage.has('user'), false);

    assert.equal((await articleAPI.get(1)).status, 200);
    assert.equal((await commentAPI.list(1)).status, 200);
    assert.equal(window.location.href, '/articles/1');

    await assert.rejects(commentAPI.create(1, { content: 'A comment' }));
    assert.equal(window.location.href, '/login');
  } finally {
    api.defaults.adapter = originalAdapter;
    delete globalThis.localStorage;
    delete globalThis.window;
  }
});
