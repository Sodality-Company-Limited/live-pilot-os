import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluateTestModeGuard,
  TestModeGuardInput,
  TestModeRejectionCode,
} from '../src/test-mode.js';

describe('G-CORE-081: Enforce F05 Test-mode and Credential Isolation', () => {
  it('allows seeded test login when environment explicitly allows simulated/local mode', () => {
    const input: TestModeGuardInput = {
      isProductionEnv: false,
      allowSimulatedLogins: true,
      requestedMode: 'SIMULATED',
      tenantId: 'tenant-demo',
      email: 'host@example.test',
    };

    const decision = evaluateTestModeGuard(input);
    assert.equal(decision.allowed, true);
  });

  it('fails closed when simulated login is attempted in production environment', () => {
    const input: TestModeGuardInput = {
      isProductionEnv: true,
      allowSimulatedLogins: true,
      requestedMode: 'SIMULATED',
      tenantId: 'tenant-prod',
      email: 'host@example.com',
    };

    const decision = evaluateTestModeGuard(input);
    assert.equal(decision.allowed, false);
    if (!decision.allowed) {
      assert.equal(decision.code, TestModeRejectionCode.PRODUCTION_SIMULATION_BLOCKED);
    }
  });

  it('fails closed when allowSimulatedLogins flag is disabled', () => {
    const input: TestModeGuardInput = {
      isProductionEnv: false,
      allowSimulatedLogins: false,
      requestedMode: 'SIMULATED',
      tenantId: 'tenant-demo',
      email: 'host@example.test',
    };

    const decision = evaluateTestModeGuard(input);
    assert.equal(decision.allowed, false);
    if (!decision.allowed) {
      assert.equal(decision.code, TestModeRejectionCode.TEST_ADAPTER_DISABLED);
    }
  });

  it('fails closed when non-test domain email is used in test-mode', () => {
    const input: TestModeGuardInput = {
      isProductionEnv: false,
      allowSimulatedLogins: true,
      requestedMode: 'SIMULATED',
      tenantId: 'tenant-demo',
      email: 'realuser@gmail.com',
    };

    const decision = evaluateTestModeGuard(input);
    assert.equal(decision.allowed, false);
    if (!decision.allowed) {
      assert.equal(decision.code, TestModeRejectionCode.NON_TEST_PRINCIPAL_REJECTED);
    }
  });
});
