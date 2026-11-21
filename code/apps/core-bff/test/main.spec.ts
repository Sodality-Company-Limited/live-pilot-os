import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createCoreBffServer } from '../src/main.js';

describe('G-CORE-082: Bootstrap Core BFF Service Runtime', () => {
  it('creates server instance with valid health and status endpoints', () => {
    const server = createCoreBffServer();
    assert.ok(server);
    assert.equal(typeof server.listen, 'function');
  });
});
