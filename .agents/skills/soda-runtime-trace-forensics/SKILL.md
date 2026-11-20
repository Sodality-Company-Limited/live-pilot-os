---
name: soda-runtime-trace-forensics
description: Diagnostic runtime trace forensics, V8 CPU profiling, event-loop lag attribution, and Node.js heap snapshot retainer analysis.
version: 1.0.0
author: Soda OS Core Architecture
date: 2026-10-18
---

# Runtime Trace Forensics (`soda-runtime-trace-forensics`)

## Purpose
Enables autonomous agents and senior engineers to diagnose real runtime performance anomalies, CPU spikes, event loop blockages, and memory leaks by ingesting captured V8 CPU profiles (`.cpuprofile`) and heap snapshots (`.heapsnapshot`) rather than guessing from static source inspection.

## Collaboration Phase
`PLAN` → `EXECUTE` → `REVIEW`

## Invariants
1. **Zero Mocks, Zero Guesswork:** All hotspot and memory analysis must be grounded in parsed runtime profiling artifacts.
2. **Exact Microsecond Arithmetic:** Timings must calculate exact integer durations using `BigInt` microseconds without floating-point distortion.
3. **Conservation Law:** $\sum \text{self\_time}(node_i) \equiv \text{total\_sampled\_time}$.

## Diagnostic Usage

```javascript
import { parseCpuProfile, analyzeHeapSnapshot, formatForensicSummary } from 'scripts/lib/trace-forensics-parser.mjs';
import fs from 'node:fs';

// 1. Analyze CPU Profile
const profileData = fs.readFileSync('traces/cpu.cpuprofile', 'utf8');
const cpuAnalysis = parseCpuProfile(profileData);

// 2. Analyze Heap Snapshot
const snapshotData = fs.readFileSync('traces/heap.heapsnapshot', 'utf8');
const heapAnalysis = analyzeHeapSnapshot(snapshotData);

// 3. Format Diagnostic Summary
const summary = formatForensicSummary({ cpu: cpuAnalysis, heap: heapAnalysis });
console.log(summary);
```

## Attribution Workflow
1. **Capture:** Capture `.cpuprofile` or `.heapsnapshot` during benchmark or production reproduction episode.
2. **Ingest & Parse:** Run `trace-forensics-parser.mjs` to aggregate self-times and retained instance sizes.
3. **Isolate Hotspots:** Identify functions with high `selfTimeUs` and large basis-point shares.
4. **Targeted Optimization:** Formulate atomic goal addressing the top hotspot function directly within its declared touch map.
5. **Verify:** Re-run profile capture and verify monotonic reduction in hotspot self-time.
