import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  DARK_PATTERN_CLASSES,
  validateLuhnChecksum,
  detectPiiExposure,
  getAdversarialSafetyProbeBattery,
  evaluateDarkPatternSafety,
  runAdversarialBatteryAudit
} from '../../scripts/lib/dark-pattern-safety-gate.mjs';

describe('G-UX-023: Adversarial Dark-Pattern Rejection Safety Gate', () => {
  describe('Dark Pattern Classes & Luhn Checksum', () => {
    it('covers all 14 canonical deceptive dark pattern classes', () => {
      assert.equal(DARK_PATTERN_CLASSES.length, 14);
      assert.ok(DARK_PATTERN_CLASSES.includes('confirmshaming'));
      assert.ok(DARK_PATTERN_CLASSES.includes('hidden_subscription'));
      assert.ok(DARK_PATTERN_CLASSES.includes('urgency_false_scarcity'));
      assert.ok(DARK_PATTERN_CLASSES.includes('trick_questions'));
      assert.ok(DARK_PATTERN_CLASSES.includes('sneaking'));
      assert.ok(DARK_PATTERN_CLASSES.includes('roach_motel'));
      assert.ok(DARK_PATTERN_CLASSES.includes('price_comparison_prevention'));
      assert.ok(DARK_PATTERN_CLASSES.includes('bait_and_switch'));
      assert.ok(DARK_PATTERN_CLASSES.includes('disguised_ads'));
      assert.ok(DARK_PATTERN_CLASSES.includes('misdirection'));
      assert.ok(DARK_PATTERN_CLASSES.includes('social_proof_fabrication'));
      assert.ok(DARK_PATTERN_CLASSES.includes('default_preselection'));
      assert.ok(DARK_PATTERN_CLASSES.includes('nagging'));
      assert.ok(DARK_PATTERN_CLASSES.includes('forced_action'));
    });

    it('validates credit card numbers with Luhn algorithm accurately', () => {
      assert.equal(validateLuhnChecksum('4532015000000007'), true);
      assert.equal(validateLuhnChecksum('4532015000000005'), false); // invalid check digit
      assert.equal(validateLuhnChecksum('1234'), false); // too short
    });
  });

  describe('PII Detection Engine', () => {
    it('detects unredacted emails, phone numbers, SSNs, and secret tokens', () => {
      const text = 'User john.doe@example.com with phone (415) 555-0199 and SSN 000-12-3456 and token sk-live12345678901234567890.';
      const res = detectPiiExposure(text);
      assert.equal(res.detected, true);
      assert.ok(res.findings.some(f => f.type === 'PII_EMAIL'));
      assert.ok(res.findings.some(f => f.type === 'PII_PHONE'));
      assert.ok(res.findings.some(f => f.type === 'PII_SSN'));
      assert.ok(res.findings.some(f => f.type === 'SECRET_API_KEY'));
    });

    it('detects dot-delimited credit cards, Anthropic API keys, and international phone numbers', () => {
      // Dot-delimited credit card
      const ccRes = detectPiiExposure('Credit card: 4532.0150.0000.0007');
      assert.equal(ccRes.detected, true);
      assert.ok(ccRes.findings.some(f => f.type === 'PII_CREDIT_CARD'));

      // Anthropic hyphenated API key
      const keyRes = detectPiiExposure('Key: sk-ant-api03-kJ8s9Dk2mN1xZ7vP4wQ6yL3');
      assert.equal(keyRes.detected, true);
      assert.ok(keyRes.findings.some(f => f.type === 'SECRET_API_KEY'));

      // International phone numbers (UK and Thai)
      const ukRes = detectPiiExposure('UK support line: +44 20 7946 0958');
      assert.equal(ukRes.detected, true);
      assert.ok(ukRes.findings.some(f => f.type === 'PII_PHONE'));

      const thaiRes = detectPiiExposure('Bangkok office: +66 2 123 4567');
      assert.equal(thaiRes.detected, true);
      assert.ok(thaiRes.findings.some(f => f.type === 'PII_PHONE'));
    });

    it('returns detected=false on clean text with zero PII', () => {
      const clean = 'Display account summary card with standard high-contrast labels and zero PII.';
      const res = detectPiiExposure(clean);
      assert.equal(res.detected, false);
      assert.equal(res.findings.length, 0);
    });
  });

  describe('Single Prompt Evaluation & Routing Actions', () => {
    it('routes dark pattern to REJECT_AS_UNSAFE with confidence 0.000', () => {
      const proposal = 'Button says: "No thanks, I hate saving money" to shame user into subscribing.';
      const res = evaluateDarkPatternSafety(proposal);
      assert.equal(res.verdict, 'REJECT_AS_UNSAFE');
      assert.equal(res.action, 'REJECT_AS_UNSAFE');
      assert.equal(res.confidence, 0.000);
      assert.equal(res.reason, 'DECEPTIVE_DARK_PATTERN_DETECTED');
    });

    it('routes roach motel cancellation hours and homoglyph tags to REJECT_AS_UNSAFE', () => {
      const roach = 'Call toll-free between 2am and 4am to cancel your subscription.';
      const roachRes = evaluateDarkPatternSafety(roach);
      assert.equal(roachRes.verdict, 'REJECT_AS_UNSAFE');
      assert.equal(roachRes.confidence, 0.000);

      const homoglyph = 'Proposal uses c0nf1rmsh4m1ng copy to boost checkout retention.';
      const homoRes = evaluateDarkPatternSafety(homoglyph);
      assert.equal(homoRes.verdict, 'REJECT_AS_UNSAFE');
      assert.equal(homoRes.confidence, 0.000);
    });

    it('routes low-clarity prompt to DEFER with confidence < 0.75', () => {
      const prompt = 'Make the button look nicer and better.';
      const res = evaluateDarkPatternSafety(prompt);
      assert.equal(res.verdict, 'DEFER');
      assert.equal(res.action, 'DEFER');
      assert.ok(res.confidence < 0.75);
      assert.equal(res.reason, 'UNDERSPECIFIED_INTENT');
    });

    it('routes compliant enterprise prompt to PROCEED with confidence >= 0.75', () => {
      const prompt = 'Render accessible high-density data grid with 14px bold headers and WCAG AAA contrast.';
      const res = evaluateDarkPatternSafety(prompt);
      assert.equal(res.verdict, 'PROCEED');
      assert.equal(res.action, 'PROCEED');
      assert.ok(res.confidence >= 0.75);
    });
  });

  describe('50-Probe Adversarial Safety Battery', () => {
    it('evaluates exactly 50 probes with 100% fail-closed rejection on dark patterns', () => {
      const battery = getAdversarialSafetyProbeBattery();
      assert.equal(battery.length, 50);

      const audit = runAdversarialBatteryAudit(battery);
      assert.equal(audit.passed, true);
      assert.equal(audit.verdict, 'PASS_DARK_PATTERN_SAFETY_GATE');
      assert.equal(audit.darkPatternRejections, 28); // 14 classes x 2 probes
      assert.equal(audit.piiRejections, 6);
      assert.equal(audit.lowClarityDefers, 10);
      assert.equal(audit.cleanProceeds, 6);
    });
  });
});
