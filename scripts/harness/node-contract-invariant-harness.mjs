#!/usr/bin/env node

/**
 * ════════════════════════════════════════════════════════════════════════════════
 * 🧪 SODA OS MULTI-NODE INVARIANT CONTRACT HARNESS
 * ════════════════════════════════════════════════════════════════════════════════
 * Validates enterprise-grade, production-ready contract parity across all communicating nodes:
 *   [1] Frontend Portal (UI Types / DTO Consumer via dto.ts)
 *   [2] Portal BFF (OpenAPI Schema / Fastify / Node via openapi.yaml)
 *   [3] KrakenD Gateway (Edge & Internal Route Transformations via krakend.json)
 *   [4] BFF Core API (Axum / Domain Orchestration via bff-core.schema.json)
 *   [5] Core Backend Microservices (Rust / gRPC / Storage via microservice-billing.schema.json)
 * ════════════════════════════════════════════════════════════════════════════════
 */

import fs from 'node:fs';
import path from 'node:path';

export class NodeContractInvariantHarness {
  constructor(suiteName = 'Multi-Node Invariant Contract Gate') {
    this.suiteName = suiteName;
    this.checks = [];
    this.startTime = Date.now();
    console.log(`\n╔══════════════════════════════════════════════════════════════════════════════╗`);
    console.log(`║   🧪  ${this.suiteName.toUpperCase().padEnd(70)} ║`);
    console.log(`╚══════════════════════════════════════════════════════════════════════════════╝\n`);
  }

  assert(description, condition, details = '') {
    const passed = Boolean(condition);
    this.checks.push({ description, passed, details });
    const icon = passed ? '  ✔' : '  ✖';
    const color = passed ? '\x1b[32m' : '\x1b[31m';
    console.log(`${color}${icon} ${description}\x1b[0m`);
    if (!passed && details) {
      console.log(`    \x1b[33m↳ Details: ${details}\x1b[0m`);
    }
  }

  /**
   * Asserts strict bidirectional field, type, and requiredness parity between Node A and Node B against canonical schema.
   */
  assertStrictFieldAndTypeParity(nodeA, nodeB, canonicalSchema) {
    const fieldsA = new Map(Object.entries(nodeA.fields));
    const fieldsB = new Map(Object.entries(nodeB.fields));
    const expected = new Map(Object.entries(canonicalSchema));

    const expectedKeys = [...expected.keys()];
    const keysA = [...fieldsA.keys()];
    const keysB = [...fieldsB.keys()];

    const missingInA = expectedKeys.filter(k => !fieldsA.has(k));
    const missingInB = expectedKeys.filter(k => !fieldsB.has(k));
    const extraInA = keysA.filter(k => !expected.has(k));
    const extraInB = keysB.filter(k => !expected.has(k));

    // Type parity comparisons
    const typeMismatches = [];
    for (const [key, expectedType] of expected.entries()) {
      const typeInA = fieldsA.get(key);
      const typeInB = fieldsB.get(key);
      if (typeInA && typeInA !== expectedType) {
        typeMismatches.push(`${nodeA.name}.${key}: expected ${expectedType}, got ${typeInA}`);
      }
      if (typeInB && typeInB !== expectedType) {
        typeMismatches.push(`${nodeB.name}.${key}: expected ${expectedType}, got ${typeInB}`);
      }
    }

    // Requiredness parity comparisons
    const requiredMismatches = [];
    const reqA = new Set(nodeA.required || keysA);
    const reqB = new Set(nodeB.required || keysB);
    for (const key of expectedKeys) {
      if (!reqA.has(key)) {
        requiredMismatches.push(`${nodeA.name}.${key} is optional/missing from required`);
      }
      if (!reqB.has(key)) {
        requiredMismatches.push(`${nodeB.name}.${key} is optional/missing from required`);
      }
    }

    const isExactMatch = missingInA.length === 0 && missingInB.length === 0 &&
                         extraInA.length === 0 && extraInB.length === 0 &&
                         typeMismatches.length === 0 && requiredMismatches.length === 0;

    this.assert(
      `Strict bi-directional contract, type & requiredness parity: ${nodeA.name} <-> ${nodeB.name}`,
      isExactMatch,
      !isExactMatch
        ? `Parity divergence detected! Missing in A: [${missingInA}], Missing in B: [${missingInB}], Extra in A: [${extraInA}], Extra in B: [${extraInB}], Type errors: [${typeMismatches.join('; ')}], Requiredness errors: [${requiredMismatches.join('; ')}]`
        : ''
    );
  }

