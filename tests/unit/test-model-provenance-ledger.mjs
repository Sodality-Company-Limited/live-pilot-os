import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeFileSha256,
  computeBufferSha256,
  signPayloadHmac,
  verifyPayloadHmac,
  validateProvenanceSchema,
  ModelProvenanceLedger,
  runModelProvenanceVerification,
  GENESIS_PREV_HASH
} from '../../scripts/lib/model-provenance-ledger.mjs';

test('computeBufferSha256 and signPayloadHmac generate deterministic signatures', () => {
  const hash = computeBufferSha256('test_payload_123');
  assert.strictEqual(hash.length, 64);

  const payload = { b: 2, a: 1, c: [1, 2, 3] };
  const sig1 = signPayloadHmac(payload);
  const sig2 = signPayloadHmac({ c: [1, 2, 3], a: 1, b: 2 }); // Key order independent
  assert.strictEqual(sig1, sig2);

  const isValid = verifyPayloadHmac(payload, sig1);
  assert.strictEqual(isValid, true);

  const isInvalid = verifyPayloadHmac({ ...payload, a: 99 }, sig1);
  assert.strictEqual(isInvalid, false);
});

test('validateProvenanceSchema validates valid vs invalid manifests', () => {
  const validManifest = {
    schema_version: 1,
    model_id: 'test-model',
    base_checkpoint: 'gemma-4-base',
    source_revision: 'c960e7d8fb2daa110feaead40f33b785c7e345bd',
    generated_at: new Date().toISOString(),
    dataset_lineage: {
      stage2_scene_graphs_sha256: 'a'.repeat(64),
      stage4_trajectories_sha256: 'b'.repeat(64),
      stage5_preferences_sha256: 'c'.repeat(64)
    },
    tokenizer: { name: 'tok', sha256: 'd'.repeat(64) },
    training_config: { lora_rank: 16, lora_alpha: 32, learning_rate: 1e-4, beta: 0.2, epochs: 3, random_seed: 42 },
    evaluation_metrics: { json_schema_conformance: 0.99, dpo_win_rate: 0.75, ece: 0.03, brier: 0.08, auroc: 0.92, hcer: 0.005 },
    artifacts: [{ path: 'test.bin', sha256: 'e'.repeat(64) }],
    block_index: 0,
    previous_block_hash: GENESIS_PREV_HASH,
    hmac_signature: 'f'.repeat(64)
  };

  const resValid = validateProvenanceSchema(validManifest);
  assert.strictEqual(resValid.valid, true, `Errors: ${resValid.errors.join(', ')}`);

  const invalidManifest = { ...validManifest, schema_version: 2 };
  const resInvalid = validateProvenanceSchema(invalidManifest);
  assert.strictEqual(resInvalid.valid, false);
});

test('ModelProvenanceLedger chains blocks and detects tampering', () => {
  const ledger = new ModelProvenanceLedger();

  // Genesis block
  const b0 = ledger.appendBlock({ modelId: 'model-v1' });
  assert.strictEqual(b0.block_index, 0);
  assert.strictEqual(b0.previous_block_hash, GENESIS_PREV_HASH);

  // Block 1
  const b1 = ledger.appendBlock({ modelId: 'model-v2' });
  assert.strictEqual(b1.block_index, 1);
  assert.notStrictEqual(b1.previous_block_hash, GENESIS_PREV_HASH);

  // Ledger verification should pass
  const verifyRes = ledger.verifyLedger();
  assert.strictEqual(verifyRes.valid, true, `Errors: ${verifyRes.errors.join(', ')}`);
  assert.strictEqual(verifyRes.blockCount, 2);

  // Tamper detection: modify a value in Block 0
  b0.model_id = 'tampered-model';
  const tamperRes = ledger.verifyLedger();
  assert.strictEqual(tamperRes.valid, false);
  assert.ok(tamperRes.errors.some(e => e.includes('Invalid HMAC-SHA256 signature') || e.includes('Broken hash chain')));
});

test('runModelProvenanceVerification executes full verification successfully', async () => {
  const summary = await runModelProvenanceVerification();

  assert.strictEqual(summary.pipeline, 'cryptographic_model_provenance_ledger');
  assert.strictEqual(summary.goal_id, 'G-UX-019');
  assert.strictEqual(summary.passed, true);
  assert.strictEqual(summary.ledger_chain.total_blocks, 2);
  assert.strictEqual(summary.ledger_chain.chain_verified, true);
});
