#!/usr/bin/env node
/**
 * 🛡️ Compose Topology and Service Isolation Validator
 * Goal: G-INFRA-578
 *
 * Fast, static AST/YAML topology validator for Docker Compose files in Sodality Creator Hub.
 * Validates Compose syntax, host port uniqueness, network linkage (sodality-shared-net),
 * and healthcheck contracts across all modular stacks in < 3,000ms without requiring Docker daemon.
 */

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = resolve(__dirname, '../..');

const startTime = Date.now();

console.log('================================================================================');
console.log('🛡️ COMPOSE TOPOLOGY & SERVICE ISOLATION VALIDATOR');
console.log('   Goal: G-INFRA-578');
console.log('================================================================================\n');

// 1. Recursive file discovery
export function findComposeFiles(dir) {
  let results = [];
  if (!existsSync(dir)) return results;
  const entries = readdirSync(dir);
  for (const entry of entries) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      results = results.concat(findComposeFiles(full));
    } else if (entry.endsWith('.yml') || entry.endsWith('.yaml')) {
      results.push(full);
    }
  }
  return results;
}

// 2. Parsing services, ports, networks, and healthchecks from Compose YAML
export function parseComposeFile(filePath, contentOverride = null) {
  const content = contentOverride !== null ? contentOverride : readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  let inServices = false;
  let currentService = null;
  const services = {};
  const topNetworks = new Set();

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();
    if (trimmed.startsWith('#') || trimmed === '') continue;

    const indent = rawLine.search(/\S/);

    // Track top-level blocks
    if (indent === 0) {
      if (rawLine.startsWith('services:')) {
        inServices = true;
        currentService = null;
        continue;
      } else {
        inServices = false;
        currentService = null;
      }

      if (rawLine.startsWith('networks:')) {
        continue;
      }
    }

    // Top level network items (indent 2 under networks:)
    if (!inServices && indent === 2 && trimmed.endsWith(':')) {
      topNetworks.add(trimmed.slice(0, -1));
    }

    if (!inServices) continue;

    // Service declaration (indent === 2)
    if (indent === 2 && trimmed.endsWith(':')) {
      currentService = trimmed.slice(0, -1);
      services[currentService] = {
        name: currentService,
        filePath,
        ports: [],
        networks: [],
        hasHealthcheck: false,
        containerName: null,
        _inPorts: false,
        _inNets: false
      };
      continue;
    }

    if (!currentService) continue;
    const svc = services[currentService];

    // Container name
    if (trimmed.startsWith('container_name:')) {
      svc.containerName = trimmed.replace('container_name:', '').trim();
    }

    // Healthcheck
    if (trimmed.startsWith('healthcheck:')) {
      svc.hasHealthcheck = true;
    }

    // Ports list
    if (trimmed.startsWith('ports:')) {
      svc._inPorts = true;
      svc._inNets = false;
      continue;
    }

    // Networks list
    if (trimmed.startsWith('networks:')) {
      svc._inNets = true;
      svc._inPorts = false;
      continue;
    }

    // Capture port list items
    if (svc._inPorts) {
      if (trimmed.startsWith('-')) {
        const portMatch = trimmed.match(/-\s*["\x27]?([0-9]+):([0-9]+)["\x27]?/);
        if (portMatch) {
          svc.ports.push({
            host: parseInt(portMatch[1], 10),
            container: parseInt(portMatch[2], 10),
            raw: trimmed
          });
        }
      } else if (indent <= 4) {
        svc._inPorts = false;
      }
    }

    // Capture network list items
    if (svc._inNets) {
      if (trimmed.startsWith('-')) {
        const netName = trimmed.replace(/^-\s*/, '').trim().replace(/["\x27]/g, '');
        svc.networks.push(netName);
      } else if (indent <= 4) {
        svc._inNets = false;
      }
    }
  }

  return { services, topNetworks };
}

// 3. Main Topology Validator Engine
export function validateTopology(customFiles = null) {
  const rawFiles = customFiles || [
    resolve(ROOT_DIR, 'docker/compose/shared.yml'),
    resolve(ROOT_DIR, 'docker/compose/gateway.yml'),
    ...findComposeFiles(resolve(ROOT_DIR, 'docker/compose/services')),
    resolve(ROOT_DIR, 'docker-compose.test.yml')
  ];
  const composeFiles = rawFiles.filter(f => existsSync(f) && !f.includes('service.template.yml') && !f.includes('network.yml'));

  const errors = [];
  const warnings = [];
  const devPortRegistry = new Map(); // hostPort -> { service, file }
  const testPortRegistry = new Map(); // hostPort -> { service, file }
  const allServices = [];

  console.log(`Discovered ${composeFiles.length} Compose configurations to audit:`);
  for (const f of composeFiles) {
    const rel = f.replace(ROOT_DIR + '/', '');
    console.log(`  - ${rel}`);
  }
  console.log('');

  // 3.1 Audit modular dev stacks (shared, gateway, services)
  const devComposeFiles = composeFiles.filter(f => !f.endsWith('docker-compose.test.yml') && !f.endsWith('docker-compose.yml'));

  for (const filePath of devComposeFiles) {
    const rel = filePath.replace(ROOT_DIR + '/', '');
    let parsed;
    try {
      parsed = parseComposeFile(filePath);
    } catch (err) {
      errors.push(`[PARSE_ERROR] Failed to parse ${rel}: ${err.message}`);
      continue;
    }

    for (const [svcName, svcData] of Object.entries(parsed.services)) {
      allServices.push(svcData);

      // Check 1: Port uniqueness across modular development platform
      for (const p of svcData.ports) {
        if (devPortRegistry.has(p.host)) {
          const prev = devPortRegistry.get(p.host);
          errors.push(
            `[PORT_COLLISION] Host port ${p.host} is already leased by service '${prev.service}' (${prev.file}), but service '${svcName}' (${rel}) also attempts to bind it.`
          );
        } else {
          devPortRegistry.set(p.host, { service: svcName, file: rel, containerPort: p.container });
        }
      }

      // Check 2: External network linkage (sodality-shared-net)
      const isGatewayOrMicroservice = rel.startsWith('docker/compose/services/') || rel.includes('gateway.yml');
      if (isGatewayOrMicroservice) {
        if (!svcData.networks.includes('sodality-shared-net')) {
          errors.push(
            `[NETWORK_LINKAGE_MISSING] Microservice '${svcName}' in ${rel} is not attached to external network 'sodality-shared-net'.`
          );
        }
      }

      // Check 3: Healthcheck presence
      if (!svcData.hasHealthcheck) {
        warnings.push(`[HEALTHCHECK_MISSING] Service '${svcName}' in ${rel} does not declare a healthcheck block.`);
      }
    }
  }

  // 3.2 Audit test compose stack internal port uniqueness
  const testFile = composeFiles.find(f => f.includes('docker-compose.test.yml'));
  if (testFile) {
    const relTest = testFile.replace(ROOT_DIR + '/', '');
    try {
      const parsedTest = parseComposeFile(testFile);
      for (const [svcName, svcData] of Object.entries(parsedTest.services)) {
        allServices.push(svcData);
        for (const p of svcData.ports) {
          if (testPortRegistry.has(p.host)) {
            const prevTest = testPortRegistry.get(p.host);
            errors.push(
              `[TEST_PORT_COLLISION] Test container '${svcName}' (${relTest}) binds host port ${p.host} which collides with test container '${prevTest.service}' (${prevTest.file}).`
            );
          } else {
            testPortRegistry.set(p.host, { service: svcName, file: relTest, containerPort: p.container });
          }
        }
      }
    } catch (err) {
      errors.push(`[PARSE_ERROR] Failed to parse ${relTest}: ${err.message}`);
    }
  }

  const durationMs = Date.now() - startTime;

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    durationMs,
    totalServices: allServices.length,
    totalPorts: devPortRegistry.size + testPortRegistry.size,
    devPorts: devPortRegistry.size,
    testPorts: testPortRegistry.size,
    composeFileCount: composeFiles.length
  };
}

