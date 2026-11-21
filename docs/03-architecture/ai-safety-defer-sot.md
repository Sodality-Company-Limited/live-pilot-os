# LivePilot OS — AI Safety and Deferral SOT

AI output is advisory. The system must prefer a visible deferral over an unsupported
claim or uncertain action.

## Mandatory gates

1. Schema validation and refusal handling.
2. Catalog grounding and freshness check.
3. Confidence and ambiguity threshold.
4. Risk and policy evaluation.
5. Margin and stock evaluation for promotion proposals.
6. Operator approval for consequential demo actions.
7. Idempotent execution and reconciliation.

Any failed gate produces `deferred`, `blocked`, or `unknown` with a reason and audit
lineage. A provider timeout is never success. An unknown external outcome is never
blindly retried.

## Scenario invariants

- Opportunity may proceed only after verified economics and approval.
- Threat must block unsafe discounts and may propose a safe bundle only after the
  same margin and stock gates pass.
- Mock data must be visibly labeled and cannot be represented as marketplace truth.
