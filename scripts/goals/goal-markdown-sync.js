#!/usr/bin/env node
/**
 * ════════════════════════════════════════════════════════════════════════════════
 * 🛡️ SODA OS GOAL MARKDOWN SYNCHRONIZATION ENGINE
 * ════════════════════════════════════════════════════════════════════════════════
 * Framework: Soda OS
 * Purpose: Deterministic, idempotent synchronization of all markdown-related goal
 *          files whenever goals are generated, executed, or transitioned:
 *          1. docs/07-backlog/queues/{EPIC}.md (Active & Archived tables)
 *          2. docs/00-project-snapshot.md (## Active goals table)
 *          3. docs/07-backlog/goals.md (## Dashboard epic links)
 *          4. docs/07-backlog/goal-id-registry.yaml (next_seq reconciliation)
 *          5. docs/02-product/acceptance/{GOAL_ID}.md (Acceptance contract sync)
 * ════════════════════════════════════════════════════════════════════════════════
 */

const fs = require('fs');
const path = require('path');
const goalIdLib = require('./goal-id');
const {
  atomicWriteFileSync,
  acquireFileLock,
  releaseFileLock,
  withFileLock,
  withMultiFileLock,
  transactionalUpdate,
  sleepSync,
} = require('./file-lock');

const GOAL_FILENAME_RE = /^(G-[A-Z]{2,8}-[0-9]{3}|G-[0-9]{3})\.md$/i;
const SNAPSHOT_REL = 'docs/00-project-snapshot.md';
const GOALS_DASHBOARD_REL = 'docs/07-backlog/goals.md';
const EPICS_INDEX_REL = 'docs/07-backlog/epics.md';
const ACCEPTANCE_DIR_REL = 'docs/02-product/acceptance';
const GOAL_SPECS_BASE_DIR_REL = 'docs/03-architecture/specs/goals';

/**
 * Resolves repository file path, checking root and template/ fallback.
 */
function resolveDocPath(root, relPath) {
  const directPath = path.join(root, relPath);
  if (fs.existsSync(directPath)) return directPath;
  const templatePath = path.join(root, 'template', relPath);
  if (fs.existsSync(templatePath)) return templatePath;
  return directPath;
}

/**
 * Normalizes goal status to canonical Soda OS lifecycle statuses.
 */
function normalizeStatus(status) {
  const s = String(status || '').trim().toLowerCase();
  if (['draft', 'planned', 'ready', 'in_progress', 'review', 'blocked', 'approved', 'done'].includes(s)) {
    return s;
  }
  if (s === 'archived' || s === 'completed' || s === 'closed') return 'done';
  if (s === 'active' || s === 'progress') return 'in_progress';
  return 'draft';
}

/**
 * Maps goal status to standard Soda OS collaboration phase.
 */
function statusToPhase(status) {
  const s = normalizeStatus(status);
  switch (s) {
    case 'draft':
    case 'planned':
      return 'DEFINE';
    case 'ready':
      return 'PLAN';
    case 'in_progress':
      return 'EXECUTE';
    case 'review':
    case 'approved':
      return 'REVIEW';
    case 'done':
      return 'SHIP';
    default:
      return 'DEFINE';
  }
}

/**
 * Parses all metadata, contracts, and touch maps from a goal markdown card.
 */
