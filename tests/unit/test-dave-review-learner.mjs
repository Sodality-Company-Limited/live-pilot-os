import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  DaveReviewLearner,
  CORRECTION_TAXONOMY_CLASSES,
  renderReviewPacket,
  parseReviewPacket,
  classifyCorrection,
  ingestCorrection
} from '../../scripts/lib/dave-review-learner.mjs';

const TEST_SCRATCH_DIR = path.resolve(process.cwd(), 'scratch/test-dave-review-learner');

test.before(() => {
  if (!fs.existsSync(TEST_SCRATCH_DIR)) {
    fs.mkdirSync(TEST_SCRATCH_DIR, { recursive: true });
  }
});

test.after(() => {
  if (fs.existsSync(TEST_SCRATCH_DIR)) {
    fs.rmSync(TEST_SCRATCH_DIR, { recursive: true, force: true });
  }
});

test('G-DAVE-006: Scenario 1 - Render review packet with interactive checkboxes and zero opacity', async (t) => {
  const learner = new DaveReviewLearner();
  const decision = {
    decision_id: 'DAVE-UX-G-WEB-001',
    decision_type: 'ux_ui_design',
    goal_id: 'G-WEB-001',
    decision: {
      summary: 'Canonical UX layout with command rail and decision canvas',
      primary_action: 'Approve or defer an agent decision',
      layout: 'command_rail + decision_canvas'
    },
    confidence: 0.84,
    risk: 'medium',
    evidence: ['docs/03-architecture/design-tokens.md'],
    references: ['REF-0001'],
    assumptions: ['1440x900 desktop viewport'],
    alternatives_rejected: ['3-column layout rejected due to clipping'],
    verification: ['visual-regression']
  };

  const references = [
    {
      reference_id: 'REF-0001',
      type: 'image',
      uri: 'data/references/REF-0001.png',
      content_hash: 'sha256:d7146fad2c9c3a601f8160ae2c8072285d2e41c22a39a226ee78a24e5c59cbb8'
    }
  ];

  const packetMd = learner.renderReviewPacket(decision, references);

  assert.ok(packetMd.includes('DAVE REVIEW PACKET: DAVE-UX-G-WEB-001'), 'Must contain header with decision ID');
  assert.ok(packetMd.includes('Canonical UX layout with command rail'), 'Must contain decision summary');
  assert.ok(packetMd.includes('REF-0001') && packetMd.includes('d7146fad2c9c3a601f8160ae2c8072285d2e41c22a39a226ee78a24e5c59cbb8'), 'Must list references with exact SHA256');
  assert.ok(packetMd.includes('- [ ] approve'), 'Must contain approve interactive checkbox');
  assert.ok(packetMd.includes('- [ ] approve_with_edits'), 'Must contain approve_with_edits interactive checkbox');
  assert.ok(packetMd.includes('- [ ] reject'), 'Must contain reject interactive checkbox');

  for (const cls of CORRECTION_TAXONOMY_CLASSES) {
    assert.ok(packetMd.includes(cls), `Must present taxonomy class option: ${cls}`);
  }
});

test('G-DAVE-006: Scenario 2 - Parse completed review packet into structured feedback', async (t) => {
  const learner = new DaveReviewLearner();
  const samplePacket = `================================================================================
DAVE REVIEW PACKET: DAVE-UX-G-WEB-001 (Goal: G-WEB-001)
================================================================================
1. DECISION SUMMARY:
   Canonical UX layout

2. DOMAIN & ACTION:
   Domain: ux_ui_design
   Risk Level: MEDIUM | Calibrated Confidence: 0.8400

3. FIRST-CLASS REFERENCES:
   - [REF-0001] (image) data/references/REF-0001.png

4. HUMAN ACTION:
   - [ ] approve
   - [x] approve_with_edits
   - [ ] reject

5. CORRECTION CLASSIFICATION:
   - [ ] objective_failure
   - [ ] subjective_preference
   - [ ] missing_context
   - [ ] wrong_reference
   - [x] wrong_risk_class
   - [ ] wrong_confidence
   - [ ] wrong_routing
   - [ ] wrong_expert
   - [ ] unsafe_action

6. REVIEWER EDITS:
\`\`\`yaml
risk: high
\`\`\`

7. REVIEWER RATIONALE:
Elevated risk tier to high due to production mutation impact.

8. REVIEWED BY:
tech-lead
================================================================================`;

  const parsed = learner.parseReviewPacket(samplePacket);

  assert.equal(parsed.valid, true, 'Parsing must succeed');
  assert.equal(parsed.action, 'approve_with_edits');
  assert.equal(parsed.correction_class, 'wrong_risk_class');
  assert.ok(parsed.reviewer_edits.includes('risk: high'), 'Must extract reviewer edits');
  assert.ok(parsed.reviewer_rationale.includes('Elevated risk tier to high'), 'Must extract reviewer rationale');
  assert.equal(parsed.reviewed_by, 'tech-lead');
  assert.equal(parsed.decision_id, 'DAVE-UX-G-WEB-001');
  assert.equal(parsed.goal_id, 'G-WEB-001');
});

