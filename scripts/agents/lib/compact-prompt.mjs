/**
 * Build a bounded, normalized subagent prompt envelope from the execution contract.
 * Standardizes prompt format across Codex, Antigravity, Gemini, Claude, Aider, and Ollama.
 */
import { resolvePersona } from './persona-registry.mjs';

export function buildCompactPrompt({
  goalId,
  role,
  persona,
  mandate,
  touchMap = [],
  acceptance = [],
  commands = [],
}) {
  const personaInfo = resolvePersona(persona, role);

  const lines = [
    '=== SODA OS SUBAGENT BOUNDED EXECUTION CONTRACT ===',
    `Goal ID: ${goalId}`,
    `Role: ${role}`,
    `Persona: ${persona}`,
    `Persona Directives: ${personaInfo.directives}`,
    `Mandate: ${mandate}`,
    `Declared Touch Map: ${touchMap.join(', ') || '(none)'}`,
    acceptance.length
      ? `Acceptance Criteria: ${acceptance.join(' | ')}`
      : 'Acceptance Criteria: Follow canonical goal card specifications',
    commands.length
      ? `Verification Commands: ${commands.join(' && ')}`
      : 'Verification Commands: Run the goal test plan',
    '--- Mandatory Constitutional Invariants ---',
    '1. Act strictly as the declared single persona; never switch or adopt additional personas.',
    '2. Zero mocks, zero stubs, zero dummy fallbacks. Write 100% production-ready code.',
    '3. Do not create, modify, or delete files outside the declared touch map.',
    '4. Do not spawn child agents; execute commands bounded by timeout.',
    '5. Stop execution at the verification checkpoint and return a concise handoff.',
    '--- MANDATORY EPHEMERAL WORKER CONTRACT ---',
    '1. You are an ephemeral worker. You exist only to complete this single task.',
    '2. Perform your assigned file edit, run the verification command once.',
    '3. Emit your compact handoff JSON and CEASE calling tools immediately.',
    '4. Do not await user response or ask follow-up questions.',
    '--- Expected Handoff Format ---',
    'Return: Status (complete|blocked|needs-review), changed files, tests, failures, blockers, and next action.',
  ];

  return lines.join('\n');
}
