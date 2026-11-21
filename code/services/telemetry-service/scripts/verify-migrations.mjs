import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const REQUIRED_TABLES = {
  'telemetry.telemetry_signals': [
    'signal_id',
    'tenant_id',
    'session_id',
    'signal_type',
    'state',
    'source',
    'payload',
    'payload_hash',
    'occurred_at',
    'occurred_at_ms',
    'created_at',
    'updated_at',
  ],
  'telemetry.telemetry_lineage': [
    'signal_id',
    'tenant_id',
    'session_id',
    'provider_event_id',
    'correlation_id',
    'causation_id',
    'producer',
    'created_at',
  ],
  'telemetry.telemetry_inbox': [
    'message_id',
    'consumer_name',
    'tenant_id',
    'session_id',
    'processed_at',
  ],
  'telemetry.telemetry_outbox': [
    'id',
    'aggregate_type',
    'aggregate_id',
    'tenant_id',
    'subject',
    'payload',
    'headers',
    'status',
    'created_at',
    'published_at',
  ],
};

const REQUIRED_SIGNAL_TYPES = [
  'chat',
  'viewer_count',
  'product_click',
  'cart_add',
  'checkout',
  'payment',
  'order',
  'engagement',
  'voucher',
  'stock',
];

const REQUIRED_STATES = [
  'received',
  'validated',
  'persisted',
  'dispatched',
  'failed',
  'dead_lettered',
];

/**
 * Splits PostgreSQL script into validated top-level SQL statements while
 * enforcing balanced quotes, comments, dollar-quoted blocks, and parentheses.
 */
export function splitSqlStatements(sql) {
  if (typeof sql !== 'string' || sql.trim().length === 0) {
    throw new Error('SQL input must be a non-empty string');
  }

  const statements = [];
  let buffer = '';
  let line = 1;
  let stmtStartLine = 1;
  let parenDepth = 0;
  let i = 0;

  while (i < sql.length) {
    const ch = sql[i];
    const next = sql[i + 1] ?? '';

    if (ch === '\n') {
      line += 1;
    }

    // Line comment: -- ...
    if (ch === '-' && next === '-') {
      i += 2;
      while (i < sql.length && sql[i] !== '\n') {
        i += 1;
      }
      continue;
    }

    // Block comment: /* ... */
    if (ch === '/' && next === '*') {
      const startLine = line;
      i += 2;
      let closed = false;
      while (i < sql.length) {
        if (sql[i] === '\n') line += 1;
        if (sql[i] === '*' && sql[i + 1] === '/') {
          i += 2;
          closed = true;
          break;
        }
        i += 1;
      }
      if (!closed) {
        throw new Error(`Unclosed block comment starting at line ${startLine}`);
      }
      continue;
    }

    // Single-quoted string literal
    if (ch === "'") {
      const startLine = line;
      if (buffer.trim().length === 0) stmtStartLine = startLine;
      buffer += ch;
      i += 1;
      let closed = false;
      while (i < sql.length) {
        const cur = sql[i];
        if (cur === '\n') line += 1;
        buffer += cur;
        if (cur === "'") {
          if (sql[i + 1] === "'") {
            buffer += "'";
            i += 2;
            continue;
          }
          i += 1;
          closed = true;
          break;
        }
        i += 1;
      }
      if (!closed) {
        throw new Error(`Unclosed single-quoted string starting at line ${startLine}`);
      }
      continue;
    }

    // Double-quoted identifier
    if (ch === '"') {
      const startLine = line;
      if (buffer.trim().length === 0) stmtStartLine = startLine;
      buffer += ch;
      i += 1;
      let closed = false;
      while (i < sql.length) {
        const cur = sql[i];
        if (cur === '\n') line += 1;
        buffer += cur;
        if (cur === '"') {
          if (sql[i + 1] === '"') {
            buffer += '"';
            i += 2;
            continue;
          }
          i += 1;
          closed = true;
          break;
        }
        i += 1;
      }
      if (!closed) {
        throw new Error(`Unclosed double-quoted identifier starting at line ${startLine}`);
      }
      continue;
    }

    // Dollar-quoted string ($tag$...$tag$)
    if (ch === '$') {
      const tagMatch = sql.slice(i).match(/^\$[A-Za-z_0-9]*\$/);
      if (tagMatch) {
        const tag = tagMatch[0];
        const startLine = line;
        if (buffer.trim().length === 0) stmtStartLine = startLine;
        const endIdx = sql.indexOf(tag, i + tag.length);
        if (endIdx === -1) {
          throw new Error(`Unclosed dollar-quoted block ${tag} starting at line ${startLine}`);
        }
        const chunk = sql.slice(i, endIdx + tag.length);
        for (const c of chunk) {
          if (c === '\n') line += 1;
        }
        buffer += chunk;
        i = endIdx + tag.length;
        continue;
      }
    }

    if (buffer.trim().length === 0 && !/\s/.test(ch)) {
      stmtStartLine = line;
    }

    if (ch === '(') {
      parenDepth += 1;
    } else if (ch === ')') {
      parenDepth -= 1;
      if (parenDepth < 0) {
        throw new Error(`Unmatched closing parenthesis at line ${line}`);
      }
    }

    if (ch === ';' && parenDepth === 0) {
      const trimmed = buffer.trim();
      if (trimmed.length > 0) {
        statements.push({ text: trimmed, line: stmtStartLine });
      }
      buffer = '';
      i += 1;
      continue;
    }

    buffer += ch;
    i += 1;
  }

  if (parenDepth !== 0) {
    throw new Error(`Unbalanced parentheses at end of SQL (depth=${parenDepth})`);
  }
  if (buffer.trim().length > 0) {
    throw new Error(`Unterminated SQL statement starting at line ${stmtStartLine}: "${buffer.trim().slice(0, 60)}"`);
  }
  if (statements.length === 0) {
    throw new Error('SQL file contains zero executable statements');
  }

  return statements;
}