test('G-DAVE-006: Scenario 3 - 9-class taxonomy classification engine', async (t) => {
  const learner = new DaveReviewLearner();

  assert.equal(CORRECTION_TAXONOMY_CLASSES.length, 9, 'Must define exactly 9 canonical classes');

  const testCases = [
    { text: 'Syntax error in database migration script', expected: 'objective_failure' },
    { text: 'I prefer darker purple accents for aesthetics', expected: 'subjective_preference' },
    { text: 'Proposal missed project requirement for internationalization', expected: 'missing_context' },
    { text: 'Referenced outdated REF-0003 instead of approved wireframe', expected: 'wrong_reference' },
    { text: 'Marked as low risk but executes critical schema drop', expected: 'wrong_risk_class' },
    { text: 'Confidence was overconfident at 0.99 for untested module', expected: 'wrong_confidence' },
    { text: 'Should route to human_review instead of proceed', expected: 'wrong_routing' },
    { text: 'Dispatched security expert for UI font selection', expected: 'wrong_expert' },
    { text: 'Unsafe operation bypassing token permission sandbox', expected: 'unsafe_action' }
  ];

  for (const tc of testCases) {
    const matchedClass = learner.classifyCorrection(tc.text);
    assert.equal(matchedClass, tc.expected, `Rationale "${tc.text}" should classify as ${tc.expected}`);
  }
});

test('G-DAVE-006: Scenario 4 - Ingest human correction into JSONL training queue', async (t) => {
  const learner = new DaveReviewLearner();
  const testLedgerPath = path.join(TEST_SCRATCH_DIR, 'human_corrections.jsonl');

  const parsedRecord = {
    decision_id: 'DAVE-UX-G-WEB-001',
    goal_id: 'G-WEB-001',
    action: 'approve_with_edits',
    correction_class: 'wrong_risk_class',
    reviewer_edits: 'risk: high',
    reviewer_rationale: 'Elevated risk tier to high due to blast radius.',
    reviewed_by: 'tech-lead',
    decision: {
      decision_id: 'DAVE-UX-G-WEB-001',
      goal_id: 'G-WEB-001',
      risk: 'medium',
      confidence: 0.84
    }
  };

  const result = learner.ingestCorrection(parsedRecord, { ledgerPath: testLedgerPath });

  assert.equal(result.success, true);
  assert.ok(result.correction_id.startsWith('CORR-'), 'Must generate CORR- prefixed ID');
  assert.ok(result.input_context_hash.startsWith('sha256:'), 'Must generate context hash');
  assert.ok(fs.existsSync(testLedgerPath), 'JSONL ledger file must exist');

  const lines = fs.readFileSync(testLedgerPath, 'utf8').trim().split('\n');
  assert.equal(lines.length, 1);
  const logged = JSON.parse(lines[0]);
  assert.equal(logged.decision_id, 'DAVE-UX-G-WEB-001');
  assert.equal(logged.action, 'approve_with_edits');
  assert.equal(logged.correction_class, 'wrong_risk_class');
  assert.equal(logged.reviewed_by, 'tech-lead');
});

test('G-DAVE-006: Scenario 5 - Fail-closed on contradictory or corrupted review packets', async (t) => {
  const learner = new DaveReviewLearner();

  // Contradictory checkboxes (both approve and reject marked)
  const contradictoryPacket = `
DAVE REVIEW PACKET: DAVE-UX-G-WEB-001 (Goal: G-WEB-001)
4. HUMAN ACTION:
   - [x] approve
   - [x] reject
`;
  const contRes = learner.parseReviewPacket(contradictoryPacket);
  assert.equal(contRes.valid, false, 'Contradictory checkboxes must fail');
  assert.ok(contRes.errors.some(e => e.includes('Contradictory') || e.includes('Multiple')));

  // No checkbox marked
  const emptyBoxesPacket = `
DAVE REVIEW PACKET: DAVE-UX-G-WEB-001 (Goal: G-WEB-001)
4. HUMAN ACTION:
   - [ ] approve
   - [ ] reject
`;
  const emptyRes = learner.parseReviewPacket(emptyBoxesPacket);
  assert.equal(emptyRes.valid, false, 'Unmarked checkboxes must fail');
  assert.ok(emptyRes.errors.some(e => e.includes('No action') || e.includes('marked')));

  // Rejection without rationale
  const rejectWithoutRationale = `
DAVE REVIEW PACKET: DAVE-UX-G-WEB-001 (Goal: G-WEB-001)
4. HUMAN ACTION:
   - [x] reject
7. REVIEWER RATIONALE:
`;
  const noRatRes = learner.parseReviewPacket(rejectWithoutRationale);
  assert.equal(noRatRes.valid, false, 'Rejection without rationale must fail');
  assert.ok(noRatRes.errors.some(e => e.includes('rationale') || e.includes('Rationale')));
});
