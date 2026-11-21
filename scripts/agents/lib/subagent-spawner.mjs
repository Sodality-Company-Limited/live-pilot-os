/**
 * Core Subagent Spawner Engine with Cross-CLI & Cross-Model Consistency.
 * Gated by Soda OS runtime budget, single-persona invariant, and touch-map constraints.
 * Supports: codex, antigravity, gemini, claude, aider, ollama, goose.
 */
import { prepareProviderSession } from './provider-adapter-contract.mjs';
import { appendSessionRecord } from './session-telemetry.mjs';
import { recordModularTelemetry } from './modular-telemetry-engine.mjs';
import { recordCognitiveTrajectory } from './cognitive-trajectory-recorder.mjs';
import { resolveProvider, ADAPTER_REGISTRY } from './adapters/index.mjs';
import { resolveModelForProvider } from './model-registry.mjs';
import { resolvePersona } from './persona-registry.mjs';
import { synthesizeOnTheFlyPersona } from './dynamic-persona-synthesizer.mjs';
import { reapSubagentWorker } from './reap-subagent.mjs';

export async function spawnSubagent(options = {}, activeKeys = new Set(), usedPromptHashes = new Set()) {
  let {
    provider = 'codex',
    goalId,
    role = 'implementer',
    persona,
    goalStatus = 'ready',
    mandate,
    touchMap = [],
    acceptance = [],
    commands = [],
    repoRoot = process.cwd(),
    budget,
    model,
    tier,
    profile,
    effort,
    worktree = false,
    sandbox,
    dangerouslySkipPermissions = true,
    approvalMode = 'yolo',
    format = 'json',
    autoReap = true,
    reapToolCall = null,
  } = options;

  // 1. Resolve provider adapter
  const adapter = resolveProvider(provider);
  if (!adapter) {
    const supported = Object.keys(ADAPTER_REGISTRY).join(', ');
    return {
      status: 'rejected',
      errors: [`Unsupported provider: '${provider}'. Supported providers: ${supported}`],
    };
  }

  // 2. On-The-Fly Persona Synthesis if persona is omitted or auto-requested
  if (!persona || persona === 'auto' || persona === 'synthesize') {
    const synthesized = synthesizeOnTheFlyPersona({ role, mandate, goalId, touchMap });
    persona = synthesized.persona;
  }

  // 3. Resolve normalized model for provider
  const resolvedModel = resolveModelForProvider(provider, model, tier);

  // 4. Resolve persona details & directives
  const personaMeta = resolvePersona(persona, role);

  // 4. Prepare and validate provider session through shared invariant gate
  const sessionPrep = prepareProviderSession(
    {
      goalId,
      role,
      persona,
      goalStatus,
      mandate,
      touchMap,
      acceptance,
      commands,
      repoRoot,
      budget,
    },
    activeKeys,
    usedPromptHashes
  );

  if (!sessionPrep.allowed) {
    return {
      status: 'rejected',
      errors: sessionPrep.gate ? sessionPrep.gate.errors : [sessionPrep.error || 'session gate rejected'],
      details: sessionPrep,
    };
  }

  const prompt = sessionPrep.prompt;
  const startTime = Date.now();

  let executionResult;

  try {
    executionResult = await adapter.spawn({
      prompt,
      budget: sessionPrep.budget,
      sandbox,
      worktree,
      cd: repoRoot,
      model: resolvedModel,
      profile,
      effort,
      dangerouslySkipPermissions,
      approvalMode,
      touchMap,
      format,
    });
  } catch (err) {
    return {
      status: 'rejected',
      errors: [`Execution failed for ${adapter.name} (${adapter.binary}): ${err.message}`],
    };
  }

  const elapsedSeconds = Math.max(1, Math.round((Date.now() - startTime) / 1000));

  // Record session telemetry into .agents/telemetry/sessions.jsonl & modular LLM Wiki documents
  const telemetryRecord = {
    goalId,
    role,
    persona,
    provider: adapter.name,
    model: resolvedModel,
    sessionKey: sessionPrep.telemetry.sessionKey,
    turns: 1,
    inputTokens: executionResult.inputTokens,
    outputTokens: executionResult.outputTokens,
    childAgents: 0,
    elapsedSeconds,
    stopReason: executionResult.status,
    changedFiles: executionResult.changedFiles,
    summary: executionResult.summary,
    mandate,
    touchMap,
    commands,
  };

  // Record full cognitive trajectory for Liquid-EBM-JEPA & DAVE distillation
  const cognitiveTrajectory = {
    sessionKey: sessionPrep.telemetry.sessionKey,
    goalId,
    provider: adapter.name,
    model: resolvedModel,
    persona,
    role,
    mandate,
    touchMap,
    fullPrompt: prompt,
    rawResponse: executionResult.summary || '',
    summary: executionResult.summary,
    status: executionResult.status,
    exitCode: executionResult.exitCode ?? 0,
    changedFiles: executionResult.changedFiles,
    inputTokens: executionResult.inputTokens,
    outputTokens: executionResult.outputTokens,
    elapsedSeconds,
    turns: 1,
    tools: {
      commands: commands.length,
    },
    verification: {
      command: commands[0] || 'npm test',
      passed: executionResult.status === 'complete',
      testsRun: 1,
      testsPassed: executionResult.status === 'complete' ? 1 : 0,
    },
    initialState: {
      touchMap,
    },
  };

  try {
    await appendSessionRecord(telemetryRecord, repoRoot);
    await recordModularTelemetry(telemetryRecord, repoRoot);
    await recordCognitiveTrajectory(cognitiveTrajectory, repoRoot);
  } catch {}

  // Enforce Ephemeral Worker Invariant: auto-reap worker context on terminal handoff
  let reapResult = null;
  if (autoReap && sessionPrep.budget?.autoReapOnHandoff !== false) {
    try {
      reapResult = await reapSubagentWorker({
        sessionKey: sessionPrep.telemetry.sessionKey,
        platform: adapter.name,
        toolCall: reapToolCall,
        force: true,
      });
    } catch {}
  }

  // Normalized Soda Subagent Handoff Payload
  return {
    status: executionResult.status,
    provider: adapter.name,
    goalId,
    role,
    persona,
    model: resolvedModel,
    personaTitle: personaMeta.title,
    promptHash: sessionPrep.promptHash,
    sessionKey: sessionPrep.telemetry.sessionKey,
    changedFiles: executionResult.changedFiles,
    inputTokens: executionResult.inputTokens,
    outputTokens: executionResult.outputTokens,
    summary: executionResult.summary,
    stderr: executionResult.stderr,
    exitCode: executionResult.exitCode,
    reaped: reapResult?.status === 'reaped',
  };
}
