# Invariants Formal Spec: G-APPR-005

## 1. Mathematical Invariants & Verification Guarantees
1. **Emergency Pause Precedence Invariant**:
   $$\text{isPaused}(t, s) = \text{true} \implies \forall c \in \{\text{Request}, \text{Decide}\}, \quad \text{Outcome}(c) = \text{REJECTED}(\text{LP05004})$$
2. **Separation of Duty (SoD) Invariant**:
   $$\text{proposer\_id} = \text{decider\_id} \land \text{decision} = \text{approved} \implies \text{Outcome} = \text{REJECTED}(\text{LP05009})$$
3. **Terminal State Immutability Invariant**:
   $$\text{status} \in \{\text{approved}, \text{rejected}, \text{expired}, \text{revoked}\} \implies \forall d \in \text{Decisions}, \quad \text{Outcome}(d) = \text{REJECTED}(\text{LP05007})$$
4. **Autonomous Mode Privilege Invariant**:
   $$\text{target\_mode} = \text{AUTONOMOUS} \land \text{actor\_role} \neq \text{admin} \land \text{'control.mode.autonomous'} \notin \text{actor\_capabilities} \implies \text{Outcome} = \text{REJECTED}(\text{LP05008})$$
5. **Emergency Pause Automated Resumption Lock**:
   $$\text{operation} = \text{resume} \land \text{actor\_role} \in \{\text{'automated\_risk\_system'}, \text{'agent'}, \text{'system'}\} \implies \text{Outcome} = \text{REJECTED}(\text{LP05008})$$
6. **Zero-Float Accounting Invariant (Article V)**:
   All timestamps and deadlines strictly use exact integer milliseconds (`created_at_ms`, `updated_at_ms`, `deadline_at_ms`, `decided_at_ms`). Floating-point arithmetic is forbidden.
