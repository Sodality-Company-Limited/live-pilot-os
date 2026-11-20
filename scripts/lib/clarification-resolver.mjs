/**
 * Socratic Clarification Resolver & State Machine Path Manager
 *
 * Provides canonical resolution, migration, and metadata management for goal-partitioned
 * clarification files (CLARIFICATION-{GOAL-ID}.md), replacing shared CLARIFICATION.md
 * to eliminate concurrency hazards across concurrent subagents and developer sessions.
 */

import fs from 'node:fs';
import path from 'node:path';

/**
 * Normalizes a Goal ID (e.g., 'g-evolve-013' -> 'G-EVOLVE-013', 'G-193' -> 'G-193')
 * @param {string} goalId
 * @returns {string}
 */
export function normalizeGoalId(goalId) {
  if (!goalId || typeof goalId !== 'string') {
    throw new Error(`Invalid goalId provided: ${goalId}`);
  }
  const trimmed = goalId.trim();
  if (trimmed.startsWith('g-') || trimmed.startsWith('G-')) {
    const parts = trimmed.split('-');
    return ['G', ...parts.slice(1)].join('-').toUpperCase();
  }
  return trimmed.toUpperCase();
}

/**
 * Derives the active filename for a given goal
 * @param {string} goalId
 * @returns {string}
 */
export function getClarificationFilename(goalId) {
  return `CLARIFICATION-${normalizeGoalId(goalId)}.md`;
}

/**
 * Resolves the path to the clarification file for a goal.
 * By default:
 * 1. Returns active path if it exists (<repo_root>/CLARIFICATION-{GOAL-ID}.md)
 * 2. Checks archived path if options.checkArchived !== false (<repo_root>/docs/07-backlog/clarifications/CLARIFICATION-{GOAL-ID}.md)
 * 3. Checks legacy root path if options.legacyFallback !== false (<repo_root>/CLARIFICATION.md) if it matches goalId
 * 4. Falls back to canonical active path for new file generation.
 *
 * @param {string} repoRoot
 * @param {string} goalId
 * @param {{ checkArchived?: boolean, legacyFallback?: boolean }} [options]
 * @returns {string}
 */
export function resolveClarificationPath(repoRoot, goalId, options = {}) {
  const cleanGoalId = normalizeGoalId(goalId);
  const filename = getClarificationFilename(cleanGoalId);
  const activePath = path.join(repoRoot, filename);
  const archivedPath = path.join(repoRoot, 'docs/07-backlog/clarifications', filename);
  const legacyPath = path.join(repoRoot, 'CLARIFICATION.md');

  if (fs.existsSync(activePath)) {
    return activePath;
  }

  if (options.checkArchived !== false && fs.existsSync(archivedPath)) {
    return archivedPath;
  }

  if (options.legacyFallback !== false && fs.existsSync(legacyPath)) {
    try {
      const content = fs.readFileSync(legacyPath, 'utf8');
      const extractedGoal = extractGoalIdFromMarkdown(content);
      if (extractedGoal && normalizeGoalId(extractedGoal) === cleanGoalId) {
        return legacyPath;
      }
    } catch {
      // Fall through to active path if unreadable
    }
  }

  return activePath;
}

/**
 * Resolves the destination archived path for a completed clarification file.
 * @param {string} repoRoot
 * @param {string} goalId
 * @returns {string}
 */
export function resolveArchivedClarificationPath(repoRoot, goalId) {
  const filename = getClarificationFilename(goalId);
  return path.join(repoRoot, 'docs/07-backlog/clarifications', filename);
}

/**
 * Extracts Goal ID from a markdown clarification content string.
 * @param {string} content
 * @returns {string | null}
 */
export function extractGoalIdFromMarkdown(content) {
  if (!content || typeof content !== 'string') {
    return null;
  }

  // 1. Explicit Goal ID line: > **Goal ID:** `G-xxx` or **Goal ID:** G-xxx
  const goalIdMatch = content.match(/(?:>\s*)?\*\*Goal ID:\*\*\s*`?([A-Za-z0-9_-]+)`?/i);
  if (goalIdMatch && goalIdMatch[1]) {
    return normalizeGoalId(goalIdMatch[1]);
  }

  // 2. Goal reference line: > **Goal Reference:** [G-xxx](...)
  const goalRefMatch = content.match(/(?:>\s*)?\*\*Goal Reference:\*\*\s*\[([A-Za-z0-9_-]+)\]/i);
  if (goalRefMatch && goalRefMatch[1]) {
    return normalizeGoalId(goalRefMatch[1]);
  }

  // 3. Tag in state: [GOAL_ID: G-xxx]
  const tagMatch = content.match(/\[GOAL_ID:\s*([A-Za-z0-9_-]+)\]/i);
  if (tagMatch && tagMatch[1]) {
    return normalizeGoalId(tagMatch[1]);
  }

  // 4. Feature or goal header: # Socratic Clarification: ... (G-xxx)
  const headerMatch = content.match(/(?:G-[A-Z0-9_-]+)/);
  if (headerMatch && headerMatch[0]) {
    return normalizeGoalId(headerMatch[0]);
  }

  return null;
}

