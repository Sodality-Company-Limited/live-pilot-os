/**
 * Branch-Finishing Protocol & Pre-PR Health Gate
 * Validates branch readiness before PR opening or integration.
 */

export function checkBranchHealth(healthMetrics) {
  const issues = [];
  if (!healthMetrics) {
    return {
      healthy: false,
      issues: ['No health metrics provided']
    };
  }

  const { isCleanTree, testsPassed, activeGoalsUnarchived, branchName } = healthMetrics;

  if (isCleanTree !== true) {
    issues.push('Git working tree is dirty (uncommitted or unstaged changes)');
  }

  if (testsPassed !== true) {
    issues.push('Automated test suite has failing or unexecuted tests');
  }

  if (activeGoalsUnarchived > 0) {
    issues.push(`Branch has ${activeGoalsUnarchived} unarchived goal cards in docs/07-backlog/goals/`);
  }

  if (!branchName || !/^feature\/[A-Za-z0-9_-]+$/.test(branchName)) {
    issues.push(`Invalid branch name format: "${branchName}". Must follow feature/G-xxx or feature/<topic>`);
  }

  const healthy = issues.length === 0;
  return {
    healthy,
    protocol: 'PRE_PR_BRANCH_FINISHING',
    branch: branchName || 'unknown',
    issues
  };
}
