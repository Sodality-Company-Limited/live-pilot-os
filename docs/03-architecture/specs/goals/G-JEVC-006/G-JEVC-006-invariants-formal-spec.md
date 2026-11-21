# G-JEVC-006 Invariants Formal Specification

## Domain Invariants

1. **State Machine Validity Invariant (Hoare Logic):**
   $$\forall s \in \text{Suggestion}, \quad s.\text{status} \in \{\text{proposed}, \text{grounded}, \text{delivered}, \text{used}, \text{edited}, \text{dismissed}, \text{expired}, \text{withdrawn}\}$$
   Transitions must follow the directed acyclic progression from intermediate states to terminal sinks:
   $$\text{Terminal}(s) \iff s.\text{status} \in \{\text{used}, \text{edited}, \text{dismissed}, \text{expired}, \text{withdrawn}\}$$
   $$\forall s \in \text{Suggestion}, \quad \text{Terminal}(s) \implies \delta(s, \text{event}) = \bot \; (\text{fails closed with LP04001})$$

2. **Freshness Horizon Invariant:**
   A suggestion cannot be presented to a host if expired:
   $$\text{deliver}(s, t) = \begin{cases} s' \text{ with status } \text{delivered} & \text{if } t < s.\text{freshness\_expires\_at} \\ \bot \; (\text{LP04001}) & \text{if } t \ge s.\text{freshness\_expires\_at} \end{cases}$$

3. **Reactive Withdrawal Determinism:**
   When an inventory depletion event occurs for item $k$:
   $$\forall s \in \text{ActiveSuggestions}(\text{session}), \quad s.\text{sku} = k \lor s.\text{product\_id} = k \implies \text{status}(s') = \text{withdrawn}$$
   where $\text{ActiveSuggestions} = \{ s \mid s.\text{status} \in \{\text{grounded}, \text{delivered}\} \}$.

4. **Zero-Mock & Zero-Stub Invariant (Article I):**
   All lifecycle handlers, state transitions, repository queries, and outbox event generations are 100% fully realized operational code.

5. **RFC 7807 Error Conformance:**
   All illegal transition attempts emit standard ProblemDetails matching the canonical registry (`LP04001 RESOURCE_VERSION_CONFLICT`).