/**
 * Extracts Owning Agent or Session from clarification markdown
 * @param {string} content
 * @returns {string | null}
 */
export function extractOwningAgentFromMarkdown(content) {
  if (!content || typeof content !== 'string') {
    return null;
  }
  const match = content.match(/(?:>\s*)?\*\*Owning Agent\/Session:\*\*\s*`?([^`\r\n]+)`?/i);
  return match && match[1] ? match[1].trim() : null;
}

/**
 * Generates the standardized mandatory metadata header for clarification files.
 * @param {object} params
 * @param {string} params.goalId
 * @param {string} [params.owningAgent]
 * @param {string} [params.state]
 * @param {number} [params.roundNumber]
 * @param {string} [params.goalLink]
 * @param {string} [params.targetFeature]
 * @param {string} [params.createdAt]
 * @param {string} [params.updatedAt]
 * @param {string[]} [params.history]
 * @returns {string}
 */
export function generateClarificationHeader(params) {
  const goalId = normalizeGoalId(params.goalId);
  const owningAgent = params.owningAgent || 'Antigravity Socratic Agent';
  const state = params.state || '[STATE: AWAITING_HUMAN_ROUND_1]';
  const roundNumber = params.roundNumber || 1;
  const goalLink = params.goalLink || `docs/07-backlog/goals/${goalId}.md`;
  const targetFeature = params.targetFeature || `Goal ${goalId} Operational Alignment`;
  const createdAt = params.createdAt || new Date().toISOString();
  const updatedAt = params.updatedAt || new Date().toISOString();

  let header = `# 🔄 Socratic Clarification State Machine: ${targetFeature}\n\n`;
  header += `> **Goal ID:** \`${goalId}\`  \n`;
  header += `> **Owning Agent/Session:** \`${owningAgent}\`  \n`;
  header += `> **State:** \`${state}\`  \n`;
  header += `> **Iteration:** \`Round ${roundNumber} of Socratic Dialogue\`  \n`;
  header += `> **Goal Reference:** [${goalId}](${goalLink})  \n`;
  header += `> **Created At:** \`${createdAt}\`  \n`;
  header += `> **Updated At:** \`${updatedAt}\`  \n\n`;
  header += `---\n\n`;

  if (params.history && Array.isArray(params.history) && params.history.length > 0) {
    header += `## 📜 Append-Only Q&A History\n\n`;
    for (const entry of params.history) {
      header += `- ${entry}\n`;
    }
    header += `\n---\n\n`;
  }

  return header;
}

/**
 * Migrates a legacy root CLARIFICATION.md to its goal-partitioned path if its Goal ID is identified.
 * @param {string} repoRoot
 * @returns {{ migrated: boolean, goalId?: string, source?: string, destination?: string, reason?: string }}
 */
export function migrateLegacyClarification(repoRoot) {
  const legacyPath = path.join(repoRoot, 'CLARIFICATION.md');
  if (!fs.existsSync(legacyPath)) {
    return { migrated: false, reason: 'No legacy CLARIFICATION.md found' };
  }

  const content = fs.readFileSync(legacyPath, 'utf8');
  const goalId = extractGoalIdFromMarkdown(content);

  if (!goalId) {
    return {
      migrated: false,
      reason: 'Legacy CLARIFICATION.md exists but Goal ID could not be identified'
    };
  }

  const cleanGoalId = normalizeGoalId(goalId);
  const isComplete =
    content.includes('ALIGNMENT_COMPLETE') ||
    content.includes('CLOSED_ARCHIVED');

  const destinationDir = isComplete
    ? path.join(repoRoot, 'docs/07-backlog/clarifications')
    : repoRoot;

  fs.mkdirSync(destinationDir, { recursive: true });
  const destinationPath = path.join(destinationDir, getClarificationFilename(cleanGoalId));

  fs.renameSync(legacyPath, destinationPath);

  return {
    migrated: true,
    goalId: cleanGoalId,
    source: legacyPath,
    destination: destinationPath
  };
}

/**
 * Archives an active clarification file to docs/07-backlog/clarifications/
 * @param {string} repoRoot
 * @param {string} goalId
 * @returns {string} The archived file path
 */
export function archiveClarificationFile(repoRoot, goalId) {
  const cleanGoalId = normalizeGoalId(goalId);
  const activePath = path.join(repoRoot, getClarificationFilename(cleanGoalId));
  const archivedDir = path.join(repoRoot, 'docs/07-backlog/clarifications');
  const archivedPath = path.join(archivedDir, getClarificationFilename(cleanGoalId));

  if (!fs.existsSync(activePath)) {
    if (fs.existsSync(archivedPath)) {
      return archivedPath; // Already archived
    }
    throw new Error(`Active clarification file does not exist: ${activePath}`);
  }

  fs.mkdirSync(archivedDir, { recursive: true });
  fs.renameSync(activePath, archivedPath);
  return archivedPath;
}
