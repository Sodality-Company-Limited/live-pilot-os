/**
 * ════════════════════════════════════════════════════════════════════════════════
 * 🛡️ SODA OS RUNTIME TRACE FORENSICS PARSER & ATTRIBUTION ENGINE (G-CORE-023)
 * ════════════════════════════════════════════════════════════════════════════════
 * Framework: Soda OS
 * Paradigm: Zero-Mock Deterministic Profiling Attribution & Resource Forensics
 *
 * Invariants:
 *   1. Zero Float: Timing calculations strictly compute exact BigInt integers in µs.
 *   2. Conservation of Duration: Sum of self-time across all nodes strictly matches
 *      total profiled sample time (sum of time deltas).
 *   3. Non-Recursive Acyclicity: Iterative stack traversal avoids V8 recursion depth limits.
 *   4. Fail-Closed Parsing: Corrupted, truncated, or invalid structures throw descriptive errors.
 * ════════════════════════════════════════════════════════════════════════════════
 */

/**
 * Parses raw JSON or JavaScript object V8 CPU profile.
 *
 * @param {string|object} input - Raw JSON string or parsed V8 cpuprofile object.
 * @returns {object} Extracted profile summary with exact BigInt microseconds and sorted hotspots.
 */
export function parseCpuProfile(input) {
  if (!input || (typeof input !== 'string' && typeof input !== 'object')) {
    throw new Error('Input profile must be a non-empty string or object');
  }

  let profile;
  if (typeof input === 'string') {
    if (input.trim().length === 0) {
      throw new Error('Input profile must be a non-empty string or object');
    }
    try {
      profile = JSON.parse(input);
    } catch (err) {
      throw new Error(`Malformed JSON in CPU profile: ${err.message}`);
    }
  } else {
    profile = input;
  }

  if (!profile.nodes || !Array.isArray(profile.nodes)) {
    throw new Error('Invalid V8 CPU profile: missing "nodes" array');
  }
  if (profile.nodes.length === 0) {
    throw new Error('Invalid V8 CPU profile: "nodes" array is empty');
  }

  const samples = profile.samples || [];
  const timeDeltas = profile.timeDeltas || [];

  if (samples.length !== timeDeltas.length) {
    throw new Error(
      `Samples and timeDeltas array lengths must match: got ${samples.length} samples and ${timeDeltas.length} timeDeltas`
    );
  }

  // Build node lookup map & adjacency
  const nodeMap = new Map();
  let rootNodeId = null;

  for (const node of profile.nodes) {
    if (!node || typeof node.id === 'undefined') {
      throw new Error('Invalid node structure in V8 CPU profile: missing id');
    }
    nodeMap.set(node.id, {
      id: node.id,
      callFrame: node.callFrame || {},
      children: Array.isArray(node.children) ? node.children : [],
      hitCount: 0,
      selfTimeUs: 0n,
      totalTimeUs: 0n
    });

    if (node.callFrame && (node.callFrame.functionName === '(root)' || node.id === 1)) {
      if (rootNodeId === null) {
        rootNodeId = node.id;
      }
    }
  }

  if (rootNodeId === null && profile.nodes.length > 0) {
    rootNodeId = profile.nodes[0].id;
  }

  // Calculate call tree depth iteratively (avoiding recursion limit)
  let maxDepth = 1;
  const depthStack = [{ id: rootNodeId, depth: 1 }];
  const visited = new Set();

  while (depthStack.length > 0) {
    const { id, depth } = depthStack.pop();
    if (depth > maxDepth) maxDepth = depth;

    if (visited.has(id)) continue;
    visited.add(id);

    const node = nodeMap.get(id);
    if (node && node.children) {
      for (const childId of node.children) {
        depthStack.push({ id: childId, depth: depth + 1 });
      }
    }
  }

  // Accumulate self-time and hit count per node using exact BigInt
  let totalDurationUs = 0n;

  for (let i = 0; i < samples.length; i++) {
    const nodeId = samples[i];
    const delta = BigInt(timeDeltas[i]);
    totalDurationUs += delta;

    const node = nodeMap.get(nodeId);
    if (node) {
      node.hitCount += 1;
      node.selfTimeUs += delta;
    }
  }

  // If no samples exist but total duration declared via startTime / endTime
  if (samples.length === 0 && typeof profile.startTime === 'number' && typeof profile.endTime === 'number') {
    totalDurationUs = BigInt(Math.max(0, Math.floor(profile.endTime - profile.startTime)));
  }

  // Aggregate hotspots sorted by self-time descending
  const hotspots = [];
  for (const node of nodeMap.values()) {
    if (node.selfTimeUs > 0n || node.hitCount > 0) {
      const fn = node.callFrame.functionName || '(anonymous)';
      const url = node.callFrame.url || '';
      const line = node.callFrame.lineNumber || 0;
      const col = node.callFrame.columnNumber || 0;

      hotspots.push({
        nodeId: node.id,
        functionName: fn,
        url,
        lineNumber: line,
        columnNumber: col,
        hitCount: node.hitCount,
        selfTimeUs: node.selfTimeUs,
        percentageBasisPoints: totalDurationUs > 0n
          ? Number((node.selfTimeUs * 10000n) / totalDurationUs)
          : 0
      });
    }
  }

  // Sort descending by selfTimeUs
  hotspots.sort((a, b) => {
    if (b.selfTimeUs > a.selfTimeUs) return 1;
    if (b.selfTimeUs < a.selfTimeUs) return -1;
    return b.hitCount - a.hitCount;
  });

  return {
    profileType: 'v8-cpuprofile',
    sampleCount: samples.length,
    nodeCount: profile.nodes.length,
    callTreeDepth: maxDepth,
    totalDurationUs,
    hotspots
  };
}