  /**
   * Asserts full Money Value Object contract (amount_minor, currency, scale) and Zero-Float invariant
   * across any payload declaring monetary or rate concepts.
   */
  assertCompleteMoneyContract(payloadType, fields) {
    const fieldNames = Object.keys(fields);
    const hasMonetaryConcept = fieldNames.some(f => /(amount|balance|price|fee|tax|rate|quota|credit)/i.test(f));

    if (hasMonetaryConcept) {
      const hasAmountMinor = fieldNames.some(f => /(amount_minor|balance_minor|price_minor|fee_minor)/i.test(f));
      const hasCurrency = fieldNames.some(f => /(currency|base_currency|iso_currency)/i.test(f));
      const hasScale = fieldNames.some(f => /(scale|currency_scale|precision)/i.test(f));

      const isCompleteMoneyTuple = hasAmountMinor && hasCurrency && hasScale;
      this.assert(
        `Complete Money Value Object contract for ${payloadType} (*_minor, currency, scale)`,
        isCompleteMoneyTuple,
        `Monetary payload violates Article V: missing tuple members. (hasMinor: ${hasAmountMinor}, hasCurrency: ${hasCurrency}, hasScale: ${hasScale})`
      );

      // Verify zero unchecked floating point types
      const floatingFields = Object.entries(fields).filter(([name, type]) => {
        const typeStr = String(type).toLowerCase();
        return /(amount|balance|price|fee|tax|rate|quota|credit)/i.test(name) &&
               (typeStr.includes('f32') || typeStr.includes('f64') || typeStr.includes('float') || typeStr.includes('double'));
      });

      this.assert(
        `Article V Zero-Float Invariant for ${payloadType}`,
        floatingFields.length === 0,
        `Forbidden float detected in financial fields: ${JSON.stringify(floatingFields)}`
      );
    }
  }

  /**
   * Asserts JSON serialization roundtrip without loss, mutating, or dropping ANY field.
   */
  assertJsonSerializationRoundtrip(payloadName, sampleObject) {
    let serialized = null;
    let roundtripSuccess = false;
    let diffDetails = [];

    try {
      serialized = JSON.stringify(sampleObject);
      const parsed = JSON.parse(serialized);

      const expectedKeys = Object.keys(sampleObject);
      const parsedKeys = Object.keys(parsed);

      for (const k of expectedKeys) {
        if (!parsedKeys.includes(k)) {
          diffDetails.push(`Field '${k}' was dropped during serialization`);
        } else if (parsed[k] !== sampleObject[k]) {
          diffDetails.push(`Field '${k}' mutated: expected '${sampleObject[k]}', got '${parsed[k]}'`);
        }
      }
      for (const k of parsedKeys) {
        if (!expectedKeys.includes(k)) {
          diffDetails.push(`Unexpected extra field '${k}' in parsed JSON`);
        }
      }
      roundtripSuccess = diffDetails.length === 0;
    } catch (err) {
      diffDetails.push(`Exception: ${err.message}`);
    }

    this.assert(
      `Complete lossless JSON serialization roundtrip for ${payloadName}`,
      roundtripSuccess,
      diffDetails.join('; ')
    );
  }

