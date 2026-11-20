# Project brief — LivePilot OS

> **Status:** Draft derived from `docs/03-architecture/`; Product approval and customer validation are pending.

## Vision

Help live-commerce Hosts and back-office operators respond to audience demand while protecting product, promotion, inventory, and compliance decisions.

## Problem

During a live session, Hosts must keep their selling flow while operators interpret chat, monitor product interest, and manage offers. The source documents identify risks around delayed responses, unverified product claims, unsafe discounts, inventory overselling, and opaque automated actions. These pains are product hypotheses until validated with target users.

## Solution

LivePilot OS coordinates audience signals, Host guidance, bounded back-office actions, and operator controls in one session flow. It separates the Host-facing co-pilot from back-office automation and requires policy checks and visible audit records for consequential actions.

## Is / Is not

| Is | Is not |
|----|--------|
| Host co-pilot and Live Ops controls; simulated Hackathon flow; margin and action oversight | Production marketplace integration without approved adapter contracts; real financial/stock actions without authorization; unsupported product or medical claims |

## Target users

Primary users (proposed): live-stream Hosts and Live Ops staff working for live-commerce brands/sellers or studios. Buyer segments (hypotheses): brands/sellers and MCNs/live studios operating on Shopee Live and TikTok Shop. Exact beachhead, team size, willingness to pay, and regional priorities remain unvalidated.

## Core user journey (high level)

1. Receive chat and telemetry from a live session and turn them into traceable intent/risk signals.
2. Show the Host a concise, product-grounded cue and show Live Ops the related product, policy, and session state.
3. Propose a bounded action, check policy and approval requirements, record the outcome, and allow the operator to pause automation.

## Hackathon demonstration outcome

Demonstrate one traceable scenario from chat intent to Host cue, product-action proposal, margin decision, operator-visible log, and emergency pause. See the [Requirements Baseline](../03-architecture/live-pilot-os-requirements.md) and [Feature Map](../03-architecture/live-pilot-os-feature-map.md#hackathon-mvp-to-demonstrate).

## Success measures

No numeric target is approved yet. Candidate demo measures to confirm:

- The demo completes the documented end-to-end scenario without losing the relationship between source chat, decision, and cue/action.
- A below-floor offer is blocked in the demo and its rationale is visible.
- Emergency Pause prevents subsequent automated actions in the scenario.
- Simulated behavior is visibly identified as simulated.

## Open product decisions

- Confirm the primary user and buyer for the first release.
- Approve the Hackathon MVP requirement set and numeric success targets.
- Confirm the canonical product name for the pitch and UI: LivePilot OS or Live OS.

## Technical direction (optional)

| Area | Choice |
|------|--------|
| Frontend | Next.js (latest stable version at implementation time) |
| Animation | Framer Motion / Motion for React |
| Backend | Undecided |
| Auth | Undecided |

## Related

- [knowledge-map.json](knowledge-map.json) · [knowledge-map.README.md](knowledge-map.README.md)
- [knowledge-digest.md](knowledge-digest.md)
- [assumptions.md](assumptions.md)
- [../03-architecture/overview.md](../03-architecture/overview.md)
- [../06-workflows/knowledge-loop.md](../06-workflows/knowledge-loop.md)
- [Business Case](../03-architecture/live-pilot-os-business-case.md) — hypotheses and evidence required