/**
 * Splits a CREATE TABLE (...) body on top-level commas (outside nested parens/quotes).
 */
function splitTopLevelItems(body) {
  const items = [];
  let cur = '';
  let depth = 0;
  let inSingleQuote = false;

  for (let i = 0; i < body.length; i += 1) {
    const ch = body[i];
    if (ch === "'") {
      cur += ch;
      if (inSingleQuote && body[i + 1] === "'") {
        cur += "'";
        i += 1;
        continue;
      }
      inSingleQuote = !inSingleQuote;
      continue;
    }
    if (!inSingleQuote) {
      if (ch === '(') depth += 1;
      else if (ch === ')') depth -= 1;
      else if (ch === ',' && depth === 0) {
        if (cur.trim()) items.push(cur.trim());
        cur = '';
        continue;
      }
    }
    cur += ch;
  }
  if (cur.trim()) items.push(cur.trim());
  return items;
}

function normalizeIdentifier(raw) {
  return raw.replace(/"/g, '').trim().toLowerCase();
}

/**
 * Validates up and down migration SQL pair for syntax, schema boundaries,
 * constraints, zero-float types, RLS isolation, and idempotency.
 */
export function verifyMigrationPair({ upSql, downSql }) {
  const upStmts = splitSqlStatements(upSql);
  const downStmts = splitSqlStatements(downSql);

  const createdSchemas = new Set();
  const createdTables = new Map();
  const createdIndexes = [];
  const rlsEnabled = new Set();
  const rlsForced = new Set();
  const policies = new Map();
  const revokedPublic = new Set();

  for (let idx = 0; idx < upStmts.length; idx += 1) {
    const { text, line } = upStmts[idx];

    // Enforce zero-float invariant on DDL types (outside string literals)
    const outsideStrings = text.replace(/'(?:''|[^'])*'/g, "''");
    if (/\b(?:REAL|DOUBLE\s+PRECISION|FLOAT\d*)\b/i.test(outsideStrings)) {
      throw new Error(`Zero-float violation in UP statement at line ${line}: ${text.slice(0, 80)}`);
    }

    const schemaMatch = text.match(/^CREATE\s+SCHEMA\s+(IF\s+NOT\s+EXISTS\s+)?([A-Za-z_][A-Za-z0-9_]*)$/i);
    if (schemaMatch) {
      if (!schemaMatch[1]) {
        throw new Error(`CREATE SCHEMA must include IF NOT EXISTS for idempotency (line ${line})`);
      }
      createdSchemas.add(normalizeIdentifier(schemaMatch[2]));
      continue;
    }

    const tableMatch = text.match(/^CREATE\s+TABLE\s+(IF\s+NOT\s+EXISTS\s+)?([A-Za-z_][A-Za-z0-9_]*(?:\.[A-Za-z_][A-Za-z0-9_]*)?)\s*\(([\s\S]+)\)$/i);
    if (tableMatch) {
      if (!tableMatch[1]) {
        throw new Error(`CREATE TABLE must include IF NOT EXISTS for idempotency (line ${line})`);
      }
      const tableName = normalizeIdentifier(tableMatch[2]);
      if (!tableName.startsWith('telemetry.')) {
        throw new Error(`Table "${tableName}" must reside in the telemetry schema (line ${line})`);
      }
      const bodyItems = splitTopLevelItems(tableMatch[3]);
      const columns = new Map();
      const constraints = [];

      for (const item of bodyItems) {
        if (/^(?:CONSTRAINT|PRIMARY\s+KEY|UNIQUE|CHECK|FOREIGN\s+KEY)\b/i.test(item)) {
          constraints.push(item);
        } else {
          const colMatch = item.match(/^([A-Za-z_][A-Za-z0-9_]*)\s+([\s\S]+)$/);
          if (!colMatch) {
            throw new Error(`Malformed column definition in ${tableName} at line ${line}: "${item}"`);
          }
          columns.set(normalizeIdentifier(colMatch[1]), colMatch[2]);
        }
      }
      createdTables.set(tableName, { columns, constraints, raw: text });
      continue;
    }

    const indexMatch = text.match(/^CREATE\s+(UNIQUE\s+)?INDEX\s+(IF\s+NOT\s+EXISTS\s+)?([A-Za-z_][A-Za-z0-9_]*)\s+ON\s+([A-Za-z_][A-Za-z0-9_]*(?:\.[A-Za-z_][A-Za-z0-9_]*)?)\s*\(([^)]+)\)([\s\S]*)$/i);
    if (indexMatch) {
      if (!indexMatch[2]) {
        throw new Error(`CREATE INDEX must include IF NOT EXISTS for idempotency (line ${line})`);
      }
      const tableName = normalizeIdentifier(indexMatch[4]);
      if (!tableName.startsWith('telemetry.')) {
        throw new Error(`Index "${indexMatch[3]}" targets cross-service table "${tableName}" (line ${line})`);
      }
      createdIndexes.push({
        unique: Boolean(indexMatch[1]),
        name: normalizeIdentifier(indexMatch[3]),
        table: tableName,
        columns: indexMatch[5].replace(/\s+/g, ' ').trim().toLowerCase(),
        suffix: (indexMatch[6] ?? '').replace(/\s+/g, ' ').trim().toLowerCase(),
      });
      continue;
    }

    const alterRlsMatch = text.match(/^ALTER\s+TABLE\s+([A-Za-z_][A-Za-z0-9_]*\.[A-Za-z_][A-Za-z0-9_]*)\s+(ENABLE|FORCE)\s+ROW\s+LEVEL\s+SECURITY$/i);
    if (alterRlsMatch) {
      const tableName = normalizeIdentifier(alterRlsMatch[1]);
      if (alterRlsMatch[2].toUpperCase() === 'ENABLE') rlsEnabled.add(tableName);
      else rlsForced.add(tableName);
      continue;
    }

    const createPolicyMatch = text.match(/^CREATE\s+POLICY\s+([A-Za-z_][A-Za-z0-9_]*)\s+ON\s+([A-Za-z_][A-Za-z0-9_]*\.[A-Za-z_][A-Za-z0-9_]*)([\s\S]+)$/i);
    if (createPolicyMatch) {
      const policyName = normalizeIdentifier(createPolicyMatch[1]);
      const tableName = normalizeIdentifier(createPolicyMatch[2]);
      const prev = upStmts[idx - 1]?.text ?? '';
      const expectedDropRe = new RegExp(`^DROP\\s+POLICY\\s+IF\\s+EXISTS\\s+${policyName}\\s+ON\\s+${tableName.replace('.', '\\.')}$`, 'i');
      if (!expectedDropRe.test(prev)) {
        throw new Error(`CREATE POLICY ${policyName} ON ${tableName} must be preceded by DROP POLICY IF EXISTS for idempotency (line ${line})`);
      }
      policies.set(tableName, { name: policyName, body: createPolicyMatch[3] });
      continue;
    }

    const revokeMatch = text.match(/^REVOKE\s+ALL\s+ON\s+(?:SCHEMA\s+)?([A-Za-z_][A-Za-z0-9_]*(?:\.[A-Za-z_][A-Za-z0-9_]*)?)\s+FROM\s+PUBLIC$/i);
    if (revokeMatch) {
      revokedPublic.add(normalizeIdentifier(revokeMatch[1]));
      continue;
    }
  }

  if (!createdSchemas.has('telemetry')) {
    throw new Error('UP migration must define CREATE SCHEMA IF NOT EXISTS telemetry');
  }

  for (const [tableName, requiredCols] of Object.entries(REQUIRED_TABLES)) {
    const def = createdTables.get(tableName);
    if (!def) {
      throw new Error(`UP migration missing required table: ${tableName}`);
    }
    for (const col of requiredCols) {
      if (!def.columns.has(col)) {
        throw new Error(`Table ${tableName} missing required column: ${col}`);
      }
    }
    if (!rlsEnabled.has(tableName) || !rlsForced.has(tableName)) {
      throw new Error(`Table ${tableName} must have both ENABLE and FORCE ROW LEVEL SECURITY`);
    }
    const policy = policies.get(tableName);
    if (!policy) {
      throw new Error(`Table ${tableName} missing tenant isolation RLS policy`);
    }
    if (!/USING\s*\(\s*tenant_id\s*=\s*current_setting\s*\(\s*'app\.tenant_id'\s*,\s*true\s*\)\s*\)/i.test(policy.body) ||
        !/WITH\s+CHECK\s*\(\s*tenant_id\s*=\s*current_setting\s*\(\s*'app\.tenant_id'\s*,\s*true\s*\)\s*\)/i.test(policy.body)) {
      throw new Error(`RLS policy on ${tableName} must enforce tenant_id = current_setting('app.tenant_id', true) in USING and WITH CHECK`);
    }
    if (!revokedPublic.has(tableName)) {
      throw new Error(`Table ${tableName} must execute REVOKE ALL ON ${tableName} FROM PUBLIC`);
    }
  }

  // Validate telemetry_signals invariants
  const signalsDef = createdTables.get('telemetry.telemetry_signals');
  for (const signalType of REQUIRED_SIGNAL_TYPES) {
    if (!signalsDef.raw.includes(`'${signalType}'`)) {
      throw new Error(`telemetry_signals missing signal_type enum constraint value: ${signalType}`);
    }
  }
  for (const stateVal of REQUIRED_STATES) {
    if (!signalsDef.raw.includes(`'${stateVal}'`)) {
      throw new Error(`telemetry_signals missing state enum constraint value: ${stateVal}`);
    }
  }
  const occurredMsDef = signalsDef.columns.get('occurred_at_ms');
  if (!/\bbigint\b/i.test(occurredMsDef) || !/occurred_at_ms\s*>=\s*0/i.test(occurredMsDef)) {
    throw new Error('telemetry_signals.occurred_at_ms must be bigint with CHECK (occurred_at_ms >= 0)');
  }
  if (!signalsDef.constraints.some((c) => /PRIMARY\s+KEY\s*\(\s*tenant_id\s*,\s*session_id\s*,\s*signal_id\s*\)/i.test(c))) {
    throw new Error('telemetry_signals must declare PRIMARY KEY (tenant_id, session_id, signal_id)');
  }

  const hasSignalsUniqueIdx = createdIndexes.some(
    (idx) => idx.unique && idx.table === 'telemetry.telemetry_signals' && idx.columns === 'tenant_id, session_id, signal_id'
  );
  if (!hasSignalsUniqueIdx) {
    throw new Error('Missing unique index on telemetry.telemetry_signals (tenant_id, session_id, signal_id)');
  }

  // Validate telemetry_lineage foreign key to telemetry_signals
  const lineageDef = createdTables.get('telemetry.telemetry_lineage');
  const hasLineageFk = lineageDef.constraints.some(
    (c) => /FOREIGN\s+KEY\s*\(\s*tenant_id\s*,\s*session_id\s*,\s*signal_id\s*\)\s+REFERENCES\s+telemetry\.telemetry_signals\s*\(\s*tenant_id\s*,\s*session_id\s*,\s*signal_id\s*\)/i.test(c)
  );
  if (!hasLineageFk) {
    throw new Error('telemetry_lineage must declare composite FOREIGN KEY (tenant_id, session_id, signal_id) referencing telemetry.telemetry_signals');
  }

  // Validate telemetry_outbox pending polling index
  const hasOutboxPendingIdx = createdIndexes.some(
    (idx) => idx.table === 'telemetry.telemetry_outbox' && idx.suffix.includes("where status = 'pending'")
  );
  if (!hasOutboxPendingIdx) {
    throw new Error('Missing partial pending index on telemetry.telemetry_outbox WHERE status = \'pending\'');
  }

  // Validate DOWN migration idempotency, completeness, and reverse dependency order
  const droppedPolicies = new Set();
  const droppedTables = [];
  const droppedSchemas = new Set();

  for (const { text, line } of downStmts) {
    const dropMatch = text.match(/^DROP\s+(POLICY|INDEX|TABLE|SCHEMA)\s+(IF\s+EXISTS\s+)?([\s\S]+)$/i);
    if (!dropMatch) {
      throw new Error(`Unexpected statement in DOWN migration at line ${line}: ${text}`);
    }
    const kind = dropMatch[1].toUpperCase();
    if (!dropMatch[2]) {
      throw new Error(`DOWN statement DROP ${kind} must include IF EXISTS for idempotency (line ${line})`);
    }
    const target = dropMatch[3].trim();

    if (kind === 'POLICY') {
      const m = target.match(/^([A-Za-z_][A-Za-z0-9_]*)\s+ON\s+([A-Za-z_][A-Za-z0-9_]*\.[A-Za-z_][A-Za-z0-9_]*)$/i);
      if (!m) throw new Error(`Malformed DROP POLICY in DOWN migration at line ${line}`);
      const tableName = normalizeIdentifier(m[2]);
      if (!tableName.startsWith('telemetry.')) {
        throw new Error(`Cross-service policy drop forbidden: ${tableName} (line ${line})`);
      }
      droppedPolicies.add(`${tableName}:${normalizeIdentifier(m[1])}`);
    } else if (kind === 'INDEX') {
      const idxName = normalizeIdentifier(target);
      if (!idxName.startsWith('telemetry.')) {
        throw new Error(`Cross-service index drop forbidden: ${idxName} (line ${line})`);
      }
    } else if (kind === 'TABLE') {
      const tableName = normalizeIdentifier(target);
      if (!tableName.startsWith('telemetry.')) {
        throw new Error(`Cross-service table drop forbidden: ${tableName} (line ${line})`);
      }
      droppedTables.push(tableName);
    } else if (kind === 'SCHEMA') {
      const schemaName = normalizeIdentifier(target);
      if (schemaName !== 'telemetry') {
        throw new Error(`Cross-service schema drop forbidden: ${schemaName} (line ${line})`);
      }
      droppedSchemas.add(schemaName);
    }
  }

  for (const [tableName, policy] of policies.entries()) {
    if (!droppedPolicies.has(`${tableName}:${policy.name}`)) {
      throw new Error(`DOWN migration missing DROP POLICY IF EXISTS ${policy.name} ON ${tableName}`);
    }
  }

  for (const tableName of Object.keys(REQUIRED_TABLES)) {
    if (!droppedTables.includes(tableName)) {
      throw new Error(`DOWN migration missing DROP TABLE IF EXISTS ${tableName}`);
    }
  }

  const lineageDropIdx = droppedTables.indexOf('telemetry.telemetry_lineage');
  const signalsDropIdx = droppedTables.indexOf('telemetry.telemetry_signals');
  if (lineageDropIdx > signalsDropIdx) {
    throw new Error('DOWN migration must drop telemetry.telemetry_lineage before telemetry.telemetry_signals (FK dependency order)');
  }

  if (!droppedSchemas.has('telemetry')) {
    throw new Error('DOWN migration must drop schema telemetry via DROP SCHEMA IF EXISTS telemetry');
  }

  return {
    upStatementCount: upStmts.length,
    downStatementCount: downStmts.length,
    tables: Array.from(createdTables.keys()),
    indexes: createdIndexes.map((idx) => idx.name),
    rlsTables: Array.from(rlsForced),
  };
}

