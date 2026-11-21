# G-CORE-053 FSM Runtime Specification

Canonical lifecycle states are created, active, paused, and ended. Invalid transitions are rejected, ended is terminal, and every accepted mutation increments the expected version exactly once.

Timeout and dependency uncertainty become pending/unknown or a durable retry/DLQ outcome. They never become success without authoritative evidence.

