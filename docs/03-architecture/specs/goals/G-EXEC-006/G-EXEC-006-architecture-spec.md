# Architecture Spec: G-EXEC-006: Action Dispatch Vertical Slice

Implements the end-to-end execution action dispatch vertical slice:
1. `ExecutionDispatchService`: Domain service coordinating idempotency checking, state transitions, platform adapter dispatch, and NATS event emission.
2. `PlatformAdapterClient`: Isolated anti-corruption adapter interface protecting internal domain logic from provider-specific protocols.
3. Clean separation of concerns between transaction boundaries, persistence repositories, and external messaging.
