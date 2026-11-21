/**
 * ════════════════════════════════════════════════════════════════════════════════
 * 🛡️ UNIT TESTS: CENTRAL ECOSYSTEM PARITY SYNCHRONIZATION (G-UX-028)
 * ════════════════════════════════════════════════════════════════════════════════
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const syncLib = require('../../scripts/goals/sync-ecosystem.js');

describe('G-UX-028: Central Ecosystem UX Parity & Synchronization', () => {
  let tmpBase;

  beforeEach(() => {
    tmpBase = fs.mkdtempSync(path.join(os.tmpdir(), 'soda-sync-ux-test-'));
  });

  afterEach(() => {
    if (tmpBase && fs.existsSync(tmpBase)) {
      fs.rmSync(tmpBase, { recursive: true, force: true });
    }
  });

  describe('1. Schema Registry & Dynamic Scanning', () => {
    it('registers and dynamically discovers all UX and core schemas', () => {
      const schemas = syncLib.SOURCE_FILES.schemas;
      assert.ok(Array.isArray(schemas), 'schemas should be an array');
      assert.ok(schemas.length >= 5, `Expected >= 5 schemas, got ${schemas.length}`);

      const schemaNames = schemas.map((s) => s.name);
      assert.ok(schemaNames.includes('goal-contract.schema.json'));
      assert.ok(schemaNames.includes('ux-decision-contract.schema.json'));
      assert.ok(schemaNames.includes('ui-scene-graph.schema.json'));
      assert.ok(schemaNames.includes('ui-taxonomy.schema.json'));
      assert.ok(schemaNames.includes('model-provenance.schema.json'));

      for (const sc of schemas) {
        assert.ok(fs.existsSync(sc.src), `Schema file must exist: ${sc.src}`);
      }
    });
  });

  describe('2. UX Libraries Registry', () => {
    it('registers all Milestone 6 UX decision, AST, and telemetry libraries', () => {
      const libFiles = syncLib.SOURCE_FILES.libScripts;
      const libNames = libFiles.map((l) => l.name);

      assert.ok(libNames.includes('react-ast-generator.mjs'));
      assert.ok(libNames.includes('hitl-review-packet.mjs'));
      assert.ok(libNames.includes('merkle-decision-ledger.mjs'));
      assert.ok(libNames.includes('ux-calibration-drift-monitor.mjs'));
      assert.ok(libNames.includes('multi-currency-money.mjs'));
      assert.ok(libNames.includes('dark-pattern-safety-gate.mjs'));
      assert.ok(libNames.includes('ux-decision-contract.mjs'));
      assert.ok(libNames.includes('ux-decision-lifecycle.mjs'));
      assert.ok(libNames.includes('ui-scene-graph.mjs'));

      for (const lib of libFiles) {
        assert.ok(fs.existsSync(lib.src), `Library script must exist: ${lib.src}`);
      }
    });
  });

  describe('3. UX Harnesses Registry', () => {
    it('registers all Milestone 6 verification harnesses', () => {
      const harnessFiles = syncLib.SOURCE_FILES.harnessScripts;
      const harnessNames = harnessFiles.map((h) => h.name);

      assert.ok(harnessNames.includes('react-ast-guardrail-harness.mjs'));
      assert.ok(harnessNames.includes('hitl-review-packet-harness.mjs'));
      assert.ok(harnessNames.includes('merkle-decision-ledger-harness.mjs'));
      assert.ok(harnessNames.includes('ux-telemetry-drift-harness.mjs'));

      for (const h of harnessFiles) {
        assert.ok(fs.existsSync(h.src), `Harness script must exist: ${h.src}`);
      }
    });
  });

  describe('4. Tier A Synchronization Pass & Zero Drift', () => {
    it('synchronizes all schemas, rules, libs, and harnesses to mock target repo with zero drift', () => {
      const mockProject = path.join(tmpBase, 'sodality-mock-app');
      fs.mkdirSync(path.join(mockProject, 'docs/07-backlog/goals'), { recursive: true });
      fs.mkdirSync(path.join(mockProject, '.agents/rules'), { recursive: true });

      // First sync: Copies files
      const syncResult1 = syncLib.syncProject(mockProject, false, ['A']);
      assert.equal(syncResult1.status, 'SYNCED');
      assert.ok(syncResult1.actions.length > 0);

      // Verify synchronized UX files exist in target
      assert.ok(fs.existsSync(path.join(mockProject, 'schemas/ux-decision-contract.schema.json')));
      assert.ok(fs.existsSync(path.join(mockProject, 'schemas/ui-scene-graph.schema.json')));
      assert.ok(fs.existsSync(path.join(mockProject, 'scripts/lib/react-ast-generator.mjs')));
      assert.ok(fs.existsSync(path.join(mockProject, 'scripts/lib/hitl-review-packet.mjs')));
      assert.ok(fs.existsSync(path.join(mockProject, 'scripts/lib/merkle-decision-ledger.mjs')));
      assert.ok(fs.existsSync(path.join(mockProject, 'scripts/lib/ux-calibration-drift-monitor.mjs')));

      // Second sync: Should report up-to-date with 0 changed files (Zero Drift)
      const syncResult2 = syncLib.syncProject(mockProject, false, ['A']);
      const updatedCount = syncResult2.actions.filter((a) => a.action === 'updated' || a.action === 'created').length;
      assert.equal(updatedCount, 0, 'Re-synchronization must detect 0 changes / zero drift');
    });
  });
});
