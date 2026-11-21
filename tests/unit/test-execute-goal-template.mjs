import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

describe('Execute Goal Template Conformance & Governance Gate Test Suite', () => {
  const rootTemplatePath = path.join(process.cwd(), '.agents/templates/execute-goal.md');
  const frameworkTemplatePath = path.join(process.cwd(), 'template/.agents/templates/execute-goal.md');

  const targets = [
    { name: 'Root Repository Template', path: rootTemplatePath },
    { name: 'Framework Template', path: frameworkTemplatePath }
  ];

  for (const { name, path: targetPath } of targets) {
    describe(`${name} (${targetPath})`, () => {
      it('1. should exist, be readable, and have non-empty content', () => {
        assert.equal(fs.existsSync(targetPath), true, `Template file must exist at ${targetPath}`);
        const content = fs.readFileSync(targetPath, 'utf8');
        assert.ok(content.length > 1000, `Template content length (${content.length}) must be substantial`);
      });

      it('2. should declare the canonical trigger command syntax', () => {
        const content = fs.readFileSync(targetPath, 'utf8');
        assert.ok(content.includes('execute <GOAL_ID>'), 'Must specify `execute <GOAL_ID>` trigger');
        assert.ok(content.includes('# Universal Autonomous Execute Goal Protocol'), 'Must have canonical protocol title');
      });

      it('3. should declare all 11 lifecycle stages in exact chronological order', () => {
        const content = fs.readFileSync(targetPath, 'utf8');
        const expectedStages = [
          '1. PREFLIGHT',
          '2. CLARIFY',
          '3. PLAN',
          '4. IMPLEMENT',
          '5. VERIFICATION',
          '6. COMPLETENESS AUDIT',
          '7. INDEPENDENT REVIEW',
          '8. REPAIR LOOP',
          '9. RELEASE CANDIDATE',
          '10. APPROVAL AND SHIPPING RESTRICTIONS',
          '11. FINAL REPORT'
        ];

        let lastIndex = -1;
        for (const stage of expectedStages) {
          const index = content.indexOf(stage);
          assert.ok(index > -1, `Template must contain stage: "${stage}"`);
          assert.ok(index > lastIndex, `Stage "${stage}" must appear sequentially after previous stage`);
          lastIndex = index;
        }
      });

      it('4. should strictly enforce Article I zero-mock and zero-stub invariants in IMPLEMENT', () => {
        const content = fs.readFileSync(targetPath, 'utf8');
        const implementSection = content.slice(content.indexOf('4. IMPLEMENT'), content.indexOf('5. VERIFICATION'));
        assert.ok(implementSection.includes('Never create:'), 'IMPLEMENT must declare strict negative invariants');
        assert.ok(implementSection.includes('- mocks'), 'Must prohibit mocks');
        assert.ok(implementSection.includes('- stubs'), 'Must prohibit stubs');
        assert.ok(implementSection.includes('- fake data'), 'Must prohibit fake data');
        assert.ok(implementSection.includes('- synthetic outcomes'), 'Must prohibit synthetic outcomes');
        assert.ok(implementSection.includes('- fake passing tests'), 'Must prohibit fake passing tests');
        assert.ok(implementSection.includes('- placeholder implementations'), 'Must prohibit placeholder implementations');
        assert.ok(implementSection.includes('- disabled tests'), 'Must prohibit disabled tests');
        assert.ok(implementSection.includes('- weakened assertions'), 'Must prohibit weakened assertions');
      });

      it('5. should enforce all 5 completeness audit dimensions', () => {
        const content = fs.readFileSync(targetPath, 'utf8');
        const auditSection = content.slice(content.indexOf('6. COMPLETENESS AUDIT'), content.indexOf('7. INDEPENDENT REVIEW'));
        assert.ok(auditSection.includes('A. Requirement coverage'), 'Must audit requirement coverage');
        assert.ok(auditSection.includes('B. Code coverage'), 'Must audit code coverage');
        assert.ok(auditSection.includes('C. Test coverage'), 'Must audit test coverage');
        assert.ok(auditSection.includes('D. Evidence coverage'), 'Must audit evidence coverage');
        assert.ok(auditSection.includes('E. Reproducibility'), 'Must audit reproducibility');
        assert.ok(auditSection.includes('fail closed on nondeterministic or unavailable evidence'), 'Must enforce fail-closed reproducibility');
      });

      it('6. should enforce Human Approval Gate and non-bypassable shipping restrictions', () => {
        const content = fs.readFileSync(targetPath, 'utf8');
        const approvalSection = content.slice(
          content.indexOf('10. APPROVAL AND SHIPPING RESTRICTIONS'),
          content.indexOf('11. FINAL REPORT')
        );

        // Allowed agent actions
        assert.ok(approvalSection.includes('prepare the release candidate'), 'Agent may prepare release candidate');
        assert.ok(approvalSection.includes('create a commit if authorized'), 'Agent may commit if authorized');
        assert.ok(approvalSection.includes('create a PR if authorized'), 'Agent may create PR if authorized');

        // Prohibited autonomous actions
        assert.ok(approvalSection.includes('The agent must not automatically:'), 'Must enumerate prohibited automated actions');
        assert.ok(approvalSection.includes('- approve the goal'), 'Agent must not approve goal');
        assert.ok(approvalSection.includes('- mark the goal done'), 'Agent must not mark goal done');
        assert.ok(approvalSection.includes('- merge'), 'Agent must not merge');
        assert.ok(approvalSection.includes('- deploy'), 'Agent must not deploy');
        assert.ok(approvalSection.includes('- release to production'), 'Agent must not release to production');
        assert.ok(approvalSection.includes('- bypass branch protection'), 'Agent must not bypass branch protection');
        assert.ok(approvalSection.includes('Stop at the repository-defined human approval gate.'), 'Must stop at human gate');
      });

      it('7. should mandate comprehensive final reporting attributes', () => {
        const content = fs.readFileSync(targetPath, 'utf8');
        const reportSection = content.slice(content.indexOf('11. FINAL REPORT'));
        assert.ok(reportSection.includes('- project'), 'Must report project');
        assert.ok(reportSection.includes('- repository'), 'Must report repository');
        assert.ok(reportSection.includes('- goal ID'), 'Must report goal ID');
        assert.ok(reportSection.includes('- acceptance evidence'), 'Must report acceptance evidence');
        assert.ok(reportSection.includes('- completeness audit'), 'Must report completeness audit');
        assert.ok(reportSection.includes('- independent review'), 'Must report independent review');
        assert.ok(reportSection.includes('- release-candidate status'), 'Must report release-candidate status');
        assert.ok(reportSection.includes('- exact human action required'), 'Must report exact human action required');
      });

      it('8. should enforce touch map isolation and shared tracking file exclusion in PREFLIGHT', () => {
        const content = fs.readFileSync(targetPath, 'utf8');
        const preflightSection = content.slice(content.indexOf('1. PREFLIGHT'), content.indexOf('2. CLARIFY'));
        assert.ok(
          preflightSection.includes('Confirm touch map excludes shared tracking files'),
          'PREFLIGHT must mandate touch map exclusion of shared tracking files'
        );
        assert.ok(preflightSection.includes('docs/00-project-snapshot.md'), 'Must exclude docs/00-project-snapshot.md');
        assert.ok(preflightSection.includes('docs/07-backlog/goals.md'), 'Must exclude docs/07-backlog/goals.md');
        assert.ok(preflightSection.includes('docs/07-backlog/goal-id-registry.yaml'), 'Must exclude goal-id-registry.yaml');
        assert.ok(preflightSection.includes('CLARIFICATION.md'), 'Must exclude CLARIFICATION.md');
        assert.ok(preflightSection.includes('docs/06_raw/index.md'), 'Must exclude docs/06_raw/index.md');
        assert.ok(preflightSection.includes('docs/06_raw/log.md'), 'Must exclude docs/06_raw/log.md');
      });

      it('9. should enforce goal-partitioned clarification rules protecting root CLARIFICATION.md in CLARIFY', () => {
        const content = fs.readFileSync(targetPath, 'utf8');
        const clarifySection = content.slice(content.indexOf('2. CLARIFY'), content.indexOf('3. PLAN'));
        assert.ok(
          clarifySection.includes('Root `CLARIFICATION.md` preserves active repository-level Socratic alignment state'),
          'CLARIFY must protect root CLARIFICATION.md from clobbering'
        );
        assert.ok(
          clarifySection.includes('CLARIFICATION-<GOAL_ID>.md') || clarifySection.includes('docs/07-backlog/clarifications/<GOAL_ID>.md'),
          'CLARIFY must mandate goal-partitioned clarification filenames'
        );
      });

      it('10. should enforce negative file touch shields in IMPLEMENT preventing direct mutation of shared tracking markdown files', () => {
        const content = fs.readFileSync(targetPath, 'utf8');
        const implementSection = content.slice(content.indexOf('4. IMPLEMENT'), content.indexOf('5. VERIFICATION'));
        assert.ok(
          implementSection.includes('Never touch, overwrite, or clobber shared tracking files outside governance synchronization hooks:'),
          'IMPLEMENT must declare negative file touch shields for shared tracking files'
        );
        assert.ok(implementSection.includes('- docs/00-project-snapshot.md'), 'Must shield docs/00-project-snapshot.md');
        assert.ok(implementSection.includes('- docs/07-backlog/goals.md'), 'Must shield docs/07-backlog/goals.md');
        assert.ok(implementSection.includes('- docs/07-backlog/goal-id-registry.yaml'), 'Must shield goal-id-registry.yaml');
        assert.ok(implementSection.includes('- docs/07-backlog/queues/*.md'), 'Must shield queues/*.md');
        assert.ok(implementSection.includes('- Root CLARIFICATION.md'), 'Must shield Root CLARIFICATION.md');
        assert.ok(implementSection.includes('- docs/06_raw/index.md'), 'Must shield docs/06_raw/index.md');
        assert.ok(implementSection.includes('- docs/06_raw/log.md'), 'Must shield docs/06_raw/log.md');
      });
    });
  }
});