/**
 * When DATABASE_URL is present, runs real PostgreSQL apply -> re-apply -> rollback -> re-apply.
 */
export async function verifyLivePostgres({ upSql, downSql, databaseUrl }) {
  if (!databaseUrl) {
    return { executed: false, reason: 'DATABASE_URL not configured' };
  }

  const pgMod = await import('pg');
  const Client = pgMod.default?.Client ?? pgMod.Client;
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    await client.query('BEGIN');
    // 1. Fresh apply
    await client.query(upSql);
    // 2. Idempotent re-apply
    await client.query(upSql);
    const upCheck = await client.query(
      "SELECT to_regclass('telemetry.telemetry_signals') AS signals, " +
      "to_regclass('telemetry.telemetry_lineage') AS lineage, " +
      "to_regclass('telemetry.telemetry_inbox') AS inbox, " +
      "to_regclass('telemetry.telemetry_outbox') AS outbox"
    );
    const row = upCheck.rows[0];
    if (!row?.signals || !row?.lineage || !row?.inbox || !row?.outbox) {
      throw new Error('Live PostgreSQL verification failed: expected telemetry tables not created');
    }
    // 3. Rollback
    await client.query(downSql);
    const downCheck = await client.query("SELECT to_regclass('telemetry.telemetry_signals') AS signals");
    if (downCheck.rows[0]?.signals !== null) {
      throw new Error('Live PostgreSQL verification failed: telemetry.telemetry_signals still exists after down migration');
    }
    // 4. Re-apply after rollback
    await client.query(upSql);
    await client.query('ROLLBACK');
    return { executed: true, reason: 'up -> up -> down -> up passed against PostgreSQL' };
  } finally {
    await client.end();
  }
}

export async function runVerification() {
  const here = dirname(fileURLToPath(import.meta.url));
  const upPath = resolve(here, '../migrations/001_create_telemetry_signals.up.sql');
  const downPath = resolve(here, '../migrations/001_create_telemetry_signals.down.sql');

  const [upSql, downSql] = await Promise.all([
    readFile(upPath, 'utf8'),
    readFile(downPath, 'utf8'),
  ]);

  const structuralSummary = verifyMigrationPair({ upSql, downSql });
  const liveSummary = await verifyLivePostgres({
    upSql,
    downSql,
    databaseUrl: process.env.DATABASE_URL,
  });

  return { structuralSummary, liveSummary };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = await runVerification();
  console.log(
    JSON.stringify(
      {
        goal: 'G-TELM-003',
        status: 'PASS',
        ...result.structuralSummary,
        livePostgres: result.liveSummary,
      },
      null,
      2
    )
  );
}