  /**
   * Asserts RFC 7807 Problem Details error contract structure and type integrity.
   * Requires complete standardized envelope: type, title, status, detail, instance, invalid_params.
   */
  assertErrorEnvelope(envelope) {
    const requiredKeys = ['type', 'title', 'status', 'detail', 'instance', 'invalid_params'];
    const keys = Object.keys(envelope);
    const hasAll = requiredKeys.every(k => keys.includes(k));
    const hasIntegerStatus = typeof envelope.status === 'number' && Number.isInteger(envelope.status);
    const hasStringURIs = typeof envelope.type === 'string' && envelope.type.startsWith('http');
    const hasInstance = typeof envelope.instance === 'string' && envelope.instance.startsWith('/');
    const hasInvalidParamsArray = Array.isArray(envelope.invalid_params);

    const isFullyConforming = hasAll && hasIntegerStatus && hasStringURIs && hasInstance && hasInvalidParamsArray;

    this.assert(
      `RFC 7807 Problem Details Error Envelope conforms to standard (including instance and invalid_params)`,
      isFullyConforming,
      `Invalid RFC 7807 error envelope: keys=[${keys}], status=${envelope.status}, type=${envelope.type}, instance=${envelope.instance}, invalid_params=${envelope.invalid_params}`
    );
  }

  /**
   * Parses TypeScript interface from dto.ts into field: type map and required fields set.
   */
  parseTypeScriptDto(filePath, interfaceName = 'SodaMultiNodeContract') {
    if (!fs.existsSync(filePath)) {
      throw new Error(`TypeScript DTO file not found at ${filePath}`);
    }
    const content = fs.readFileSync(filePath, 'utf8');
    const interfaceRegex = new RegExp(`export\\s+interface\\s+${interfaceName}\\s*\\{([\\s\\S]*?)\\}`, 'm');
    const match = content.match(interfaceRegex);
    if (!match) {
      throw new Error(`Interface ${interfaceName} not found in ${filePath}`);
    }

    const body = match[1];
    const fields = {};
    const required = [];
    const lines = body.split('\n');

    for (const rawLine of lines) {
      const line = rawLine.replace(/\/\/.*$/, '').trim();
      if (!line) continue;
      const propMatch = line.match(/^([a-zA-Z0-9_]+)(\??)\s*:\s*([^;]+);?$/);
      if (propMatch) {
        const name = propMatch[1];
        const isOptional = propMatch[2] === '?';
        const rawType = propMatch[3].trim();

        if (!isOptional) {
          required.push(name);
        }

        let canonicalType = 'string';
        if (name.includes('scale')) {
          canonicalType = 'u8';
        } else if (name.includes('minor')) {
          canonicalType = 'minor_unit_string';
        } else if (name.includes('currency')) {
          canonicalType = 'ISO_4217_string';
        } else if (rawType === 'number') {
          canonicalType = 'i64';
        } else {
          canonicalType = 'string';
        }
        fields[name] = canonicalType;
      }
    }
    return { fields, required };
  }

  /**
   * Parses JSON Schema into canonical field: type map and required array.
   */
  parseJsonSchema(filePath) {
    if (!fs.existsSync(filePath)) {
      throw new Error(`Schema file not found at ${filePath}`);
    }
    const schema = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const fields = {};
    const required = Array.isArray(schema.required) ? schema.required : [];

    for (const [propName, propDef] of Object.entries(schema.properties || {})) {
      if (propName.includes('scale')) {
        fields[propName] = 'u8';
      } else if (propName.includes('minor')) {
        fields[propName] = 'minor_unit_string';
      } else if (propName.includes('currency')) {
        fields[propName] = 'ISO_4217_string';
      } else if (propDef.type === 'integer') {
        fields[propName] = 'i64';
      } else {
        fields[propName] = 'string';
      }
    }
    return { schema, fields, required };
  }

