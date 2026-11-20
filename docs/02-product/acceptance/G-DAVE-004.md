# Acceptance Contract: G-DAVE-004 DAVE Reference Evidence Graph

**Goal Reference:** [G-DAVE-004.md](../../07-backlog/goals/G-DAVE-004.md)  
**Kind:** feature  
**Epic:** DAVE  
**Status:** ready  

---

## 🏛️ Executive Summary

This acceptance contract defines the empirical validation invariants for Goal G-DAVE-004: DAVE Reference Evidence Graph. DAVE constructs a queryable, content-addressed Directed Acyclic Graph (DAG) linking upstream multimodal reference artifacts (`REF-xxxx`), DAVE decision records (`DAVE-xxxx`), code implementation commits (`git rev-parse HEAD`), test verification receipts (`INV-xxxx` / proof receipts), and human approvals (`HITL`). The engine enforces strict mathematical Merkle integrity, zero cyclic references, complete causal connectivity with zero orphaned nodes, and bidirectional traversal query APIs resolving in under 5ms.

---

## 🧪 BDD Given-When-Then Acceptance Scenarios

### Scenario 1: Content-Addressed Node Ingestion and Merkle Cryptographic Sealing
```gherkin
Feature: Content-Addressed Node Schema and Merkle Digest Engine
  Scenario: Typed nodes are cryptographically content-addressed via SHA-256
    Given valid node payloads for ReferenceNode, DecisionNode, ImplementationNode, VerificationNode, and ApprovalNode
    When nodes are ingested into DaveEvidenceGraph
    Then each node MUST be assigned a deterministic SHA-256 node ID computed from its canonical payload and parent edge hashes
    And any mutation to payload attributes or parent references MUST alter the computed node ID
    And the graph Merkle root MUST deterministically reflect all constituent node digests.
```

### Scenario 2: Strict Acyclic Graph Enforcement and Cycle Rejection
```gherkin
Feature: Directed Acyclic Graph Topology Guard
  Scenario: Introducing a cyclic edge halts fail-closed with CycleDetectedError
    Given an established causal path: REF-0001 -> DAVE-UX-0001 -> Commit-a1b2c3d
    When an edge is attempted from Commit-a1b2c3d to REF-0001 (or any ancestral node)
    Then DaveEvidenceGraph MUST throw a CycleDetectedError
    And reject the edge mutation fail-closed
    And the graph state MUST remain clean, intact, and strictly acyclic.
```

### Scenario 3: Causal Edge Invariants and Orphan Rejection
```gherkin
Feature: End-to-End Causal Trace Invariant Validation
  Scenario: Disconnected or orphaned nodes fail graph invariant validation
    Given an ImplementationNode with no upstream DecisionNode
    Or a DecisionNode with no parent ReferenceNode
    When validateInvariants() is executed
    Then the validation result MUST return valid: false
    And list the exact orphaned node IDs and missing invariant rules
    And block certification fail-closed.

  Scenario: Fully connected lifecycle chain passes invariant validation
    Given an unbroken chain: ReferenceNode -> DecisionNode -> ImplementationNode -> VerificationNode -> ApprovalNode
    When validateInvariants() is executed
    Then the validation result MUST return valid: true with zero errors and zero orphaned nodes.
```

### Scenario 4: High-Performance Bidirectional Trace Traversal
```gherkin
Feature: Bidirectional Causal Query APIs
  Scenario: Upstream query from commit retrieves causative decisions and references
    Given an unbroken causal evidence graph for goal G-DAVE-004
    When queryUpstream(commitNodeId) is executed
    Then the query MUST return the complete causal ancestral chain: [Implementation -> Decision -> Reference]
    And answer "Why was this code written?" with 100% precision
    And resolve in < 5 milliseconds.

  Scenario: Downstream query from reference retrieves impacted implementations and verifications
    Given an unbroken causal evidence graph
    When queryDownstream(referenceNodeId) is executed
    Then the query MUST return all descendant decisions, commits, verifications, and approvals
    And answer "What was impacted by this reference?" with 100% precision
    And resolve in < 5 milliseconds.
```

### Scenario 5: Immutable Graph Serialization and Provenance Snapshot Verification
```gherkin
Feature: Graph Serialization, File Export, and Snapshot Verification
  Scenario: Graph serialization preserves exact Merkle root and node topology
    Given an active DaveEvidenceGraph containing verified lifecycle nodes
    When exportJson() or saveToFile("artifacts/proofs/G-DAVE-004-trace-graph.json") is executed
    And the serialized snapshot is loaded via DaveEvidenceGraph.loadFromFile(...)
    Then the reconstructed graph MUST match the original graph topology exactly
    And reconstructed Merkle root MUST be cryptographically identical ($M_{orig} = M_{restored}$)
    And graph validation on the reconstructed graph MUST pass with zero errors.
```

---

## 🔒 Non-Negotiable Invariants

1. **Zero Mocks & Zero Stubs:** Implementation in `scripts/lib/dave-evidence-graph.mjs` and harness `scripts/harness/dave-decision-trace-harness.mjs` MUST be 100% concrete operational logic.
2. **Sub-5ms Query Latency:** Traversal queries (`queryUpstream`, `queryDownstream`) MUST execute in $< 5\text{ms}$ on CPU host.
3. **Fail-Closed Cycle Rejection:** Any cycle detection MUST immediately abort and prevent graph corruption.
4. **Deterministic Merkle Root:** Node IDs and graph root hash MUST be deterministic regardless of object key order.
