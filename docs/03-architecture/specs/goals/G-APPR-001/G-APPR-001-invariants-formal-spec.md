# Invariants Formal Spec: G-APPR-001

## 1. Non-Bypassable Emergency Pause Invariant
$$\forall \text{req} \in \text{ApprovalRequests}, \quad \text{PauseState}(\text{req.session\_id}) = \text{active} \implies \text{Transition}(\text{req}, \text{approved}) = \bot \ (\text{LP05004})$$

No action, whether autonomous, assisted, or manual, can be approved or dispatched while Emergency Pause is active.

## 2. Monotonic Control Revision Invariant
$$\forall s \in \text{Sessions}, \quad \text{Revision}_{t+1}(s) > \text{Revision}_t(s) \quad (\text{Revision} \in \mathbb{N}_{\ge 1})$$

## 3. Terminal State Immutability Invariant
$$\forall \text{appr} \in \text{Approvals}, \quad \text{State}(\text{appr}) \in \{\text{approved}, \text{rejected}, \text{expired}, \text{revoked}\} \implies \frac{\partial \text{State}(\text{appr})}{\partial t} = 0$$

## 4. Zero-Float & Exact Integer Milliseconds Invariant (Article V)
$$\forall \tau \in \{\text{decided\_at\_ms}, \text{updated\_at\_ms}, \text{occurred\_at\_ms}\}, \quad \tau \in \mathbb{N}_{\ge 0}$$
Floating point timestamps or fractions are strictly prohibited.