// 4. CLI Execution
if (process.argv[1] && process.argv[1].endsWith('compose-topology-validator.mjs')) {
  const result = validateTopology();

  console.log('--------------------------------------------------------------------------------');
  console.log(`Audited: ${result.composeFileCount} Compose files | ${result.totalServices} Services | ${result.devPorts} Dev Ports | ${result.testPorts} Test Ports`);
  console.log(`Execution Latency: ${result.durationMs}ms (SLA: <= 3000ms)`);
  console.log('--------------------------------------------------------------------------------\n');

  if (result.warnings.length > 0) {
    console.log(`⚠️ Warnings (${result.warnings.length}):`);
    for (const w of result.warnings) {
      console.log(`  - ${w}`);
    }
    console.log('');
  }

  if (!result.valid) {
    console.error(`❌ TOPOLOGY VALIDATION FAILED (${result.errors.length} errors found):`);
    for (const err of result.errors) {
      console.error(`  ${err}`);
    }
    console.error('\nRunbook Reference: docs/06-workflows/per-service-development-runbook.md');
    process.exit(1);
  }

  if (result.durationMs > 3000) {
    console.error(`❌ [LATENCY_SLA_BREACH] Validation took ${result.durationMs}ms (> 3000ms SLA)`);
    process.exit(1);
  }

  console.log('✅ ALL COMPOSE TOPOLOGY & SERVICE ISOLATION CHECKS PASSED (Zero Port Collisions, 100% Network Linkage)');
  process.exit(0);
}
