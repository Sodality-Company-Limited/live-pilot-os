/**
 * Unit & Integration Tests for Core BFF Projection & Redis Adapter
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CoreBffProjectionAdapter, InMemoryRedisClient } from '../src/projections.js';

describe('G-CORE-085: Core BFF Projection and Redis Adapter', () => {
  it('reads active projections with freshness and versioning', async () => {
    const redis = new InMemoryRedisClient();
    const adapter = new CoreBffProjectionAdapter(redis, 5000);

    await adapter.writeProjection('session:sess_100:overview', { status: 'LIVE', viewerCount: 150 }, 1, 60);

    const result = await adapter.readProjection<{ status: string; viewerCount: number }>('session:sess_100:overview');
    assert.equal(result.found, true);
    assert.equal(result.isStale, false);
    assert.equal(result.version, 1);
    assert.deepEqual(result.data, { status: 'LIVE', viewerCount: 150 });
  });

  it('marks projection as stale when age exceeds max staleness window', async () => {
    const redis = new InMemoryRedisClient();
    // Adapter with 50ms staleness threshold
    const adapter = new CoreBffProjectionAdapter(redis, 50);

    await adapter.writeProjection('session:sess_200:overview', { status: 'DEGRADED' }, 2, 60);

    // Wait 70ms to exceed threshold
    await new Promise((resolve) => setTimeout(resolve, 70));

    const result = await adapter.readProjection<{ status: string }>('session:sess_200:overview');
    assert.equal(result.found, true);
    assert.equal(result.isStale, true);
    assert.equal(result.degradedReason, 'PROJECTION_STALE');
    assert.deepEqual(result.data, { status: 'DEGRADED' });
  });

  it('handles cache miss and expired TTL gracefully', async () => {
    const redis = new InMemoryRedisClient();
    const adapter = new CoreBffProjectionAdapter(redis);

    const result = await adapter.readProjection('session:nonexistent');
    assert.equal(result.found, false);
    assert.equal(result.degradedReason, 'KEY_NOT_FOUND');
  });

  it('safely degrades on malformed cache content', async () => {
    const redis = new InMemoryRedisClient();
    await redis.set('corrupt:key', 'invalid json {{{');
    const adapter = new CoreBffProjectionAdapter(redis);

    const result = await adapter.readProjection('corrupt:key');
    assert.equal(result.found, false);
    assert.equal(result.isStale, true);
    assert.ok(result.degradedReason);
  });
});
