/**
 * Identity & Session Service - F05 Test-mode and Credential Isolation Guard
 * Prevents test credentials or simulation modes from leaking into production.
 * Strictly fail-closed.
 */

export enum TestModeRejectionCode {
  PRODUCTION_SIMULATION_BLOCKED = 'LP01002',
  TEST_ADAPTER_DISABLED = 'LP01002',
  NON_TEST_PRINCIPAL_REJECTED = 'LP01002',
}

export interface TestModeGuardInput {
  readonly isProductionEnv: boolean;
  readonly allowSimulatedLogins: boolean;
  readonly requestedMode: 'SIMULATED' | 'LOCAL' | 'OIDC';
  readonly tenantId: string;
  readonly email: string;
}

export type TestModeDecision =
  | { readonly allowed: true }
  | { readonly allowed: false; readonly code: TestModeRejectionCode; readonly reason: string };

const TEST_EMAIL_DOMAINS = ['.test', '.example', '.local'];

/**
 * Validates that simulation or test credentials are never honored in production,
 * and restricts test login strictly to approved test email suffixes.
 */
export function evaluateTestModeGuard(input: TestModeGuardInput): TestModeDecision {
  const { isProductionEnv, allowSimulatedLogins, requestedMode, email } = input;

  // 1. Strict production block: Never allow simulated authentication in production
  if (isProductionEnv && (requestedMode === 'SIMULATED' || requestedMode === 'LOCAL')) {
    return {
      allowed: false,
      code: TestModeRejectionCode.PRODUCTION_SIMULATION_BLOCKED,
      reason: 'Simulated and local test authentication are strictly forbidden in production',
    };
  }

  // 2. Feature flag check
  if (!allowSimulatedLogins && (requestedMode === 'SIMULATED' || requestedMode === 'LOCAL')) {
    return {
      allowed: false,
      code: TestModeRejectionCode.TEST_ADAPTER_DISABLED,
      reason: 'Simulated test authentication adapter is disabled',
    };
  }

  // 3. Credential isolation check: only test domains permitted
  if (requestedMode === 'SIMULATED' || requestedMode === 'LOCAL') {
    const lowerEmail = email.toLowerCase();
    const isTestDomain = TEST_EMAIL_DOMAINS.some((suffix) => lowerEmail.endsWith(suffix));
    if (!isTestDomain) {
      return {
        allowed: false,
        code: TestModeRejectionCode.NON_TEST_PRINCIPAL_REJECTED,
        reason: 'Simulated login is strictly restricted to test email domains (*.test, *.example, *.local)',
      };
    }
  }

  return { allowed: true };
}