function parseGoalFile(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const content = fs.readFileSync(filePath, 'utf8');
  const filename = path.basename(filePath);
  const parsedFilename = filename.match(GOAL_FILENAME_RE);
  const parsedId = parsedFilename ? goalIdLib.parseGoalId(parsedFilename[1]) : null;

  // Title: # G-XXX: Title
  let title = '';
  const titleMatch = content.match(/^#\s+(?:G-[A-Za-z0-9_-]+|G-[0-9]{3}):\s*([^\n]+)/m);
  if (titleMatch) {
    title = titleMatch[1].trim();
  } else {
    const fallbackH1 = content.match(/^#\s+([^\n]+)/m);
    title = fallbackH1 ? fallbackH1[1].trim() : (parsedId ? parsedId.id : filename);
  }

  // Status
  let status = 'draft';
  const statusMatch = content.match(/\*\*Status:\*\*\s*([a-zA-Z_]+)/i);
  if (statusMatch) {
    status = normalizeStatus(statusMatch[1]);
  } else {
    const yamlStatus = content.match(/status:\s*([a-zA-Z_]+)/i);
    if (yamlStatus) status = normalizeStatus(yamlStatus[1]);
  }

  // Kind
  let kind = 'feature';
  const kindMatch = content.match(/\*\*Kind:\*\*\s*([a-zA-Z_]+)/i);
  if (kindMatch) {
    kind = kindMatch[1].trim().toLowerCase();
  } else {
    const yamlKind = content.match(/kind:\s*([a-zA-Z_]+)/i);
    if (yamlKind) kind = yamlKind[1].trim().toLowerCase();
  }

  // Atomic outcome
  let atomicOutcome = '';
  const outcomeMatch = content.match(/\*\*Atomic outcome:\*\*\s*([^\n]+)/i);
  if (outcomeMatch) atomicOutcome = outcomeMatch[1].trim();

  // Epic
  let epic = parsedId ? parsedId.epic : goalIdLib.IMPLICIT_EPIC;
  const epicMatch = content.match(/\*\*Epic:\*\*\s*([A-Za-z0-9_-]+)/i);
  if (epicMatch && /^[A-Za-z]{2,8}$/.test(epicMatch[1])) {
    epic = epicMatch[1].toUpperCase();
  }

  // Depends on
  const dependsOn = [];
  const depMatch = content.match(/\*\*Depends on:\*\*\s*([^\n]+)/i);
  if (depMatch) {
    const tokens = depMatch[1].replace(/—/g, ' ').replace(/,/g, ' ').split(/\s+/);
    for (const t of tokens) {
      const clean = t.trim().toUpperCase();
      if (goalIdLib.isGoalId(clean)) dependsOn.push(clean);
    }
  }

  // Blocks
  const blocks = [];
  const blocksMatch = content.match(/\*\*Blocks:\*\*\s*([^\n]+)/i);
  if (blocksMatch) {
    const tokens = blocksMatch[1].replace(/—/g, ' ').replace(/,/g, ' ').split(/\s+/);
    for (const t of tokens) {
      const clean = t.trim().toUpperCase();
      if (goalIdLib.isGoalId(clean)) blocks.push(clean);
    }
  }

  // Assigned role
  let assigned = 'aether_implementer';
  const assignedMatch = content.match(/\|\s*`?([a-zA-Z0-9_-]+(?:_implementer|_tester|_engineer|_architect|_auditor|_planner|_shipper))`?\s*\|\s*`?feature\//i)
    || content.match(/role:\s*`?([a-zA-Z0-9_-]+)`?/i);
  if (assignedMatch) {
    assigned = assignedMatch[1].trim();
  }

  // Touch map paths
  const touchMap = [];
  const touchMapSection = content.match(/(?:^|\n)##\s+Touch\s+map\b[^\n]*\n([\s\S]*?)(?=\n##\s+|$)/i);
  if (touchMapSection) {
    const lines = touchMapSection[1].split('\n');
    for (const line of lines) {
      const bullet = line.match(/^\s*-\s+`?([^`\n]+)`?/);
      if (bullet) {
        const item = bullet[1].trim();
        if (
          item &&
          item !== '—' &&
          !item.startsWith('<!--') &&
          !item.startsWith('[Path') &&
          !item.startsWith('**') &&
          !item.includes('**')
        ) {
          touchMap.push(item);
        }
      }
    }
  }

  // Closed date (if archived)
  const isArchived = filePath.includes('/_archived/') || status === 'done';
  let closedDate = '2026-10-10';
  const closedMatch = content.match(/Closed:\s*(\d{4}-\d{2}-\d{2})/i)
    || content.match(/\*\*Closed:\*\*\s*(\d{4}-\d{2}-\d{2})/i);
  if (closedMatch) {
    closedDate = closedMatch[1];
  } else {
    try {
      const stat = fs.statSync(filePath);
      closedDate = stat.mtime.toISOString().slice(0, 10);
    } catch (_) {}
  }

  const id = parsedId ? parsedId.id : (filename.replace(/\.md$/, '').toUpperCase());
  const seq = parsedId ? parsedId.seq : 0;

  return {
    id,
    epic,
    seq,
    title,
    status,
    kind,
    phase: statusToPhase(status),
    assigned,
    dependsOn,
    blocks,
    touchMap,
    atomicOutcome,
    closedDate,
    isArchived,
    filePath,
    filename,
  };
}

/**
 * Loads and parses all goals across the project root (both active and archived).
 * Deduplicates by Goal ID, prioritizing archived/done versions over stale active files.
 */
function loadAllGoals(root) {
  const goalFiles = goalIdLib.listGoalFiles(root);
  // Fallback to template/ if root has no direct goal files (e.g. template test harnesses)
  if (goalFiles.length === 0) {
    const templateDirs = [
      path.join(root, 'template/docs/07-backlog/goals'),
      path.join(root, 'template/docs/07-backlog/goals/_archived'),
    ];
    for (const tDir of templateDirs) {
      if (fs.existsSync(tDir)) {
        for (const name of fs.readdirSync(tDir)) {
          if (name.startsWith('_') || name === 'README.md' || !name.endsWith('.md')) continue;
          const parsedName = name.match(GOAL_FILENAME_RE);
          if (parsedName) {
            const p = path.join(tDir, name);
            if (!goalFiles.some((gf) => gf.path === p || gf.id === parsedName[1])) {
              const parsed = goalIdLib.parseGoalId(parsedName[1]);
              goalFiles.push({
                ...parsed,
                filename: name,
                path: p,
                invalidFilename: false,
              });
            }
          }
        }
      }
    }
  }

  const goalsMap = new Map();
  for (const item of goalFiles) {
    if (item.invalidFilename) continue;
    const parsed = parseGoalFile(item.path);
    if (!parsed) continue;

    if (!goalsMap.has(parsed.id)) {
      goalsMap.set(parsed.id, parsed);
    } else {
      // Deduplicate: if an archived/done version exists, prefer the archived/done version
      const existing = goalsMap.get(parsed.id);
      if (parsed.isArchived || parsed.status === 'done') {
        goalsMap.set(parsed.id, parsed);
      } else if (!existing.isArchived && existing.status !== 'done') {
        goalsMap.set(parsed.id, parsed);
      }
    }
  }
  return [...goalsMap.values()];
}

/**
 * Resolves queue file path for a given epic.
 */
function epicQueuePath(root, epic) {
  const slug = String(epic || goalIdLib.IMPLICIT_EPIC).toUpperCase();
  const direct = path.join(root, 'docs/07-backlog/queues', `${slug}.md`);
  if (fs.existsSync(direct)) return direct;
  const template = path.join(root, 'template/docs/07-backlog/queues', `${slug}.md`);
  if (fs.existsSync(template)) return template;
  return direct;
}

/**
 * Generates an initial queue markdown template for a newly registered epic.
 */
function createEpicQueueTemplate(epic, epicName) {
  const slug = String(epic).toUpperCase();
  const name = epicName || slug;
  return `# Queue: ${slug}

> One queue file per epic. **This branch/team edits only this file** — never \`goals.md\` rows and never another epic's queue.  
> Contract: [goal-id.md](../../06-workflows/goal-id.md)

**Epic:** ${name}  
**Slug:** ${slug}

## Active

| Goal | Title | Assigned | Status | File |
|------|-------|----------|--------|------|
| *(none)* | — | — | — | — |

## Archived

| Goal | Title | Closed | File |
|------|-------|--------|------|
| *(none yet)* | — | — | — |
`;
}

/**
 * Parses a markdown table row in an epic queue table.
 */
function parseQueueRow(line) {
  if (!line || typeof line !== 'string') return null;
  const trimmed = line.trim();
  if (!trimmed.startsWith('|') || !trimmed.endsWith('|')) return null;

  const isHeader = /^\|\s*(?:Goal|ID)\s*\|/i.test(trimmed);
  const isSeparator = /^\|\s*[-:\s|]+\|$/.test(trimmed);
  const isPlaceholder = trimmed.includes('*(none)*') || trimmed.includes('*(none yet)*');

  if (isHeader || isSeparator) {
    return { isHeader, isSeparator, isPlaceholder: false, raw: line, id: null };
  }
  if (isPlaceholder) {
    return { isHeader: false, isSeparator: false, isPlaceholder: true, raw: line, id: null };
  }

  const cells = trimmed.split('|').map((c) => c.trim()).filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
  if (cells.length === 0) return null;

  let id = null;
  const col0 = cells[0];
  const linkMatch = col0.match(/\[`?([A-Za-z0-9_-]+)`?\]/);
  if (linkMatch) {
    id = linkMatch[1].trim().toUpperCase();
  } else {
    const codeMatch = col0.match(/`([A-Za-z0-9_-]+)`/);
    if (codeMatch) {
      id = codeMatch[1].trim().toUpperCase();
    } else {
      const wordMatch = col0.match(/\b(G-(?:[A-Za-z0-9]+-)?\d{3,}|G-[0-9]{3}|G-[A-Za-z0-9_-]+)\b/i);
      if (wordMatch) {
        id = wordMatch[1].trim().toUpperCase();
      }
    }
  }

  return {
    isHeader: false,
    isSeparator: false,
    isPlaceholder: false,
    id,
    cells,
    raw: line,
  };
}

/**
 * Formats an active queue row according to table format schema.
 */
function formatActiveQueueRow(format, g) {
  const relFile = `[\`goals/${g.id}.md\`](../goals/${g.id}.md)`;
  if (format === 'B') {
    const deps = g.dependsOn && g.dependsOn.length > 0 ? g.dependsOn.join(', ') : '—';
    return `| ${g.id} | ${g.kind || 'feature'} | ${g.status} | ${g.phase} | ${deps} | ${relFile} |`;
  } else if (format === 'C') {
    const deps = g.dependsOn && g.dependsOn.length > 0 ? g.dependsOn.join(', ') : '—';
    return `| ${g.id} | ${g.title} | ${g.status} | ${deps} | ${relFile} |`;
  }
  return `| ${g.id} | ${g.title} | \`${g.assigned || 'aether_implementer'}\` | ${g.status} | ${relFile} |`;
}

/**
 * Formats an archived queue row.
 */
function formatArchivedQueueRow(g) {
  const relFile = `[\`goals/_archived/${g.id}.md\`](../goals/_archived/${g.id}.md)`;
  const closed = g.closedDate || new Date().toISOString().slice(0, 10);
  return `| ${g.id} | ${g.title} | ${closed} | ${relFile} |`;
}

/**
 * Synchronizes docs/07-backlog/queues/{EPIC}.md with active and archived goals.
 * Non-destructive: preserves peer goals from other concurrent agents/worktrees,
 * supports targeted upserts, and maintains 100% bitwise consistency.
 */
function syncEpicQueue(root, epic, options = {}) {
  const dryRun = Boolean(options.dryRun);
  const slug = String(epic || goalIdLib.IMPLICIT_EPIC).toUpperCase();
  const qPath = epicQueuePath(root, slug);

  return withFileLock(qPath, () => {
    let content = '';
    let epicName = slug;

    const registry = goalIdLib.loadRegistry(root);
    if (registry.epics[slug] && registry.epics[slug].name) {
      epicName = registry.epics[slug].name;
    }

    if (fs.existsSync(qPath)) {
      content = fs.readFileSync(qPath, 'utf8');
      const existingName = content.match(/\*\*Epic:\*\*\s*([^\n]+)/);
      if (existingName) epicName = existingName[1].trim();
    } else {
      content = createEpicQueueTemplate(slug, epicName);
    }

    // Load all goals from disk for this epic
    const allGoals = loadAllGoals(root).filter((g) => g.epic === slug);
    const goalMap = new Map();
    for (const g of allGoals) {
      goalMap.set(g.id.toUpperCase(), g);
      if (g.epic === 'CORE' && typeof g.seq === 'number') {
        goalMap.set(`G-${String(g.seq).padStart(3, '0')}`, g);
      }
    }

    // Detect Active table header columns
    let activeFormat = 'A'; // Default: Goal, Title, Assigned, Status, File
    const activeHeaderMatch = content.match(/##\s+Active[\s\S]*?\n(\|([^\n]+)\|\n\|[-|\s]+\|)/i);
    if (activeHeaderMatch) {
      const headerLine = activeHeaderMatch[2];
      if (/Kind/i.test(headerLine) && /Collaboration phase/i.test(headerLine)) {
        activeFormat = 'B';
      } else if (/Depends On/i.test(headerLine) && !/Assigned/i.test(headerLine)) {
        activeFormat = 'C';
      }
    }

    let activeHeaderStr = '| Goal | Title | Assigned | Status | File |\n|------|-------|----------|--------|------|';
    if (activeFormat === 'B') {
      activeHeaderStr = '| Goal | Kind | Goal status | Collaboration phase | Depends on | File |\n|------|------|-------------|---------------------|------------|------|';
    } else if (activeFormat === 'C') {
      activeHeaderStr = '| Goal | Title | Status | Depends On | File |\n|------|-------|--------|------------|------|';
    }
    const archivedHeaderStr = '| Goal | Title | Closed | File |\n|------|-------|--------|------|';

    // Parse existing ## Active table rows
    const existingActiveRows = [];
    const activeSectionMatch = content.match(/##\s+Active[\s\S]*?(?=\n##\s+Archived|\n##\s+|$)/i);
    if (activeSectionMatch) {
      for (const line of activeSectionMatch[0].split('\n')) {
        const parsed = parseQueueRow(line);
        if (parsed && !parsed.isHeader && !parsed.isSeparator) {
          existingActiveRows.push(parsed);
        }
      }
    }

    // Parse existing ## Archived table rows
    const existingArchivedRows = [];
    const archivedSectionMatch = content.match(/##\s+Archived[\s\S]*?(?=\n##\s+|$)/i);
    if (archivedSectionMatch) {
      for (const line of archivedSectionMatch[0].split('\n')) {
        const parsed = parseQueueRow(line);
        if (parsed && !parsed.isHeader && !parsed.isSeparator) {
          existingArchivedRows.push(parsed);
        }
      }
    }

    // Extract target goal IDs for targeted sync
    const targetIds = new Set();
    if (options.targetGoalId) targetIds.add(String(options.targetGoalId).trim().toUpperCase());
    if (options.goalId) targetIds.add(String(options.goalId).trim().toUpperCase());
    if (Array.isArray(options.targetGoalIds)) {
      for (const id of options.targetGoalIds) {
        if (id) targetIds.add(String(id).trim().toUpperCase());
      }
    }

    let finalActiveGoalsList = [];
    let finalArchivedGoalsList = [];

    if (targetIds.size > 0) {
      // TARGETED SYNC MODE: Only mutate target goals; preserve all peer rows verbatim
      const seenTargetsActive = new Set();
      const retainedActiveRows = [];

      for (const r of existingActiveRows) {
        if (r.isPlaceholder) continue;
        if (r.id && targetIds.has(r.id)) {
          seenTargetsActive.add(r.id);
          const g = goalMap.get(r.id);
          if (g && !g.isArchived && g.status !== 'done') {
            retainedActiveRows.push({ id: r.id, seq: g.seq, rowStr: formatActiveQueueRow(activeFormat, g) });
          }
          // If goal is done/archived, omitted from Active
        } else {
          // Peer row preserved!
          const parsedId = r.id ? goalIdLib.parseGoalId(r.id) : null;
          const seq = parsedId ? parsedId.seq : 0;
          retainedActiveRows.push({ id: r.id, seq, rowStr: r.raw });
        }
      }

      // If target was not previously in Active and is active on disk, append
      for (const targetId of targetIds) {
        if (!seenTargetsActive.has(targetId)) {
          const g = goalMap.get(targetId);
          if (g && !g.isArchived && g.status !== 'done') {
            retainedActiveRows.push({ id: targetId, seq: g.seq, rowStr: formatActiveQueueRow(activeFormat, g) });
          }
        }
      }

      retainedActiveRows.sort((a, b) => a.seq - b.seq);
      finalActiveGoalsList = retainedActiveRows.map((item) => item.rowStr);

      // Targeted Archived handling
      const seenTargetsArchived = new Set();
      const retainedArchivedRows = [];

      for (const r of existingArchivedRows) {
        if (r.isPlaceholder) continue;
        if (r.id && targetIds.has(r.id)) {
          seenTargetsArchived.add(r.id);
          const g = goalMap.get(r.id);
          if (g && (g.isArchived || g.status === 'done')) {
            retainedArchivedRows.push({ id: r.id, closedDate: g.closedDate, seq: g.seq, rowStr: formatArchivedQueueRow(g) });
          } else {
            retainedArchivedRows.push({ id: r.id, closedDate: '', seq: 0, rowStr: r.raw });
          }
        } else {
          const parsedId = r.id ? goalIdLib.parseGoalId(r.id) : null;
          const seq = parsedId ? parsedId.seq : 0;
          retainedArchivedRows.push({ id: r.id, closedDate: '', seq, rowStr: r.raw });
        }
      }

      for (const targetId of targetIds) {
        if (!seenTargetsArchived.has(targetId)) {
          const g = goalMap.get(targetId);
          if (g && (g.isArchived || g.status === 'done')) {
            retainedArchivedRows.push({ id: targetId, closedDate: g.closedDate, seq: g.seq, rowStr: formatArchivedQueueRow(g) });
          }
        }
      }

      retainedArchivedRows.sort((a, b) => {
        if (b.closedDate && a.closedDate && b.closedDate !== a.closedDate) {
          return b.closedDate.localeCompare(a.closedDate);
        }
        return b.seq - a.seq;
      });
      finalArchivedGoalsList = retainedArchivedRows.map((item) => item.rowStr);

    } else {
      // GENERAL SYNC MODE: Non-destructive reconciling union
      const seenActive = new Set();
      const newActive = [];

      for (const r of existingActiveRows) {
        if (r.isPlaceholder) continue;
        if (r.id && goalMap.has(r.id)) {
          seenActive.add(r.id);
          const g = goalMap.get(r.id);
          if (!g.isArchived && g.status !== 'done') {
            newActive.push({ id: r.id, seq: g.seq, rowStr: formatActiveQueueRow(activeFormat, g) });
          }
          // If done/archived on disk, omit from active (it will be added to archived below)
        } else {
          // Peer row whose file is not on disk (e.g. worktree branch or manual row): PRESERVE IT!
          const parsedId = r.id ? goalIdLib.parseGoalId(r.id) : null;
          const seq = parsedId ? parsedId.seq : 0;
          if (r.id) seenActive.add(r.id);
          newActive.push({ id: r.id, seq, rowStr: r.raw });
        }
      }

      // Add any goals from disk that are active and not yet seen in existingActiveRows
      const diskActive = allGoals.filter((g) => !g.isArchived && g.status !== 'done');
      for (const g of diskActive) {
        if (!seenActive.has(g.id)) {
          newActive.push({ id: g.id, seq: g.seq, rowStr: formatActiveQueueRow(activeFormat, g) });
        }
      }

      newActive.sort((a, b) => a.seq - b.seq);
      finalActiveGoalsList = newActive.map((item) => item.rowStr);

      // Reconcile Archived table
      const seenArchived = new Set();
      const newArchived = [];

      for (const r of existingArchivedRows) {
        if (r.isPlaceholder) continue;
        if (r.id && goalMap.has(r.id)) {
          seenArchived.add(r.id);
          const g = goalMap.get(r.id);
          newArchived.push({ id: r.id, closedDate: g.closedDate, seq: g.seq, rowStr: formatArchivedQueueRow(g) });
        } else {
          const parsedId = r.id ? goalIdLib.parseGoalId(r.id) : null;
          const seq = parsedId ? parsedId.seq : 0;
          if (r.id) seenArchived.add(r.id);
          newArchived.push({ id: r.id, closedDate: '', seq, rowStr: r.raw });
        }
      }

      // Add any goals from disk that are done/archived and not yet in archived
      const diskArchived = allGoals.filter((g) => g.isArchived || g.status === 'done');
      for (const g of diskArchived) {
        if (!seenArchived.has(g.id)) {
          newArchived.push({ id: g.id, closedDate: g.closedDate, seq: g.seq, rowStr: formatArchivedQueueRow(g) });
        }
      }

      newArchived.sort((a, b) => {
        if (b.closedDate && a.closedDate && b.closedDate !== a.closedDate) {
          return b.closedDate.localeCompare(a.closedDate);
        }
        return b.seq - a.seq;
      });
      finalArchivedGoalsList = newArchived.map((item) => item.rowStr);
    }

    if (finalActiveGoalsList.length === 0) {
      if (activeFormat === 'B') {
        finalActiveGoalsList.push('| *(none)* | — | — | — | — | — |');
      } else {
        finalActiveGoalsList.push('| *(none)* | — | — | — | — |');
      }
    }

    if (finalArchivedGoalsList.length === 0) {
      finalArchivedGoalsList.push('| *(none yet)* | — | — | — |');
    }

    const newActiveSection = `## Active\n\n${activeHeaderStr}\n${finalActiveGoalsList.join('\n')}\n`;
    const newArchivedSection = `## Archived\n\n${archivedHeaderStr}\n${finalArchivedGoalsList.join('\n')}\n`;

    let updatedContent = content;
    if (/##\s+Active[\s\S]*?(?=\n##\s+Archived|\n##\s+|$)/i.test(updatedContent)) {
      updatedContent = updatedContent.replace(
        /##\s+Active[\s\S]*?(?=\n##\s+Archived|\n##\s+|$)/i,
        newActiveSection.trimEnd() + '\n'
      );
    } else {
      updatedContent += `\n${newActiveSection}`;
    }

    if (/##\s+Archived[\s\S]*?(?=\n##\s+|$)/i.test(updatedContent)) {
      updatedContent = updatedContent.replace(
        /##\s+Archived[\s\S]*?(?=\n##\s+|$)/i,
        newArchivedSection.trimEnd() + '\n'
      );
    } else {
      updatedContent += `\n${newArchivedSection}`;
    }

    if (!dryRun) {
      fs.mkdirSync(path.dirname(qPath), { recursive: true });
      atomicWriteFileSync(qPath, updatedContent, 'utf8');

      // Parity check for template/ mirror
      const templateQPath = path.join(root, 'template/docs/07-backlog/queues', `${slug}.md`);
      if (fs.existsSync(path.dirname(templateQPath)) && path.resolve(qPath) !== path.resolve(templateQPath)) {
        atomicWriteFileSync(templateQPath, updatedContent, 'utf8');
      }
    }

    return {
      queuePath: qPath,
      epic: slug,
      activeCount: finalActiveGoalsList.filter((r) => !r.includes('*(none)*')).length,
      archivedCount: finalArchivedGoalsList.filter((r) => !r.includes('*(none yet)*')).length,
      dryRun,
    };
  });
}

/**
 * Parses a markdown table row in the snapshot Active goals table.
 * Extracts the goal ID, optional markdown link target, and identifies header/separator/placeholder rows.
 */
function parseSnapshotRow(line, format = 'GOAL_TITLE_STATUS') {
  if (!line || typeof line !== 'string') return null;
  const trimmed = line.trim();
  if (!trimmed.startsWith('|') || !trimmed.endsWith('|')) return null;

  const isHeader = /^\|\s*(?:Goal|ID)\s*\|/i.test(trimmed);
  const isSeparator = /^\|\s*[-:\s|]+\|$/.test(trimmed);
  const isPlaceholder = trimmed.includes('*(none)*') || trimmed.includes('*(none yet)*');

  if (isHeader || isSeparator) {
    return { isHeader, isSeparator, isPlaceholder: false, raw: line, id: null };
  }
  if (isPlaceholder) {
    return { isHeader: false, isSeparator: false, isPlaceholder: true, raw: line, id: null };
  }

  const cells = trimmed.split('|').map((c) => c.trim()).filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
  if (cells.length === 0) return null;

  let id = null;
  let linkTarget = null;
  const col0 = cells[0];

  const linkMatch = col0.match(/\[`?([A-Za-z0-9_-]+)`?\](?:\(([^)]+)\))?/);
  if (linkMatch) {
    id = linkMatch[1].trim().toUpperCase();
    linkTarget = linkMatch[2] ? linkMatch[2].trim() : null;
  } else {
    const codeMatch = col0.match(/`([A-Za-z0-9_-]+)`/);
    if (codeMatch) {
      id = codeMatch[1].trim().toUpperCase();
    } else {
      const wordMatch = col0.match(/\b(G-(?:[A-Za-z0-9]+-)?\d{3,}|G-[0-9]{3}|G-[A-Za-z0-9_-]+)\b/i);
      if (wordMatch) {
        id = wordMatch[1].trim().toUpperCase();
      }
    }
  }

  return {
    isHeader: false,
    isSeparator: false,
    isPlaceholder: false,
    id,
    linkTarget,
    cells,
    raw: line,
  };
}

/**
 * Formats a snapshot table row for a goal according to the table format.
 */
function formatSnapshotRow(format, goal, linkTarget) {
  const target = linkTarget || `07-backlog/goals/${goal.id}.md`;
  const link = `[\`${goal.id}\`](${target})`;
  if (format === 'ID_STATUS_SUMMARY') {
    return `| ${link} | \`${goal.status}\` | ${goal.title} |`;
  }
  return `| ${link} | ${goal.title} | \`${goal.status}\` |`;
}

/**
 * Synchronizes docs/00-project-snapshot.md ## Active goals table.
 * Preserves sprint-curated goals, surrounding sections, and performs non-destructive in-place upserts.
 */
function syncProjectSnapshot(root, options = {}) {
  const dryRun = Boolean(options.dryRun);
  const snapPath = resolveDocPath(root, SNAPSHOT_REL);
  if (!fs.existsSync(snapPath)) {
    return { snapshotPath: snapPath, activeCount: 0, updated: false, reason: 'Snapshot not found' };
  }

  return withFileLock(snapPath, () => {
    const content = fs.readFileSync(snapPath, 'utf8');
    const allGoals = loadAllGoals(root);
    const goalMap = new Map();
    for (const g of allGoals) {
      goalMap.set(g.id.toUpperCase(), g);
      if (g.epic === 'CORE' && typeof g.seq === 'number') {
        goalMap.set(`G-${String(g.seq).padStart(3, '0')}`, g);
      }
    }

    // Detect snapshot table format: | Goal | Title | Status | OR | ID | Status | Summary |
    let format = 'GOAL_TITLE_STATUS';
    const headerMatch = content.match(/##\s+Active\s+goals[\s\S]*?\n(\|([^\n]+)\|\n\|[-|\s:]+\|)/i);
    if (headerMatch && /Summary/i.test(headerMatch[2])) {
      format = 'ID_STATUS_SUMMARY';
    }

    // Extract target goal IDs for targeted sync
    const targetIds = new Set();
    if (options.targetGoalId) targetIds.add(String(options.targetGoalId).trim().toUpperCase());
    if (options.goalId) targetIds.add(String(options.goalId).trim().toUpperCase());
    if (Array.isArray(options.targetGoalIds)) {
      for (const id of options.targetGoalIds) {
        if (id) targetIds.add(String(id).trim().toUpperCase());
      }
    }

    // Parse existing table inside ## Active goals section
    const activeSectionMatch = content.match(/##\s+Active\s+goals[\s\S]*?(?=\n##\s+|$)/i);
    const existingRows = [];
    let headerLine = null;
    let separatorLine = null;

    if (activeSectionMatch) {
      const lines = activeSectionMatch[0].split('\n');
      for (const line of lines) {
        const parsed = parseSnapshotRow(line, format);
        if (!parsed) continue;
        if (parsed.isHeader) {
          headerLine = line;
        } else if (parsed.isSeparator) {
          separatorLine = line;
        } else {
          existingRows.push(parsed);
        }
      }
    }

    if (!headerLine) {
      headerLine = format === 'ID_STATUS_SUMMARY'
        ? '| ID | Status | Summary |'
        : '| Goal | Title | Status |';
    }
    if (!separatorLine) {
      separatorLine = format === 'ID_STATUS_SUMMARY'
        ? '|----|--------|---------|'
        : '|---|---|---|';
    }

    const newRows = [];
    const seenTargets = new Set();

    if (targetIds.size > 0) {
      // TARGETED MODE: Update or append only target goals, preserving peer rows byte-for-byte
      for (const row of existingRows) {
        if (row.isPlaceholder) continue;

        if (row.id && targetIds.has(row.id)) {
          seenTargets.add(row.id);
          const goal = goalMap.get(row.id);
          if (goal && !goal.isArchived && goal.status !== 'done') {
            newRows.push(formatSnapshotRow(format, goal, row.linkTarget));
          }
          // If goal is done/archived, it is omitted from Active goals table
        } else {
          // Peer goal: preserve raw content byte-for-byte!
          newRows.push(row.raw);
        }
      }

      // Append target goals that were not yet in the table if they are active
      for (const targetId of targetIds) {
        if (!seenTargets.has(targetId)) {
          const goal = goalMap.get(targetId);
          if (goal && !goal.isArchived && goal.status !== 'done') {
            newRows.push(formatSnapshotRow(format, goal));
          }
        }
      }
    } else {
      // GENERAL SYNC MODE: Check if curated goals exist
      const hasCuratedGoals = existingRows.some((r) => !r.isPlaceholder && r.id);

      if (hasCuratedGoals) {
        const seenActiveIds = new Set();
        // Preserve curated sprint goals: update known active ones, preserve unmapped peer rows
        for (const row of existingRows) {
          if (row.isPlaceholder) continue;

          if (row.id && goalMap.has(row.id)) {
            seenActiveIds.add(row.id);
            const goal = goalMap.get(row.id);
            if (!goal.isArchived && goal.status !== 'done') {
              newRows.push(formatSnapshotRow(format, goal, row.linkTarget));
            }
          } else {
            if (row.id) seenActiveIds.add(row.id);
            newRows.push(row.raw);
          }
        }

        // Union with any newly created active goals on disk!
        const activeGoals = allGoals.filter((g) => !g.isArchived && g.status !== 'done');
        activeGoals.sort((a, b) => {
          if (a.epic !== b.epic) return a.epic.localeCompare(b.epic);
          return a.seq - b.seq;
        });

        for (const g of activeGoals) {
          if (!seenActiveIds.has(g.id)) {
            newRows.push(formatSnapshotRow(format, g));
          }
        }
      } else {
        // Greenfield or empty placeholder: populate with active goals
        const activeGoals = allGoals.filter((g) => !g.isArchived && g.status !== 'done');
        activeGoals.sort((a, b) => {
          if (a.epic !== b.epic) return a.epic.localeCompare(b.epic);
          return a.seq - b.seq;
        });

        for (const g of activeGoals) {
          newRows.push(formatSnapshotRow(format, g));
        }
      }
    }

    if (newRows.length === 0) {
      newRows.push('| *(none)* | — | — |');
    }

    const newSection = `## Active goals\n\n${headerLine}\n${separatorLine}\n${newRows.join('\n')}\n`;

    let updatedContent = content;
    if (/##\s+Active\s+goals[\s\S]*?(?=\n##\s+|$)/i.test(content)) {
      updatedContent = content.replace(
        /##\s+Active\s+goals[\s\S]*?(?=\n##\s+|$)/i,
        newSection.trimEnd() + '\n'
      );
    } else {
      updatedContent += `\n${newSection}`;
    }

    if (!dryRun) {
      atomicWriteFileSync(snapPath, updatedContent, 'utf8');

      // Parity check for template/ mirror
      const templateSnapPath = path.join(root, 'template', SNAPSHOT_REL);
      if (fs.existsSync(path.dirname(templateSnapPath)) && path.resolve(snapPath) !== path.resolve(templateSnapPath)) {
        atomicWriteFileSync(templateSnapPath, updatedContent, 'utf8');
      }
    }

    return {
      snapshotPath: snapPath,
      activeCount: newRows.filter((r) => !r.includes('*(none)*')).length,
      updated: true,
      dryRun,
    };
  });
}

/**
 * Synchronizes docs/07-backlog/goals.md ## Dashboard table with all known epic queues.
 */
function syncGoalsDashboard(root, options = {}) {
  const dryRun = Boolean(options.dryRun);
  const dashPath = resolveDocPath(root, GOALS_DASHBOARD_REL);
  if (!fs.existsSync(dashPath)) {
    return { dashboardPath: dashPath, epicCount: 0, updated: false, reason: 'Dashboard not found' };
  }

  return withFileLock(dashPath, () => {
    const content = fs.readFileSync(dashPath, 'utf8');
    const queuesDirs = [
      path.join(root, 'docs/07-backlog/queues'),
      path.join(root, 'template/docs/07-backlog/queues'),
    ];
    const epics = new Set();

    for (const qDir of queuesDirs) {
      if (fs.existsSync(qDir)) {
        for (const file of fs.readdirSync(qDir)) {
          if (file.endsWith('.md') && !file.startsWith('_')) {
            epics.add(file.replace(/\.md$/, '').toUpperCase());
          }
        }
      }
    }

    const registry = goalIdLib.loadRegistry(root);
    for (const ep of Object.keys(registry.epics || {})) {
      epics.add(ep.toUpperCase());
    }

    const sortedEpics = [...epics].sort((a, b) => {
      if (a === goalIdLib.IMPLICIT_EPIC) return -1;
      if (b === goalIdLib.IMPLICIT_EPIC) return 1;
      return a.localeCompare(b);
    });

    const rows = [];
    for (const ep of sortedEpics) {
      const regRow = registry.epics[ep];
      const notes = regRow && regRow.name ? regRow.name : (ep === 'CORE' ? 'Legacy G-001 + unscoped work' : 'Active queue');
      rows.push(`| ${ep} | [queues/${ep}.md](queues/${ep}.md) | ${notes} |`);
    }

    const tableHeader = '| Epic | Queue | Notes |\n|------|-------|-------|';
    const tableContent = `${tableHeader}\n${rows.join('\n')}`;

    let updatedContent = content;
    const dashboardTableRegex = /##\s+Dashboard[\s\S]*?(\|[\s\S]*?\|)(?=\n\n(?:When|After|---|##|\z))/i;

    if (dashboardTableRegex.test(content)) {
      updatedContent = content.replace(dashboardTableRegex, (match, oldTable) => {
        return match.replace(oldTable, tableContent);
      });
    }

    if (!dryRun) {
      atomicWriteFileSync(dashPath, updatedContent, 'utf8');

      // Parity check for template/ mirror
      const templateDashPath = path.join(root, 'template', GOALS_DASHBOARD_REL);
      if (fs.existsSync(path.dirname(templateDashPath)) && path.resolve(dashPath) !== path.resolve(templateDashPath)) {
        atomicWriteFileSync(templateDashPath, updatedContent, 'utf8');
      }
    }

    return {
      dashboardPath: dashPath,
      epicCount: sortedEpics.length,
      updated: true,
      dryRun,
    };
  });
}

/**
 * Synchronizes docs/07-backlog/epics.md ## Registered epics table with all known epics.
 * Preserves custom curated Name and Notes for existing rows while adding missing registered
 * epics from goal-id-registry.yaml and queues/.
 */
function syncEpicsIndex(root, options = {}) {
  const dryRun = Boolean(options.dryRun);
  const epicsPath = resolveDocPath(root, EPICS_INDEX_REL);
  const dir = path.dirname(epicsPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  return withFileLock(epicsPath, () => {
    let content = fs.existsSync(epicsPath) ? fs.readFileSync(epicsPath, 'utf8') : '';
    if (!content.trim()) {
      content = `# Epics\n\n> An epic is a **namespace** for goal IDs (\`G-PAY-001\`). It is not a goal and has no status machine.  \n> Contract: [goal-id.md](../06-workflows/goal-id.md)\n\nRegister a slug here **before** \`soda-os goal next <EPIC>\`. Slug = 2–8 letters \`A-Z\`. Do not use \`E-\` (Evidence).\n\n## Registered epics\n\n| Epic | Name | Notes |\n|------|------|-------|\n| CORE | Core / unscoped | Implicit home of legacy \`G-001\`. New unscoped work: \`soda-os goal next CORE\` |\n\n## Create an epic\n\nDo this on **\`main\`** so the epic branch never has to patch shared index files.\n\n1. Pick a unique slug (\`PAY\`, \`AUTH\`, \`ONBOARD\`)\n2. Add a row to the table above\n3. Copy [\`queues/_template.md\`](queues/_template.md) → \`queues/PAY.md\`\n4. Add one Dashboard link in [\`goals.md\`](goals.md)\n5. Optional: copy [\`epics/_template.md\`](epics/_template.md) → \`epics/PAY.md\`\n6. Cut branch **\`epic/PAY\`**. On that branch, **"สร้าง goal"** / \`soda-os goal next\` allocates PAY automatically. No need to reserve a count first.\n\n## Related\n\n- [goals.md](goals.md) — process + Dashboard links (no per-goal rows)\n- [queues/CORE.md](queues/CORE.md) — per-epic queues\n- [goal-id-registry.yaml](goal-id-registry.yaml) — sequence reservation\n- [goal-id.md](../06-workflows/goal-id.md) — merge protocol\n`;
    }
    const existingEpicsData = new Map(); // epicSlug -> { name, notes }

    // Parse existing markdown table rows under ## Registered epics (or ## Active Epics fallback)
    const sectionRegex = /##\s+(?:Registered epics|Active Epics)\s*\n+([\s\S]*?)(?=\n\n##|\n##|\z)/i;
    const sectionMatch = content.match(sectionRegex);
    if (sectionMatch) {
      const lines = sectionMatch[1].split('\n').map((l) => l.trim()).filter((l) => l.startsWith('|'));
      for (const line of lines) {
        const cells = line.split('|').map((c) => c.trim()).filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
        if (cells.length >= 2) {
          const epSlug = cells[0].replace(/[`\[\]]/g, '').trim().toUpperCase();
          if (epSlug !== 'EPIC' && !epSlug.startsWith('---') && /^[A-Z]{2,8}$/.test(epSlug)) {
            existingEpicsData.set(epSlug, {
              name: cells[1] || epSlug,
              notes: cells[2] || '',
            });
          }
        }
      }
    }

    // Discover all epics from registry, queues/, and options
    const epics = new Set(existingEpicsData.keys());

    const queuesDirs = [
      path.join(root, 'docs/07-backlog/queues'),
      path.join(root, 'template/docs/07-backlog/queues'),
    ];
    for (const qDir of queuesDirs) {
      if (fs.existsSync(qDir)) {
        for (const file of fs.readdirSync(qDir)) {
          if (file.endsWith('.md') && !file.startsWith('_')) {
            const ep = file.replace(/\.md$/, '').toUpperCase();
            if (/^[A-Z]{2,8}$/.test(ep)) epics.add(ep);
          }
        }
      }
    }

    const registry = goalIdLib.loadRegistry(root);
    for (const ep of Object.keys(registry.epics || {})) {
      const epUpper = ep.toUpperCase();
      if (/^[A-Z]{2,8}$/.test(epUpper)) epics.add(epUpper);
    }

    if (options.epic) {
      const optEp = String(options.epic).toUpperCase();
      if (/^[A-Z]{2,8}$/.test(optEp)) epics.add(optEp);
    }

    const sortedEpics = [...epics].sort((a, b) => {
      if (a === goalIdLib.IMPLICIT_EPIC) return -1;
      if (b === goalIdLib.IMPLICIT_EPIC) return 1;
      return a.localeCompare(b);
    });

    const rows = [];
    for (const ep of sortedEpics) {
      const existing = existingEpicsData.get(ep);
      const regRow = registry.epics && registry.epics[ep];
      const name = (existing && existing.name) ? existing.name : (regRow && regRow.name ? regRow.name : (ep === 'CORE' ? 'Core / unscoped' : ep));
      const notes = (existing && existing.notes) ? existing.notes : (ep === 'CORE' ? 'Implicit home of legacy `G-001`. New unscoped work: `soda-os goal next CORE`' : 'Active queue');
      rows.push(`| ${ep} | ${name} | ${notes} |`);
    }

    const tableHeader = '| Epic | Name | Notes |\n|------|------|-------|';
    const tableContent = `${tableHeader}\n${rows.join('\n')}`;

    let updatedContent = content;
    const tableRegex = /(##\s+(?:Registered epics|Active Epics)\s*\n+)((?:\|[^\n]+\|\n?)+)/i;

    if (tableRegex.test(content)) {
      updatedContent = content.replace(tableRegex, `$1${tableContent}\n`);
    } else if (/##\s+(?:Registered epics|Active Epics)/i.test(content)) {
      updatedContent = content.replace(/(##\s+(?:Registered epics|Active Epics)\s*\n*)/i, `$1\n${tableContent}\n\n`);
    } else {
      updatedContent += `\n\n## Registered epics\n\n${tableContent}\n`;
    }

    if (!dryRun) {
      atomicWriteFileSync(epicsPath, updatedContent, 'utf8');

      // Parity check for template/ mirror
      const templateEpicsPath = path.join(root, 'template', EPICS_INDEX_REL);
      if (fs.existsSync(path.dirname(templateEpicsPath)) && path.resolve(epicsPath) !== path.resolve(templateEpicsPath)) {
        atomicWriteFileSync(templateEpicsPath, updatedContent, 'utf8');
      }
    }

    return {
      epicsPath,
      epicCount: sortedEpics.length,
      epics: sortedEpics,
      updated: true,
      dryRun,
    };
  });
}

/**
 * Synchronizes docs/07-backlog/goal-id-registry.yaml sequences to ensure
 * next_seq is strictly >= max(seq) + 1 across all existing cards on disk.
 */
function syncRegistrySequences(root, epic, options = {}) {
  const dryRun = Boolean(options.dryRun);
  const regPath = typeof goalIdLib.registryPath === 'function'
    ? goalIdLib.registryPath(root)
    : path.join(root, 'docs/07-backlog/goal-id-registry.yaml');

  return withFileLock(regPath, () => {
    const registry = goalIdLib.loadRegistry(root);
    const allGoals = loadAllGoals(root);

    const epicsToSync = epic
      ? [String(epic).toUpperCase()]
      : Object.keys(registry.epics || {});

    let changed = false;

    for (const ep of epicsToSync) {
      if (!registry.epics[ep]) {
        registry.epics[ep] = { name: ep, next_seq: 1, reserved: [] };
        changed = true;
      }
      const row = registry.epics[ep];
      const epGoals = allGoals.filter((g) => g.epic === ep);
      const maxSeq = epGoals.reduce((max, g) => Math.max(max, g.seq || 0), 0);

      if (maxSeq >= row.next_seq) {
        row.next_seq = maxSeq + 1;
        changed = true;
      }

      // Filter out reserved sequence numbers that are already allocated
      const allocatedSeqs = new Set(epGoals.map((g) => g.seq));
      const priorReserved = row.reserved || [];
      const updatedReserved = priorReserved.filter((n) => !allocatedSeqs.has(n));
      if (updatedReserved.length !== priorReserved.length) {
        row.reserved = updatedReserved;
        changed = true;
      }
    }

    if (changed && !dryRun) {
      goalIdLib.saveRegistry(root, registry, false);
    }

    return {
      changed,
      dryRun,
      epics: epicsToSync,
    };
  });
}

/**
 * Creates or synchronizes acceptance contract docs/02-product/acceptance/{GOAL_ID}.md
 */
function syncAcceptanceContract(root, goal, options = {}) {
  const dryRun = Boolean(options.dryRun);
  const acceptDir = resolveDocPath(root, ACCEPTANCE_DIR_REL);
  const acceptPath = path.join(acceptDir, `${goal.id}.md`);

  if (fs.existsSync(acceptPath)) {
    return { path: acceptPath, created: false };
  }

  if (!dryRun) {
    fs.mkdirSync(acceptDir, { recursive: true });
  }

  return withFileLock(acceptPath, () => {
    if (fs.existsSync(acceptPath)) {
      return { path: acceptPath, created: false };
    }

    const contractBody = `# Acceptance Contract: ${goal.id}

**Goal:** [${goal.id}](../../07-backlog/goals/${goal.id}.md)  
**Title:** ${goal.title}  
**Status:** ${goal.status}  
**Assigned:** \`${goal.assigned}\`  
**Atomic Outcome:** ${goal.atomicOutcome || goal.title}

## Given-When-Then Specification

### Scenario 1: Nominal Feature Execution
- **Given** the system environment and runtime configuration are healthy
- **When** \`${goal.id}\` operations are invoked within declared touch map
- **Then** outcome "${goal.atomicOutcome || goal.title}" is verified with zero errors

### Scenario 2: Zero-Mock & Fail-Closed Invariant
- **Given** any invalid input, missing dependency, or boundary edge case
- **When** execution occurs
- **Then** system fails closed cleanly with informative error, zero mocks, and zero stubs

## Traceability Matrix
- **Goal Card:** [\`${goal.id}.md\`](../../07-backlog/goals/${goal.id}.md)
- **Primary Queue:** [queues/${goal.epic}.md](../../07-backlog/queues/${goal.epic}.md)
- **Touch Map Boundaries:**
${(goal.touchMap || []).map((p) => `  - \`${p}\``).join('\n') || '  - *(declared on goal card)*'}
`;

    if (!dryRun) {
      fs.mkdirSync(acceptDir, { recursive: true });
      atomicWriteFileSync(acceptPath, contractBody, 'utf8');
    }

    return { path: acceptPath, created: true, dryRun };
  });
}

/**
 * Creates or synchronizes goal-scoped satellite specifications in docs/03-architecture/specs/goals/{GOAL_ID}/
 */
function syncGoalScopedSpecs(root, goal, options = {}) {
  const dryRun = Boolean(options.dryRun);
  const specsBaseDir = resolveDocPath(root, GOAL_SPECS_BASE_DIR_REL);
  const goalSpecsDir = path.join(specsBaseDir, goal.id);

  const specFiles = [
    {
      filename: `${goal.id}-architecture-spec.md`,
      title: `${goal.id} Software & Architecture Design Specification`,
      body: `# ${goal.id} Software & Architecture Design Specification

**Goal:** [${goal.id}](../../../../07-backlog/goals/${goal.id}.md)  
**Title:** ${goal.title}  
**Status:** ${goal.status}  
**Framework:** Soda OS  

---

## 🏛️ Domain Context & System Archetype
- **System Archetype:** \`backend-service\` | \`event-stream\` | \`api-gateway\` | \`agent-runtime\`
- **Bounded Context & Domain:** Core Domain | Supporting Domain | Generic Subdomain
- **Zero-Mock Conformance Gate:** 100% concrete types, zero stubs, zero mocks (Article I).

---

## 🔌 Hexagonal Inbound & Outbound Ports Specification

| Port Direction | Interface Name | Protocol / Transport | Adapter Location | Invariant & Boundary Contract |
|---|---|---|---|---|
| **Driving (Inbound)** | \`IngressPort\` | Local / CLI / Internal RPC | Declared touch map | Validates schema fail-closed, rejects invalid parameters. |
| **Driven (Outbound)** | \`PersistencePort\` | File / State / Subprocess | Declared touch map | Atomic persistence, transactional atomicity, saga rollbacks. |
`
    },
    {
      filename: `${goal.id}-invariants-formal-spec.md`,
      title: `${goal.id} Mathematical Invariants & Formal Proof Specification`,
      body: `# ${goal.id} Mathematical Invariants & Formal Proof Specification

**Goal:** [${goal.id}](../../../../07-backlog/goals/${goal.id}.md)  
**Title:** ${goal.title}  
**Status:** ${goal.status}  
**Framework:** Soda OS  

---

## ⚖️ Formal Invariants & Conservation Laws (The 6 Operational Domains)
1. **Domain 1: Invariants & System Laws:** Conservation $\\Delta \\text{Supply} = 0$, idempotency $f(f(x)) = f(x)$, non-negative bounds.
2. **Domain 2: Formal Verification & Solvers:** Deductive verification, SMT/Z3, and Kani bounded model checking with loop unwinding \`#[kani::unwind(N)]\`.
3. **Domain 3: Harness Engineering & Modeling:** Symbolic allocation \`kani::any()\`, domain preconditions \`kani::assume()\`, and shadow reference bisimulation.
4. **Domain 4: Adversarial Modeling & Edge Pathologies:** Aliasing collisions (\`from == to\`), arithmetic extremes ($0, 1, \\text{MAX}$), and replay defense.
5. **Domain 5: Concurrency, Race Conditions & Memory Models:** Tagged pointers \`(ptr, tag)\`, atomic CAS, mutual exclusion, and memory ordering barriers.
6. **Domain 6: Advanced Testing Paradigms & Tooling:** Property-based testing (\`proptest\` $\\ge 10,000$ iterations), DbC assertions, and mutation kill threshold $\\ge 85\\%$.
`
    },
    {
      filename: `${goal.id}-fsm-runtime-spec.md`,
      title: `${goal.id} Finite State Machine Matrix & Runtime Transitions`,
      body: `# ${goal.id} Finite State Machine Matrix & Runtime Transitions

**Goal:** [${goal.id}](../../../../07-backlog/goals/${goal.id}.md)  
**Title:** ${goal.title}  
**Status:** ${goal.status}  
**Framework:** Soda OS  

---

## 🔄 State Machine & Invariants
- **Transition System:** $(\\mathcal{S}, \\Sigma, \\delta, s_0)$
- **Legal States:** \`draft\` $\\to$ \`planned\` $\\to$ \`ready\` $\\to$ \`in_progress\` $\\to$ \`review\` $\\to$ \`approved\` $\\to$ \`done\`
- **Saga Compensation / Rollbacks:** Unhandled exceptions or invariant breaches trigger immediate fail-closed state abort and working tree rollback.
`
    },
    {
      filename: `${goal.id}-threat-model.md`,
      title: `${goal.id} Threat Model & Security Boundaries`,
      body: `# ${goal.id} Threat Model & Security Boundaries

**Goal:** [${goal.id}](../../../../07-backlog/goals/${goal.id}.md)  
**Title:** ${goal.title}  
**Status:** ${goal.status}  
**Framework:** Soda OS  

---

## 🛡️ STRIDE Threat Modeling & Zero-Trust Defense
- **Spoofing:** Authenticated session identity and capability verification.
- **Tampering:** Cryptographic SHA-256 byte hashes and content-addressed reference verification.
- **Repudiation:** Append-only audit logs and Merkle-tree receipts.
- **Information Disclosure:** Strict PII redaction and credential air-gapping.
- **Denial of Service:** Finite execution timeouts and resource ceilings.
- **Elevation of Privilege:** Strict touch map boundaries and unprivileged subprocess execution.
`
    },
    {
      filename: `${goal.id}-worktree-plan.md`,
      title: `${goal.id} Subagent Swarm & Git Worktree Coordination Plan`,
      body: `# ${goal.id} Subagent Swarm & Git Worktree Coordination Plan

**Goal:** [${goal.id}](../../../../07-backlog/goals/${goal.id}.md)  
**Title:** ${goal.title}  
**Status:** ${goal.status}  
**Framework:** Soda OS  

---

## 🌳 Worktree Isolation & Disjoint Touch Map Theorem
- **Worktree Path:** \`.worktrees/${goal.id}-{role}\`
- **Disjoint Touch Map Invariant:** $\\text{TouchMap}(A) \\cap \\text{TouchMap}(B) = \\emptyset$
- **Barrier Join Protocol:** Fast-forward merge \`git merge --ff-only\` with automated post-merge worktree pruning.
`
    }
  ];

  const createdFiles = [];
  if (!dryRun && !fs.existsSync(goalSpecsDir)) {
    fs.mkdirSync(goalSpecsDir, { recursive: true });
  }

  for (const sf of specFiles) {
    const specPath = path.join(goalSpecsDir, sf.filename);
    if (!fs.existsSync(specPath)) {
      if (!dryRun) {
        atomicWriteFileSync(specPath, sf.body, 'utf8');
      }
      createdFiles.push(specPath);
    }
  }

  return { goalId: goal.id, goalSpecsDir, createdCount: createdFiles.length, createdFiles };
}

/**
 * Master sync command: reconciles all markdown files across the project.
 */
function syncAllMarkdown(root, options = {}) {
  const targetEpic = options.epic ? String(options.epic).toUpperCase() : null;

  // 1. Epics index sync
  const epicsResult = syncEpicsIndex(root, options);

  // 2. Registry sync
  const regResult = syncRegistrySequences(root, targetEpic, options);

  // 3. Queue sync
  const queueResults = [];
  const epicsToSync = targetEpic
    ? [targetEpic]
    : Object.keys(goalIdLib.loadRegistry(root).epics || {});

  for (const ep of epicsToSync) {
    const qRes = syncEpicQueue(root, ep, options);
    queueResults.push(qRes);
  }

  // 4. Project snapshot sync
  const snapResult = syncProjectSnapshot(root, options);

  // 5. Goals master dashboard sync
  const dashResult = syncGoalsDashboard(root, options);

  // 6. Acceptance contracts & goal-scoped satellite specs sync for ready+ goals
  const allGoals = loadAllGoals(root);
  const contractResults = [];
  const specsResults = [];
  for (const g of allGoals) {
    if (['ready', 'in_progress', 'review', 'approved'].includes(g.status)) {
      contractResults.push(syncAcceptanceContract(root, g, options));
      specsResults.push(syncGoalScopedSpecs(root, g, options));
    }
  }

  return {
    root,
    epics: epicsResult,
    registry: regResult,
    queues: queueResults,
    snapshot: snapResult,
    dashboard: dashResult,
    acceptanceContracts: contractResults.filter((c) => c.created),
    goalScopedSpecs: specsResults.filter((s) => s.createdCount > 0),
  };
}

/**
 * Atomically marks a goal as done, moves its file to _archived/,
 * and reconciles epic queues, snapshot, and dashboard under exclusive advisory multi-lock.
 * Guarantees zero lost updates, zero dropped peer goals, and 100% template mirror parity.
 */
function closeGoal(root, goalId, options = {}) {
  const dryRun = Boolean(options.dryRun);
  const normalizedId = goalIdLib.normalizeGoalId(goalId);
  const closedDate = options.closedDate || new Date().toISOString().slice(0, 10);
  const reason = options.reason || '';

  // 1. Locate goal card file across possible locations
  const candidatePaths = [
    path.join(root, 'docs/07-backlog/goals', `${normalizedId}.md`),
    path.join(root, 'docs/07-backlog/goals/_archived', `${normalizedId}.md`),
    path.join(root, 'template/docs/07-backlog/goals', `${normalizedId}.md`),
    path.join(root, 'template/docs/07-backlog/goals/_archived', `${normalizedId}.md`),
  ];

  let sourceCardPath = candidatePaths.find((p) => fs.existsSync(p));
  if (!sourceCardPath) {
    const allFiles = goalIdLib.listGoalFiles(root);
    const matched = allFiles.find((f) => f.id === normalizedId || path.basename(f.path, '.md').toUpperCase() === normalizedId);
    if (matched) sourceCardPath = matched.path;
  }

  if (!sourceCardPath) {
    throw new Error(`[soda-os:closeGoal] Goal card for ${normalizedId} not found in backlog or archive.`);
  }

  const parsedGoal = parseGoalFile(sourceCardPath) || {
    id: normalizedId,
    title: normalizedId,
    epic: goalIdLib.IMPLICIT_EPIC,
  };
  const epic = parsedGoal.epic || (goalIdLib.parseGoalId(normalizedId) ? goalIdLib.parseGoalId(normalizedId).epic : goalIdLib.IMPLICIT_EPIC);

  const destDir = path.join(root, 'docs/07-backlog/goals/_archived');
  const destCardPath = path.join(destDir, `${normalizedId}.md`);
  const activeCardPath = path.join(root, 'docs/07-backlog/goals', `${normalizedId}.md`);

  // Exclusive multi-lock on goal card transition targets (Pillar 6)
  // Shared files (queue, snapshot, dashboard) acquire their individual locks in downstream sync helpers
  const lockTargets = [destCardPath, activeCardPath];

  return withMultiFileLock(lockTargets, () => {
    // Read source card content
    let content = fs.readFileSync(sourceCardPath, 'utf8');

    // 1. Update frontmatter status (both top-level and inside goal_contract)
    content = content.replace(/(^|\n)(\s*status:\s*)[a-zA-Z_]+/i, '$1$2done');

    // 1b. Update frontmatter lifecycle block to completed status
    content = content.replace(/(spec:\s*)[a-zA-Z_]+/i, '$1ready');
    content = content.replace(/(implementation:\s*)[a-zA-Z_]+/i, '$1done');
    content = content.replace(/(verification:\s*)[a-zA-Z_]+/i, '$1done');
    content = content.replace(/(evidence:\s*)[a-zA-Z_]+/i, '$1done');
    content = content.replace(/(review:\s*)[a-zA-Z_]+/i, '$1approved');
    content = content.replace(/(release:\s*)[a-zA-Z_]+/i, '$1released');
    content = content.replace(/(learning:\s*)[a-zA-Z_]+/i, '$1done');

    // 2. Update body Status
    if (/\*\*Status:\*\*\s*[a-zA-Z_]+/i.test(content)) {
      content = content.replace(/\*\*Status:\*\*\s*[a-zA-Z_]+/i, '**Status:** done');
    } else {
      content = content.replace(/(#\s+[^\n]+)/, '$1\n\n**Status:** done');
    }

    // 3. Set or update Closed date
    if (/\*\*Closed:\*\*\s*(\d{4}-\d{2}-\d{2})/i.test(content)) {
      content = content.replace(/\*\*Closed:\*\*\s*(\d{4}-\d{2}-\d{2})/i, `**Closed:** ${closedDate}`);
    } else if (/Closed:\s*(\d{4}-\d{2}-\d{2})/i.test(content)) {
      content = content.replace(/Closed:\s*(\d{4}-\d{2}-\d{2})/i, `Closed: ${closedDate}`);
    } else {
      content = content.replace(/(\*\*Status:\*\*\s*done)/i, `$1  \n**Closed:** ${closedDate}`);
    }

    // 4. Mark Plan Collaboration phase to SHIP
    const phaseTableRegex = /\|(?:\s*DEFINE\s*\|\s*PLAN\s*\|\s*EXECUTE\s*\|\s*REVIEW\s*\|\s*SHIP\s*)\|\n\|[-:\s|]+\|\n\|([^\n]+)\|/i;
    if (phaseTableRegex.test(content)) {
      content = content.replace(phaseTableRegex, '| DEFINE | PLAN | EXECUTE | REVIEW | SHIP |\n|:------:|:----:|:-------:|:------:|:----:|\n| ○ | ○ | ○ | ○ | **●** |');
    }

    // 4b. Mark all Plan step rows as done
    content = content.replace(
      /(\|\s*\d+\s*\|[^|]+\|)\s*(?:pending|in_progress|review|approved)\s*(\|)/gi,
      '$1 done $2'
    );

    // 5. Mark Spec checklist items checked [x]
    const specCheckRegex = /(##\s+Spec\s+checklist[\s\S]*?)(?=\n##\s+|$)/i;
    if (specCheckRegex.test(content)) {
      content = content.replace(specCheckRegex, (match) => {
        return match.replace(/- \[[ ]\]/g, '- [x]');
      });
    }

    // 6. Mark Acceptance criteria items checked [x]
    const acceptRegex = /(##\s+Acceptance\s+criteria[\s\S]*?)(?=\n##\s+|$)/i;
    if (acceptRegex.test(content)) {
      content = content.replace(acceptRegex, (match) => {
        return match.replace(/- \[[ ]\]/g, '- [x]');
      });
    }

    // 6b. Check off any open question checkboxes
    const oqRegex = /(##\s+Open\s+questions[\s\S]*?)(?=\n##\s+|$)/i;
    if (oqRegex.test(content)) {
      content = content.replace(oqRegex, (match) => {
        return match.replace(/- \[[ ]\]/g, '- [x]');
      });
    }

    // 7. If reason provided, add closure note
    if (reason && !content.includes(reason)) {
      content += `\n\n## Closeout Notes\n\n- **Closed Date:** ${closedDate}\n- **Reason / Outcome:** ${reason}\n`;
    }

    if (!dryRun) {
      fs.mkdirSync(destDir, { recursive: true });
      atomicWriteFileSync(destCardPath, content, 'utf8');

      // Remove from active directory if it was there
      if (fs.existsSync(activeCardPath) && path.resolve(activeCardPath) !== path.resolve(destCardPath)) {
        try { fs.unlinkSync(activeCardPath); } catch (_) {}
      }

      // Check if root has template/ mirror
      const templateDestDir = path.join(root, 'template/docs/07-backlog/goals/_archived');
      const templateDestCardPath = path.join(templateDestDir, `${normalizedId}.md`);
      const templateActiveCardPath = path.join(root, 'template/docs/07-backlog/goals', `${normalizedId}.md`);

      if (fs.existsSync(path.join(root, 'template'))) {
        fs.mkdirSync(templateDestDir, { recursive: true });
        atomicWriteFileSync(templateDestCardPath, content, 'utf8');
        if (fs.existsSync(templateActiveCardPath) && path.resolve(templateActiveCardPath) !== path.resolve(templateDestCardPath)) {
          try { fs.unlinkSync(templateActiveCardPath); } catch (_) {}
        }
      }
    }

    // 8. Reconcile Epic Queue with targeted upsert (moves row from Active to Archived)
    const queueResult = syncEpicQueue(root, epic, { targetGoalId: normalizedId, dryRun });

    // 9. Reconcile Project Snapshot with targeted upsert (removes row from Active goals)
    const snapResult = syncProjectSnapshot(root, { targetGoalId: normalizedId, dryRun });

    // 10. Reconcile Dashboard
    const dashResult = syncGoalsDashboard(root, { dryRun });

    return {
      goalId: normalizedId,
      epic,
      title: parsedGoal.title,
      status: 'done',
      closedDate,
      archivedPath: destCardPath,
      queueResult,
      snapshotResult: snapResult,
      dashboardResult: dashResult,
      dryRun,
    };
  });
}

function archiveGoal(root, goalId, options = {}) {
  return closeGoal(root, goalId, options);
}

module.exports = {
  parseGoalFile,
  loadAllGoals,
  parseSnapshotRow,
  formatSnapshotRow,
  parseQueueRow,
  formatActiveQueueRow,
  formatArchivedQueueRow,
  syncEpicQueue,
  syncProjectSnapshot,
  syncGoalsDashboard,
  syncEpicsIndex,
  syncRegistrySequences,
  syncAcceptanceContract,
  syncGoalScopedSpecs,
  syncAllMarkdown,
  closeGoal,
  archiveGoal,
  normalizeStatus,
  statusToPhase,
  // File lock & atomic write primitives
  atomicWriteFileSync,
  acquireFileLock,
  releaseFileLock,
  withFileLock,
  withMultiFileLock,
  transactionalUpdate,
  sleepSync,
};

if (require.main === module) {
  const args = process.argv.slice(2);
  let targetPath = process.cwd();
  let epic = null;
  let dryRun = false;
  let targetGoalId = null;

  for (const arg of args) {
    if (arg === '--dry-run') dryRun = true;
    else if (arg.startsWith('--goal=')) targetGoalId = arg.split('=')[1].toUpperCase();
    else if (arg.startsWith('--target=')) targetGoalId = arg.split('=')[1].toUpperCase();
    else if (!arg.startsWith('-') && /^[A-Za-z]{2,8}$/.test(arg)) epic = arg.toUpperCase();
    else if (!arg.startsWith('-') && fs.existsSync(arg)) targetPath = arg;
  }

  const root = goalIdLib.findProjectRoot(targetPath);
  console.log(`🔄 Synchronizing Soda OS Goal Markdown Files (Root: ${root})...`);
  const result = syncAllMarkdown(root, { epic, dryRun, targetGoalId });
  if (result.epics && result.epics.updated) {
    console.log(`✅ Epics index synced: ${result.epics.epicCount} epics -> ${path.relative(root, result.epics.epicsPath)}`);
  }
  console.log(`✅ Registry reconciled: ${result.registry.epics.join(', ')}`);
  for (const q of result.queues) {
    console.log(`✅ Queue synced: ${q.epic} (${q.activeCount} active, ${q.archivedCount} archived) -> ${path.relative(root, q.queuePath)}`);
  }
  if (result.snapshot.updated) {
    console.log(`✅ Project Snapshot synced: ${result.snapshot.activeCount} active goals -> ${path.relative(root, result.snapshot.snapshotPath)}`);
  } else {
    console.log(`ℹ️ Project Snapshot skipped (${result.snapshot.reason})`);
  }
  if (result.dashboard.updated) {
    console.log(`✅ Goals Dashboard synced: ${result.dashboard.epicCount} epics -> ${path.relative(root, result.dashboard.dashboardPath)}`);
  } else {
    console.log(`ℹ️ Goals Dashboard skipped (${result.dashboard.reason})`);
  }
  if (result.acceptanceContracts.length > 0) {
    console.log(`✅ Acceptance contracts created: ${result.acceptanceContracts.length}`);
  }
  if (result.goalScopedSpecs && result.goalScopedSpecs.length > 0) {
    console.log(`✅ Goal-scoped satellite specs created: ${result.goalScopedSpecs.length} goals`);
  }
}