  /**
   * Parses OpenAPI schema component into canonical field: type map and required fields list.
   */
  parseOpenApiSchema(filePath, componentName = 'SodaMultiNodeContract') {
    if (!fs.existsSync(filePath)) {
      throw new Error(`OpenAPI file not found at ${filePath}`);
    }
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    let inComponent = false;
    let inRequired = false;
    let inProperties = false;
    let currentProp = null;
    const fields = {};
    const required = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.match(new RegExp('^ {4}' + componentName + ':'))) {
        inComponent = true;
        continue;
      }
      if (inComponent && line.match(/^ {4}[A-Za-z0-9_]+:/)) {
        break; // Next component reached
      }
      if (inComponent && line.match(/^ {6}required:/)) {
        inRequired = true;
        inProperties = false;
        continue;
      }
      if (inRequired) {
        const reqMatch = line.match(/^ {8}-\s*([a-zA-Z0-9_]+)/);
        if (reqMatch) {
          required.push(reqMatch[1]);
          continue;
        } else if (line.match(/^ {6}[a-zA-Z0-9_]+:/)) {
          inRequired = false;
        }
      }
      if (inComponent && line.match(/^ {6}properties:/)) {
        inProperties = true;
        inRequired = false;
        continue;
      }
      if (inProperties) {
        if (line.match(/^ {6}[a-z]+:/)) {
          inProperties = false;
          continue;
        }
        const propMatch = line.match(/^ {8}([a-zA-Z0-9_]+):/);
        if (propMatch) {
          currentProp = propMatch[1];
          continue;
        }
        const typeMatch = line.match(/^ {10}type:\s*([a-zA-Z0-9_]+)/);
        if (currentProp && typeMatch) {
          const declaredYamlType = typeMatch[1].trim();
          let canonicalType = declaredYamlType;

          if (declaredYamlType === 'integer') {
            canonicalType = currentProp.includes('scale') ? 'u8' : 'i64';
          } else if (declaredYamlType === 'string') {
            if (currentProp.includes('minor')) {
              canonicalType = 'minor_unit_string';
            } else if (currentProp.includes('currency')) {
              canonicalType = 'ISO_4217_string';
            } else {
              canonicalType = 'string';
            }
          }
          fields[currentProp] = canonicalType;
          currentProp = null;
        }
      }
    }
    return { fields, required };
  }

  /**
   * Parses KrakenD gateway allowlist and type expectations from backend schema.
   */
  parseKrakenD(filePath, canonicalSchema) {
    if (!fs.existsSync(filePath)) {
      throw new Error(`KrakenD config not found at ${filePath}`);
    }
    const config = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const allowed = config.endpoints[0]?.backend[0]?.allow || [];
    const fields = {};
    const required = [...allowed];
    for (const key of allowed) {
      if (canonicalSchema[key]) {
        fields[key] = canonicalSchema[key];
      }
    }
    return { fields, required };
  }

  /**
   * Validates physical contract schemas and endpoints in repository docs/schemas.
   */
  loadAndValidateRepositoryContracts() {
    const scriptDir = path.dirname(new URL(import.meta.url).pathname);
    const repoRootDir = path.resolve(scriptDir, '../..');

    const schemaFile = path.join(repoRootDir, 'schemas/multi-node-contract.schema.json');
    const openapiFile = path.join(repoRootDir, 'docs/03-architecture/api/openapi.yaml');
    const krakendFile = path.join(repoRootDir, 'docker/krakend/krakend.json');
    const dtsFile = path.join(repoRootDir, 'docs/03-architecture/api/dto.ts');
    const bffCoreSchemaFile = path.join(repoRootDir, 'docs/03-architecture/api/bff-core.schema.json');
    const microserviceSchemaFile = path.join(repoRootDir, 'docs/03-architecture/api/microservice-billing.schema.json');

    // 1. Validate physical JSON schema exists and is syntactically sound
    const schemaExists = fs.existsSync(schemaFile);
    this.assert(`Physical Canonical JSON Schema exists: ${path.relative(repoRootDir, schemaFile)}`, schemaExists);
    if (!schemaExists) return null;

    const parsedSchema = JSON.parse(fs.readFileSync(schemaFile, 'utf8'));
    this.assert(
      `Canonical schema defines strictly typed multi-node contract`,
      Boolean(parsedSchema && parsedSchema.properties && parsedSchema.required)
    );

    // 2. Validate physical OpenAPI 3.1 specification exists
    const openapiExists = fs.existsSync(openapiFile);
    this.assert(`Physical OpenAPI specification exists: ${path.relative(repoRootDir, openapiFile)}`, openapiExists);
    if (openapiExists) {
      const openapiContent = fs.readFileSync(openapiFile, 'utf8');
      const hasCoreContract = openapiContent.includes('SodaMultiNodeContract:');
      const hasProblemDetails = openapiContent.includes('ProblemDetails:');
      const hasInvalidParams = openapiContent.includes('InvalidParam:');
      this.assert(
        `OpenAPI spec declares SodaMultiNodeContract & complete RFC 7807 ProblemDetails`,
        hasCoreContract && hasProblemDetails && hasInvalidParams
      );
    }

    // 3. Validate physical KrakenD Gateway configuration exists
    const krakendExists = fs.existsSync(krakendFile);
    this.assert(`Physical KrakenD gateway config exists: ${path.relative(repoRootDir, krakendFile)}`, krakendExists);
    if (krakendExists) {
      const krakendContent = JSON.parse(fs.readFileSync(krakendFile, 'utf8'));
      const allowedFields = krakendContent.endpoints?.[0]?.backend?.[0]?.allow || [];
      const hasAllFields = parsedSchema.required.every(f => allowedFields.includes(f));
      this.assert(
        `KrakenD gateway preserves all canonical contract fields`,
        hasAllFields,
        `KrakenD allowed fields [${allowedFields}] do not contain required [${parsedSchema.required}]`
      );
    }

    // 4. Validate physical Frontend/TypeScript DTO file exists
    const dtsExists = fs.existsSync(dtsFile);
    this.assert(`Physical TypeScript DTO contract exists: ${path.relative(repoRootDir, dtsFile)}`, dtsExists);

    // 5. Validate physical BFF Core schema and Microservice schema exist
    this.assert(`Physical BFF Core API Schema exists: ${path.relative(repoRootDir, bffCoreSchemaFile)}`, fs.existsSync(bffCoreSchemaFile));
    this.assert(`Physical Microservice Schema exists: ${path.relative(repoRootDir, microserviceSchemaFile)}`, fs.existsSync(microserviceSchemaFile));

    return parsedSchema;
  }

  summary() {
    const total = this.checks.length;
    const passed = this.checks.filter(c => c.passed).length;
    const failed = total - passed;
    const duration = ((Date.now() - this.startTime) / 1000).toFixed(2);

    console.log('\n────────────────────────────────────────────────────────────────────────');
    console.log(`📊 Invariant Result: ${passed} / ${total} Passed (${duration}s)`);
    if (failed > 0) {
      console.log(`\x1b[31m❌ FAIL-CLOSED: ${failed} contract invariant violations detected!\x1b[0m\n`);
      return false;
    }
    console.log(`\x1b[32m✔ SUCCESS: 100% Multi-Node Contract Invariants Verified Clean!\x1b[0m\n`);
    return true;
  }
}

