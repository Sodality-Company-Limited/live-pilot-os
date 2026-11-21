#!/usr/bin/env node
/**
 * Unified Multi-Provider Subagent Spawner CLI for Soda OS.
 * Guarantees cross-CLI and cross-model behavioral and structural consistency.
 */
import path from 'node:path';
import { spawnSubagent } from './lib/subagent-spawner.mjs';
import { ADAPTER_REGISTRY } from './lib/adapters/index.mjs';
import { MODEL_TIERS } from './lib/model-registry.mjs';

function parseArgs(args) {
  const options = {
    provider: 'codex',
    touchMap: [],
    acceptance: [],
    commands: [],
    worktree: false,
    goalStatus: 'ready',
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--provider' || arg === '-p') {
      options.provider = args[++i];
    } else if (arg === '--goal' || arg === '-g') {
      options.goalId = args[++i];
    } else if (arg === '--role' || arg === '-r') {
      options.role = args[++i];
    } else if (arg === '--persona') {
      options.persona = args[++i];
    } else if (arg === '--task' || arg === '-t' || arg === '--mandate') {
      options.mandate = args[++i];
    } else if (arg === '--status') {
      options.goalStatus = args[++i];
    } else if (arg === '--touch' || arg === '--touch-map') {
      const val = args[++i];
      if (val) options.touchMap = val.split(',').map((s) => s.trim()).filter(Boolean);
    } else if (arg === '--acceptance') {
      const val = args[++i];
      if (val) options.acceptance = val.split(',').map((s) => s.trim()).filter(Boolean);
    } else if (arg === '--verify' || arg === '--command') {
      const val = args[++i];
      if (val) options.commands = [val];
    } else if (arg === '--model' || arg === '-m') {
      options.model = args[++i];
    } else if (arg === '--tier') {
      options.tier = args[++i];
    } else if (arg === '--effort') {
      options.effort = args[++i];
    } else if (arg === '--worktree') {
      options.worktree = true;
    } else if (arg === '--approval-mode') {
      options.approvalMode = args[++i];
    } else if (arg === '--help' || arg === '-h') {
      options.help = true;
    }
  }

  return options;
}

function printUsage() {
  const providers = Object.keys(ADAPTER_REGISTRY).join('|');
  const tiers = Object.keys(MODEL_TIERS).join('|');
  console.log(`
Soda OS Multi-Provider Subagent Spawner CLI (Cross-CLI Consistency)

Usage:
  node scripts/agents/spawn-subagent.mjs [options]

Required Options:
  --provider, -p <${providers}>
                                       Subagent CLI provider (default: codex)
  --goal, -g <G-xxx>                   Active Goal ID
  --role, -r <role>                    Subagent role (implementer, tester, reviewer, etc.)
  --persona <persona>                  Single stable persona from docs/04-agents/personas.md
  --task, -t <description>             Step task description / mandate
  --touch <path1,path2>                Comma-separated touch map paths

Optional:
  --tier <${tiers}>                    Normalized model capability tier
  --model, -m <model_name>             Specific model override
  --status <ready|in_progress>         Goal status (default: ready)
  --acceptance <item1,item2>           Comma-separated acceptance criteria
  --verify <command>                   Verification command to run
  --effort <low|medium|high>           Reasoning effort level
  --worktree                           Run session inside isolated git worktree
  --approval-mode <mode>               Approval mode (e.g. yolo, auto_edit)
  --help, -h                           Show this message
`);
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));

  if (opts.help || !opts.goalId || !opts.role || !opts.persona || !opts.mandate) {
    printUsage();
    process.exit(opts.help ? 0 : 2);
  }

  try {
    const result = await spawnSubagent(opts);

    if (result.status === 'rejected') {
      console.error(JSON.stringify({
        status: 'rejected',
        goalId: opts.goalId,
        errors: result.errors,
      }, null, 2));
      process.exit(1);
    }

    // Format handoff output strictly matching subagent-handoff schema
    console.log(JSON.stringify({
      status: result.status,
      provider: result.provider,
      goalId: result.goalId,
      role: result.role,
      persona: result.persona,
      model: result.model,
      sessionKey: result.sessionKey,
      changedFiles: result.changedFiles,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      summary: result.summary,
      exitCode: result.exitCode,
    }, null, 2));

    process.exit(result.status === 'complete' ? 0 : 1);
  } catch (err) {
    console.error(JSON.stringify({
      status: 'error',
      goalId: opts.goalId,
      error: err.message,
    }, null, 2));
    process.exit(1);
  }
}

main();
