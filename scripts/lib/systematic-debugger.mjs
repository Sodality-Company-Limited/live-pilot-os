/**
 * Systematic Debugging Engine
 * Enforces 4-phase root cause isolation:
 * Phase 1: Observation & Evidence Collection
 * Phase 2: Hypothesis Formulation
 * Phase 3: Minimal Deterministic Reproduction
 * Phase 4: Root Cause Resolution & Invariant Verification
 */

export function isolateRootCause(failureRecord) {
  if (!failureRecord || !failureRecord.errorMessage) {
    return {
      valid: false,
      error: 'Failure record must include errorMessage and execution context'
    };
  }

  const observation = {
    error_message: failureRecord.errorMessage,
    exit_code: failureRecord.exitCode ?? 1,
    failed_test: failureRecord.failedTest || 'unknown',
    captured_logs: (failureRecord.logs || []).slice(-10)
  };

  const hypothesis = failureRecord.hypothesis || `Hypothesis: Execution failed at ${observation.failed_test} due to ${observation.error_message}`;
  const reproductionCommand = failureRecord.reproductionCommand || `node --test ${observation.failed_test}`;

  return {
    valid: true,
    protocol: 'SYSTEMATIC_DEBUGGING_4_PHASE',
    phases: {
      phase_1_observation: observation,
      phase_2_hypothesis: hypothesis,
      phase_3_reproduction: {
        command: reproductionCommand,
        deterministic: true
      },
      phase_4_resolution_strategy: {
        prohibited_actions: [
          'Suppressing assertion without understanding',
          'Wrapping in ad-hoc empty catch block',
          'Trial-and-error shotgun code modification'
        ],
        required_evidence: 'Failing reproduction test passes green with real operational fix'
      }
    }
  };
}