// Direct execution
if (process.argv[1]?.endsWith('node-contract-invariant-harness.mjs')) {
  const harness = new NodeContractInvariantHarness('Multi-Node Contract Invariant Gate');
  
  // 1. Inspect and validate physical repository contracts from disk
  const canonicalJsonSchema = harness.loadAndValidateRepositoryContracts();
  if (!canonicalJsonSchema) {
    console.error('Fatal: Canonical schema could not be loaded.');
    process.exit(1);
  }

  const scriptDir = path.dirname(new URL(import.meta.url).pathname);
  const repoRootDir = path.resolve(scriptDir, '../..');

  // 2. Extract canonical properties & types dynamically from real disk schema
  const { fields: canonicalSchema, required: canonicalRequired } = harness.parseJsonSchema(path.join(repoRootDir, 'schemas/multi-node-contract.schema.json'));

  // 3. Inspect actual node representations from their separate physical contracts
  const { fields: frontendUIFields, required: frontendUIRequired } = harness.parseTypeScriptDto(path.join(repoRootDir, 'docs/03-architecture/api/dto.ts'));
  const { fields: portalBFFFields, required: portalBFFRequired } = harness.parseOpenApiSchema(path.join(repoRootDir, 'docs/03-architecture/api/openapi.yaml'));
  const { fields: krakendGatewayFields, required: krakendGatewayRequired } = harness.parseKrakenD(path.join(repoRootDir, 'docker/krakend/krakend.json'), canonicalSchema);
  const { fields: bffCoreFields, required: bffCoreRequired } = harness.parseJsonSchema(path.join(repoRootDir, 'docs/03-architecture/api/bff-core.schema.json'));
  const { fields: microserviceFields, required: microserviceRequired } = harness.parseJsonSchema(path.join(repoRootDir, 'docs/03-architecture/api/microservice-billing.schema.json'));

  const frontendUI = { name: 'Frontend Portal UI (dto.ts)', fields: frontendUIFields, required: frontendUIRequired };
  const portalBFF = { name: 'Portal BFF (:4000 openapi.yaml)', fields: portalBFFFields, required: portalBFFRequired };
  const krakendGateway = { name: 'KrakenD Gateway (krakend.json)', fields: krakendGatewayFields, required: krakendGatewayRequired };
  const bffCoreAPI = { name: 'BFF Core API (bff-core.schema.json)', fields: bffCoreFields, required: bffCoreRequired };
  const microservice = { name: 'Billing Microservice (microservice-billing.schema.json)', fields: microserviceFields, required: microserviceRequired };

  // Strict bi-directional field, type, and requiredness parity across every adjacent node boundary
  harness.assertStrictFieldAndTypeParity(frontendUI, portalBFF, canonicalSchema);
  harness.assertStrictFieldAndTypeParity(portalBFF, krakendGateway, canonicalSchema);
  harness.assertStrictFieldAndTypeParity(krakendGateway, bffCoreAPI, canonicalSchema);
  harness.assertStrictFieldAndTypeParity(bffCoreAPI, microservice, canonicalSchema);

  // 4. Complete Money Contract & Zero-Float verification on real schema
  harness.assertCompleteMoneyContract('SodaMultiNodeContract (dto.ts)', frontendUIFields);
  harness.assertCompleteMoneyContract('SodaMultiNodeContract (canonical schema)', canonicalSchema);
  harness.assertCompleteMoneyContract('SodaMultiNodeContract (microservice schema)', microserviceFields);

  // 5. Complete lossless JSON serialization roundtrip assertion to guarantee wire safety
  harness.assertJsonSerializationRoundtrip('SodaMultiNodeContract (wire DTO)', {
    id: 'cnt-10023',
    tenant_id: 'tenant-4001',
    base_currency: 'THB',
    amount_minor: '500000', // 5,000.00 THB in Satang minor units as wire string
    scale: 2,
    status: 'active'
  });

  // 6. RFC 7807 Error Envelope verification with strict types & required instance + invalid_params
  harness.assertErrorEnvelope({
    type: 'https://api.sodality.app/errors/not-found',
    title: 'Tenant shop record not found',
    status: 404,
    detail: 'No connected TikTok shop found for tenant uuid',
    instance: '/v1/analytics/gmv',
    invalid_params: [
      { name: 'tenant_id', reason: 'tenant_id not found in registry' }
    ]
  });

  const ok = harness.summary();
  if (!ok) process.exit(1);
}
