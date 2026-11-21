/**
 * Unit Test Suite for Stage 1 UI Taxonomy & Standard Labeling Specification.
 * Verifies 32 canonical classes, 6 categories, 7 states, ARIA roles, touch targets,
 * and element validation functions.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CANONICAL_ELEMENTS,
  CATEGORIES,
  INTERACTION_STATES,
  WCAG_TOUCH_TARGETS,
  validateElementLabel,
  getTaxonomyDefinition,
  listTaxonomyClasses,
  listTaxonomyCategories,
  getClassesByCategory,
  isInteractive,
  getTaxonomySpecificationJson
} from '../../scripts/lib/ui-taxonomy.mjs';

test('Taxonomy: Exactly 32 canonical classes and 6 categories', () => {
  const classes = listTaxonomyClasses();
  assert.equal(classes.length, 32);

  const categories = listTaxonomyCategories();
  assert.equal(categories.length, 6);

  const totalClassesFromCategories = categories.reduce(
    (acc, cat) => acc + CATEGORIES[cat].classes.length,
    0
  );
  assert.equal(totalClassesFromCategories, 32);

  assert.equal(getClassesByCategory('container').length, 8);
  assert.equal(getClassesByCategory('control').length, 7);
  assert.equal(getClassesByCategory('input').length, 6);
  assert.equal(getClassesByCategory('display').length, 5);
  assert.equal(getClassesByCategory('data_feedback').length, 3);
  assert.equal(getClassesByCategory('navigation').length, 3);
});

test('Taxonomy: 7 Allowed interaction states', () => {
  assert.equal(INTERACTION_STATES.length, 7);
  assert.deepEqual(INTERACTION_STATES, [
    'default',
    'hover',
    'focus',
    'active',
    'disabled',
    'error',
    'loading'
  ]);
});

test('Taxonomy: Element validation with valid and invalid inputs', () => {
  // Valid button
  const validBtn = {
    component_type: 'PrimaryButton',
    category: 'control',
    interaction_state: 'hover',
    bbox: [100, 200, 120, 48],
    aria: { role: 'button' }
  };
  const res1 = validateElementLabel(validBtn);
  assert.equal(res1.valid, true);
  assert.equal(res1.errors.length, 0);

  // Unknown class
  const invalidClass = {
    component_type: 'FlyingSaucer',
    category: 'control'
  };
  const res2 = validateElementLabel(invalidClass);
  assert.equal(res2.valid, false);
  assert.ok(res2.errors[0].includes('Unknown component class'));

  // Category mismatch
  const mismatchedCat = {
    component_type: 'PrimaryButton',
    category: 'display'
  };
  const res3 = validateElementLabel(mismatchedCat);
  assert.equal(res3.valid, false);
  assert.ok(res3.errors[0].includes('Category mismatch'));

  // Invalid state
  const invalidState = {
    component_type: 'HeadingTypography',
    interaction_state: 'active' // Headings only support 'default'
  };
  const res4 = validateElementLabel(invalidState);
  assert.equal(res4.valid, false);
  assert.ok(res4.errors[0].includes('not supported'));

  // Invalid ARIA role
  const invalidAria = {
    component_type: 'PrimaryButton',
    aria: { role: 'heading' }
  };
  const res5 = validateElementLabel(invalidAria);
  assert.equal(res5.valid, false);
  assert.ok(res5.errors[0].includes('ARIA role'));
});

test('Taxonomy: WCAG Touch Target Bounds Enforcement', () => {
  // Small button failing 44x44 AAA
  const smallBtn = {
    component_type: 'IconButton',
    category: 'control',
    bbox: [10, 10, 20, 20]
  };
  const res = validateElementLabel(smallBtn);
  assert.equal(res.valid, false);
  assert.ok(res.errors[0].includes('Touch target size'));

  // Compliant button
  const compliantBtn = {
    component_type: 'IconButton',
    category: 'control',
    bbox: [10, 10, 48, 48]
  };
  const resCompliant = validateElementLabel(compliantBtn);
  assert.equal(resCompliant.valid, true);
});

test('Taxonomy: Helper methods and specification JSON export', () => {
  assert.equal(isInteractive('PrimaryButton'), true);
  assert.equal(isInteractive('HeadingTypography'), false);

  const def = getTaxonomyDefinition('ModalDialog');
  assert.ok(def);
  assert.equal(def.category, 'container');
  assert.equal(def.is_interactive, true);

  const spec = getTaxonomySpecificationJson();
  assert.equal(spec.schema_version, 1);
  assert.equal(Object.keys(spec.elements).length, 32);
  assert.equal(Object.keys(spec.categories).length, 6);
  assert.ok(spec.aria_roles.length >= 10);
});
