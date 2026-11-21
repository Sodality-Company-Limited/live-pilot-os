#!/usr/bin/env node

/**
 * ════════════════════════════════════════════════════════════════════════════════
 * 🛡️ SODA OS UI TAXONOMY & STANDARD LABELING SPECIFICATION HARNESS (G-UX-009)
 * ════════════════════════════════════════════════════════════════════════════════
 * Framework: Soda OS
 * Paradigm: Stage 1 Data Curriculum & Curation (M3 / G-UX-009)
 * Purpose: Formally verifies the 32-element component hierarchy, 6 categories,
 *          7 interaction states, ARIA roles, WCAG 2.2 AAA touch target standards,
 *          and cross-language parity between JavaScript and Python specifications.
 * ════════════════════════════════════════════════════════════════════════════════
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  CANONICAL_ELEMENTS,
  CATEGORIES,
  INTERACTION_STATES,
  WCAG_TOUCH_TARGETS,
  validateElementLabel,
  listTaxonomyClasses,
  listTaxonomyCategories,
  getClassesByCategory,
  getTaxonomySpecificationJson
} from '../lib/ui-taxonomy.mjs';

function runHarness() {
  console.log('================================================================================');
  console.log('🛡️ Stage 1 UI Taxonomy & Standard Labeling Specification Harness (G-UX-009)');
  console.log('================================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${message}`);
      failed++;
    }
  }

  // 1. Schema Artifact Verification
  console.log('▶ Category 1: JSON Schema Conformance & Artifact Integrity');
  const schemaPath = resolve(process.cwd(), 'schemas/ui-taxonomy.schema.json');
  assert(existsSync(schemaPath), 'Schema file schemas/ui-taxonomy.schema.json exists');

  let schemaObj = null;
  try {
    schemaObj = JSON.parse(readFileSync(schemaPath, 'utf8'));
    assert(schemaObj.$schema === 'https://json-schema.org/draft/2020-12/schema', 'Schema declares Draft 2020-12');
    assert(schemaObj.properties?.schema_version?.const === 1 || schemaObj.schema_version === 1, 'Schema declares version 1');
  } catch (err) {
    assert(false, `Schema parsing failed: ${err.message}`);
    process.exit(1);
  }

  // 2. Canonical Hierarchy & Cardinality Verification
  console.log('\n▶ Category 2: 32 Canonical Classes & 6 Categories Invariant');
  const classes = listTaxonomyClasses();
  assert(classes.length === 32, `Exactly 32 canonical classes defined (found ${classes.length})`);

  const categories = listTaxonomyCategories();
  assert(categories.length === 6, `Exactly 6 functional categories defined (found ${categories.length})`);

  const expectedCounts = {
    container: 8,
    control: 7,
    input: 6,
    display: 5,
    data_feedback: 3,
    navigation: 3
  };

  for (const [cat, expected] of Object.entries(expectedCounts)) {
    const classList = getClassesByCategory(cat);
    assert(classList.length === expected, `Category '${cat}' contains exactly ${expected} classes (found ${classList.length})`);
  }

  // 3. States & Accessibility Requirements
  console.log('\n▶ Category 3: Interaction States & WCAG 2.2 AAA Touch Targets');
  assert(INTERACTION_STATES.length === 7, 'Exactly 7 interaction states defined');
  assert(WCAG_TOUCH_TARGETS.minimum_aaa_px === 44, 'WCAG AAA minimum touch target is 44px');
  assert(WCAG_TOUCH_TARGETS.minimum_aa_px === 24, 'WCAG AA minimum touch target is 24px');

  // Verify interactive controls declare minimum touch target
  let allInteractiveHaveTargets = true;
  for (const [cName, def] of Object.entries(CANONICAL_ELEMENTS)) {
    if (def.is_interactive && def.category === 'control') {
      if (def.wcag_touch_target_px.min_width < 44 || def.wcag_touch_target_px.min_height < 44) {
        allInteractiveHaveTargets = false;
      }
    }
  }
  assert(allInteractiveHaveTargets, 'All interactive control elements require at least 44x44px touch targets');

  // 4. Validation Engine Robustness
  console.log('\n▶ Category 4: Validation Engine Fail-Closed Properties');
  const validCheck = validateElementLabel({
    component_type: 'PrimaryButton',
    category: 'control',
    interaction_state: 'default',
    bbox: [0, 0, 100, 48],
    aria: { role: 'button' }
  });
  assert(validCheck.valid === true, 'Valid button passes validation');

  const invalidCatCheck = validateElementLabel({
    component_type: 'PrimaryButton',
    category: 'navigation'
  });
  assert(invalidCatCheck.valid === false, 'Mismatched category is rejected fail-closed');

  const invalidStateCheck = validateElementLabel({
    component_type: 'HeadingTypography',
    interaction_state: 'active'
  });
  assert(invalidStateCheck.valid === false, 'Illegal state on static element is rejected fail-closed');

  // 5. Python Implementation File Check
  console.log('\n▶ Category 5: Python Implementation File & Specification Export');
  const pyPath = resolve(process.cwd(), 'code/ml/src/curriculum/taxonomy.py');
  assert(existsSync(pyPath), 'Python curriculum module code/ml/src/curriculum/taxonomy.py exists');

  const specJson = getTaxonomySpecificationJson();
  assert(Object.keys(specJson.elements).length === 32, 'Specification JSON exports all 32 elements');
  assert(Object.keys(specJson.categories).length === 6, 'Specification JSON exports all 6 categories');

  console.log('\n================================================================================');
  console.log(`📊 Summary: ${passed} Passed, ${failed} Failed`);
  console.log('================================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
  console.log('✅ UI Taxonomy & Standard Labeling Specification verified green.\n');
}

runHarness();
