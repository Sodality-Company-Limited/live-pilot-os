---
name: soda-landing-page
version: "1.0.0"
description: >-
  High-converting marketing landing pages, conversion architecture, and mathematical
  visual invariants. Use on goals creating or redesigning marketing websites, landing pages,
  or SaaS conversion funnels. Triggers: landing page, marketing site, conversion page,
  scroll reveal, headline design. Collaboration phases PLAN → EXECUTE → REVIEW.
---

# Landing Page Design & Conversion Architecture

This skill governs high-converting marketing landing pages, SaaS announcement sites, and conversion funnels based on the two-part system established in `elayadesign/ai-design-skills`:

1. **Part A: Strategy & Structure:** Mandatory intake, single conversion intent, and narrative section flow.
2. **Part B: Non-Negotiable Visual System:** Mathematical nested radii, typographic anti-orphan balance, hero bounds, and organic copywriting.

## Part A: Strategy & Conversion Structure

### 1. Mandatory 5-Point Intake
Before generating code or mockups, the agent MUST confirm:
1. **Ideal Customer Profile (ICP):** Who is the exact decision maker?
2. **Core Offer:** What specific value proposition is delivered?
3. **Primary Action / CTA:** Exactly one conversion event (e.g. "Start Free Trial", "Book Demo").
4. **Top 3 Objections:** What fears/risks must the page dismantle?
5. **Conversion SLA:** Measurable target (e.g. bounce rate $< 35\%$, signup conversion $> 8\%$).

### 2. Standard Landing Page Anatomy
Pages MUST follow the single-intent sequence:
1. **Hero Section:** Problem statement + primary offer + CTA (capped at $680\text{px}$ width).
2. **Social Proof & Evidence Bar:** Authentic logos and client metrics.
3. **Core Problem Breakdown:** Agitation of the user pain point.
4. **The Mechanism:** How the proprietary architecture solves the problem.
5. **Scroll Tagline Reveal:** Standalone scroll-driven thesis statement activating word-by-word.
6. **Feature Matrix / Deep Dive:** Interactive visual proof of capabilities.
7. **Objection Dismantling & FAQ:** Addressing the top 3 intake objections.
8. **Final Action & Conversion Trigger:** Re-iteration of the primary CTA.

---

## Part B: Non-Negotiable Visual System

| Invariant | Rule | Violation Consequence |
| :--- | :--- | :--- |
| **Nested Radii Law** | $r_{\text{inner}} = r_{\text{outer}} - \text{padding}$ for gaps $< 32\text{px}$. If $r_{\text{inner}} < 2\text{px}$, snap to $0\text{px}$. | Automated PR block via `nested-radii-guard.mjs`. |
| **Anti-Orphan Typography** | `text-wrap: balance` on $h_1-h_3$; `text-wrap: pretty` on body copy. | Static lint failure via `typography-layout-guard.mjs`. |
| **Hero Width Bound** | Hero headline and subtitle width strictly bounded to $\le 680\text{px}$. | Layout lint failure via `typography-layout-guard.mjs`. |
| **Anti-Hyphenation** | Zero hyphens in marketing headings or display copy. | Rephrase requirement via `typography-layout-guard.mjs`. |
| **Zero AI Buzzwords** | Strictly bans: *elevate, seamless, unleash, game-changer, delve, tapestry*. | Static check rejection via `marketing-copy-linter.mjs`. |
| **Organic Metrics** | Banned: $99.99\%, 50\%, \$100.00$. Must use realistic organic figures (e.g. $47.2\%$). | Static check rejection via `marketing-copy-linter.mjs`. |

---

## Related Skills
- [soda-design](../soda-design/SKILL.md) — Product UI/UX and design system tokens
- [soda-motion-microinteractions](../soda-motion-microinteractions/SKILL.md) — Spring physics and micro-interactions
- [soda-testing](../soda-testing/SKILL.md) — Visual regression and unit tests
