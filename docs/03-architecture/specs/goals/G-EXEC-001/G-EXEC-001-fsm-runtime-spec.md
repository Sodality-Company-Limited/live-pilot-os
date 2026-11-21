# FSM Runtime Spec: G-EXEC-001
Execution Action state machine progresses deterministically through:
requested -> accepted -> pending -> succeeded / failed / unknown -> reconciled
Invalid or out-of-order transitions fail closed. Terminal failure states never silently coerce to succeeded.
