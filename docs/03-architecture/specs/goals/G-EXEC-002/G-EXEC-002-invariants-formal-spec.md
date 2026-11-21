# Invariants Formal Spec: G-EXEC-002: Execution Invariants

1. **State Conservatism Invariant:**
   $\forall a \in \text{ExecutionActions}, \text{state}(a) \in \{\text{requested}, \text{accepted}, \text{pending}, \text{succeeded}, \text{failed}, \text{unknown}, \text{reconciled}\}$.
   Transitions $\text{pending} \to \text{succeeded}$ require $\text{ObservedReceipt}(a) \neq \emptyset$.

2. **Zero-Float Accounting Invariant:**
   All monetary amounts associated with execution actions (e.g. voucher face value, min spend thresholds) MUST be encoded as integer minor units `(amount_minor: i64, currency: ISO_4217, scale: u8)`.

3. **Idempotent Single-Effect Invariant:**
   Given two identical commands $c_1, c_2$ with $\text{fingerprint}(c_1) = \text{fingerprint}(c_2)$:
   The second dispatch produces 0 external mutations and returns the original execution receipt.

4. **Unknown Deferral Invariant:**
   When an adapter communication breaks or times out, the postcondition is $\text{state} = \text{unknown}$. It is strictly forbidden to assume either execution or failure without explicit reconciliation.
