/**
 * Verification-Before-Completion Communication Lock Gate
 * Prevents agents from claiming completion without citing fresh, passing command execution evidence.
 */

export function verifyCompletionClaim(claim) {
  if (!claim) {
    return {
      allowed: false,
      reason: 'No claim payload provided'
    };
  }

  const { command, exitCode, stdoutDigest, executedAt } = claim;

  if (!command || typeof command !== 'string' || command.trim().length === 0) {
    return {
      allowed: false,
      reason: 'Completion claim MUST cite an explicit verification command'
    };
  }

  if (exitCode === undefined || exitCode === null) {
    return {
      allowed: false,
      reason: 'Completion claim MUST cite the process exit code'
    };
  }

  if (exitCode !== 0) {
    return {
      allowed: false,
      reason: `Verification command failed with exitCode ${exitCode}. Cannot claim completion.`
    };
  }

  if (!stdoutDigest || typeof stdoutDigest !== 'string') {
    return {
      allowed: false,
      reason: 'Completion claim MUST include verification output digest'
    };
  }

  return {
    allowed: true,
    protocol: 'VERIFICATION_BEFORE_COMPLETION',
    verifiedCommand: command,
    exitCode: 0,
    timestamp: executedAt || new Date().toISOString()
  };
}
