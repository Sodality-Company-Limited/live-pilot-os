/**
 * Modular Subagent Telemetry Engine & LLM Wiki Ingestion for Soda OS.
 * Disaggregates monolithic logs into modular session JSON artifacts and
 * distills human/agent-readable execution telemetry markdown reports into `docs/06_raw/`.
 */
import fs from 'node:fs/promises';
import path from 'node:path';

function formatTimestamp(d = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const min = pad(d.getMinutes());
  const ss = pad(d.getSeconds());
  return `${yyyy}${mm}${dd}_${hh}${min}${ss}`;
}

export function buildTelemetryWikiReport(data) {
  const {
    goalId,
    role,
    persona,
    provider,
    model,
    mandate,
    declaredTouchMap = [],
    changedFiles = [],
    turns = 1,
    inputTokens = 0,
    outputTokens = 0,
    elapsedSeconds = 0,
    status = 'complete',
    exitCode = 0,
    summary = '',
    tools = {},
    verification = null,
    failure = null,
  } = data;

  const isoTime = new Date().toISOString();
  const touchMapCheck = changedFiles.every((f) => declaredTouchMap.includes(f)) ? '✅ 100% Conformance' : '⚠️ Scope Drift Detected';

  const lines = [
    `# 📊 Subagent Execution Telemetry & Forensic Audit: ${goalId}`,
    '',
    `> **Goal ID:** [\`${goalId}\`](file:///docs/07-backlog/goals/${goalId}.md)  `,
    `> **Role:** \`${role}\` | **Persona:** \`${persona}\`  `,
    `> **CLI Provider:** \`${provider}\` | **Model:** \`${model || 'default'}\`  `,
    `> **Status:** \`${status.toUpperCase()}\` (Exit Code: \`${exitCode}\`)  `,
    `> **Timestamp:** \`${isoTime}\`  `,
    '',
    '---',
    '',
    '## 🎯 Task Mandate & Objectives',
    '',
    mandate ? `> "${mandate}"` : '*(No mandate string provided)*',
    '',
    '## ⚙️ Operational Telemetry Metrics',
    '',
    '| Metric | Value | Invariant / Boundary |',
    '|---|---|---|',
    `| **Status** | \`${status}\` | Complete with exit code 0 |`,
    `| **Execution Latency** | \`${elapsedSeconds}s\` | SLA < 300s |`,
    `| **Turns Used** | \`${turns}\` | Max turn limit: 8 |`,
    `| **Input Tokens** | \`${inputTokens.toLocaleString()}\` | Hard ceiling: 24,000 |`,
    `| **Output Tokens** | \`${outputTokens.toLocaleString()}\` | Hard ceiling: 8,000 |`,
    `| **Touch Map Conformance** | ${touchMapCheck} | Declared touch map only |`,
    '',
    '## 📂 Touch Map & File Operations',
    '',
    `- **Declared Touch Map:** ${declaredTouchMap.map((f) => `\`${f}\``).join(', ') || '*(none)*'}`,
    `- **Files Modified:** ${changedFiles.map((f) => `\`${f}\``).join(', ') || '*(none)*'}`,
    '',
  ];

  if (Object.keys(tools).length > 0) {
    lines.push('## 🛠️ Tool Trajectory Breakdown');
    lines.push('');
    lines.push('| Tool | Invocations |');
    lines.push('|---|---|');
    for (const [tool, count] of Object.entries(tools)) {
      lines.push(`| \`${tool}\` | \`${count}\` |`);
    }
    lines.push('');
  }

  if (verification) {
    lines.push('## 🧪 Verification & Empirical Evidence');
    lines.push('');
    lines.push(`- **Command:** \`${verification.command || 'npm test'}\``);
    lines.push(`- **Result:** ${verification.passed ? '✅ PASSED 100% GREEN' : '❌ FAILED'}`);
    if (verification.testsRun !== undefined) {
      lines.push(`- **Tests Run:** ${verification.testsRun} | **Tests Passed:** ${verification.testsPassed ?? verification.testsRun}`);
    }
    lines.push('');
  }

  lines.push('## 📝 Handoff Summary');
  lines.push('');
  lines.push('```text');
  lines.push(summary || '(No summary text emitted)');
  lines.push('```');
  lines.push('');

  if (failure) {
    lines.push('## 🚨 Failure Postmortem & Forensics');
    lines.push('');
    lines.push(`- **Error Message:** \`${failure.message || failure.error}\``);
    lines.push(`- **Failure Fingerprint:** \`${failure.fingerprint || 'none'}\``);
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Records a modular telemetry record (both individual JSON and LLM Wiki markdown).
 */
export async function recordModularTelemetry(telemetryData, repoRoot = process.cwd()) {
  const timestampStr = formatTimestamp();
  const goalId = telemetryData.goalId || 'G-UNSCOPED';
  const sessionKey = telemetryData.sessionKey || Math.random().toString(16).slice(2, 10);
  const persona = telemetryData.persona || 'agent';

  // 1. Write modular JSON file to .agents/telemetry/sessions/
  const jsonDir = path.join(repoRoot, '.agents/telemetry/sessions');
  await fs.mkdir(jsonDir, { recursive: true });
  const jsonFilename = `${timestampStr}_${goalId}_${sessionKey}.json`;
  const jsonPath = path.join(jsonDir, jsonFilename);
  await fs.writeFile(jsonPath, JSON.stringify(telemetryData, null, 2), 'utf-8');

  // 2. Write LLM Wiki Markdown report to docs/06_raw/
  const wikiDir = path.join(repoRoot, 'docs/06_raw');
  await fs.mkdir(wikiDir, { recursive: true });
  const wikiFilename = `${timestampStr}_${goalId.toLowerCase().replace(/[^a-z0-9]/g, '_')}_subagent_telemetry.md`;
  const wikiPath = path.join(wikiDir, wikiFilename);
  const wikiContent = buildTelemetryWikiReport(telemetryData);
  await fs.writeFile(wikiPath, wikiContent, 'utf-8');

  // 3. Update LLM Wiki Index (docs/06_raw/index.md)
  try {
    const indexPath = path.join(wikiDir, 'index.md');
    let indexContent = await fs.readFile(indexPath, 'utf-8');
    const tableRow = `| [${wikiFilename}](file://${wikiPath}) | Subagent Execution Telemetry (${goalId} / ${persona}) | Modular execution telemetry for ${goalId} (${telemetryData.role} / ${persona}) using ${telemetryData.provider}. Status: ${telemetryData.status}. |\n`;

    if (indexContent.includes('## 📊 Agent Telemetry & Execution Traces')) {
      indexContent = indexContent.replace(
        '## 📊 Agent Telemetry & Execution Traces\n\n',
        `## 📊 Agent Telemetry & Execution Traces\n\n${tableRow}`
      );
    } else {
      indexContent += `\n## 📊 Agent Telemetry & Execution Traces\n\n${tableRow}`;
    }
    await fs.writeFile(indexPath, indexContent, 'utf-8');
  } catch {}

  // 4. Update LLM Wiki Chronological Operations Log (docs/06_raw/log.md)
  try {
    const logPath = path.join(wikiDir, 'log.md');
    const logEntry = `\n## [${new Date().toISOString()}] subagent_telemetry | Subagent Execution Telemetry (${goalId}): Recorded modular telemetry and forensic report for ${persona} (${telemetryData.provider}). Status: ${telemetryData.status}. Saved to \`docs/06_raw/${wikiFilename}\`.\n`;
    await fs.appendFile(logPath, logEntry, 'utf-8');
  } catch {}

  return {
    jsonPath,
    wikiPath,
    timestampStr,
  };
}

/**
 * Lists telemetry session JSON records, optionally filtered by goalId.
 */
export async function listSessionTelemetry(goalId = null, repoRoot = process.cwd()) {
  const dir = path.join(repoRoot, '.agents/telemetry/sessions');
  try {
    const files = (await fs.readdir(dir)).filter((f) => f.endsWith('.json'));
    const records = [];
    for (const f of files) {
      try {
        const content = JSON.parse(await fs.readFile(path.join(dir, f), 'utf-8'));
        if (!goalId || content.goalId === goalId) {
          records.push(content);
        }
      } catch {}
    }
    return records.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));
  } catch {
    return [];
  }
}

/**
 * Reads a single telemetry session JSON file.
 */
export async function readSessionTelemetry(sessionKey, repoRoot = process.cwd()) {
  const dir = path.join(repoRoot, '.agents/telemetry/sessions');
  try {
    const files = (await fs.readdir(dir)).filter((f) => f.includes(sessionKey) && f.endsWith('.json'));
    if (!files.length) return null;
    return JSON.parse(await fs.readFile(path.join(dir, files[0]), 'utf-8'));
  } catch {
    return null;
  }
}