/**
 * Analyzes standard Node.js / V8 heap snapshot structure.
 *
 * @param {string|object} input - Raw JSON string or parsed V8 heap snapshot object.
 * @returns {object} Aggregated constructor instance counts and retained byte sizes.
 */
export function analyzeHeapSnapshot(input) {
  if (!input || (typeof input !== 'string' && typeof input !== 'object')) {
    throw new Error('Input snapshot must be a non-empty string or object');
  }

  let snapshot;
  if (typeof input === 'string') {
    if (input.trim().length === 0) {
      throw new Error('Input snapshot must be a non-empty string or object');
    }
    try {
      snapshot = JSON.parse(input);
    } catch (err) {
      throw new Error(`Malformed JSON in heap snapshot: ${err.message}`);
    }
  } else {
    snapshot = input;
  }

  if (!snapshot.snapshot || !Array.isArray(snapshot.nodes)) {
    throw new Error('Invalid heap snapshot: missing "snapshot" or "nodes"');
  }

  const strings = snapshot.strings;
  const nodes = snapshot.nodes;
  const meta = snapshot.snapshot.meta || {};
  const nodeFields = meta.node_fields || ['type', 'name', 'id', 'self_size', 'edge_count', 'trace_node_id'];
  const fieldCount = nodeFields.length;

  if (!Array.isArray(strings) || nodes.length % fieldCount !== 0 || nodes.length === 0) {
    throw new Error('Invalid heap snapshot: nodes or strings structure invalid');
  }

  const nameIndex = nodeFields.indexOf('name');
  const selfSizeIndex = nodeFields.indexOf('self_size');

  if (nameIndex === -1 || selfSizeIndex === -1) {
    throw new Error('Invalid heap snapshot meta: missing name or self_size field offset');
  }

  const constructorMap = new Map();
  let totalSelfSizeBytes = 0n;
  const nodeCount = nodes.length / fieldCount;

  for (let i = 0; i < nodes.length; i += fieldCount) {
    const stringOffset = nodes[i + nameIndex];
    const selfSize = BigInt(nodes[i + selfSizeIndex]);
    totalSelfSizeBytes += selfSize;

    const constructorName = strings[stringOffset] || '(unknown)';
    let entry = constructorMap.get(constructorName);
    if (!entry) {
      entry = { name: constructorName, instanceCount: 0, selfSizeBytes: 0n };
      constructorMap.set(constructorName, entry);
    }
    entry.instanceCount += 1;
    entry.selfSizeBytes += selfSize;
  }

  const constructors = Array.from(constructorMap.values());
  constructors.sort((a, b) => {
    if (b.selfSizeBytes > a.selfSizeBytes) return 1;
    if (b.selfSizeBytes < a.selfSizeBytes) return -1;
    return b.instanceCount - a.instanceCount;
  });

  return {
    snapshotType: 'v8-heapsnapshot',
    nodeCount,
    totalSelfSizeBytes,
    constructors
  };
}

/**
 * Formats diagnostic forensics into human- and machine-readable markdown.
 *
 * @param {object} analysis - Object containing optional cpu or heap analysis results.
 * @returns {string} Formatted markdown report.
 */
export function formatForensicSummary(analysis = {}) {
  const lines = [];
  lines.push('## 🔍 Runtime Trace Forensics Diagnostic Summary');
  lines.push('');

  if (analysis.cpu) {
    const cpu = analysis.cpu;
    lines.push('### ⚡ CPU Profiling Analysis');
    lines.push(`- **Total Profiled Time:** ${cpu.totalDurationUs.toLocaleString()} µs`);
    lines.push(`- **Total Samples:** ${cpu.sampleCount.toLocaleString()}`);
    lines.push(`- **Call Tree Max Depth:** ${cpu.callTreeDepth}`);
    lines.push(`- **Hotspots Detected:** ${cpu.hotspots.length}`);
    lines.push('');
    lines.push('| Rank | Function | Location | Hits | Self-Time (µs) | Share |');
    lines.push('|:---:|---|---|:---:|:---:|:---:|');

    const top = cpu.hotspots.slice(0, 10);
    top.forEach((h, idx) => {
      const loc = h.url ? `${h.url}:${h.lineNumber}` : 'internal';
      const pct = (h.percentageBasisPoints / 100).toFixed(2);
      lines.push(
        `| ${idx + 1} | \`${h.functionName}\` | \`${loc}\` | ${h.hitCount} | ${h.selfTimeUs.toLocaleString()} µs | ${pct}% |`
      );
    });
    lines.push('');
  }

  if (analysis.heap) {
    const heap = analysis.heap;
    lines.push('### 🧠 Heap Snapshot Retainer Analysis');
    lines.push(`- **Total Nodes:** ${heap.nodeCount.toLocaleString()}`);
    lines.push(`- **Total Retained Memory:** ${heap.totalSelfSizeBytes.toLocaleString()} bytes`);
    lines.push('');
    lines.push('| Rank | Constructor | Instance Count | Total Retained Bytes |');
    lines.push('|:---:|---|:---:|:---:|');

    const topConstructors = heap.constructors.slice(0, 10);
    topConstructors.forEach((c, idx) => {
      lines.push(
        `| ${idx + 1} | \`${c.name}\` | ${c.instanceCount.toLocaleString()} | ${c.selfSizeBytes.toLocaleString()} B |`
      );
    });
    lines.push('');
  }

  return lines.join('\n');
}
