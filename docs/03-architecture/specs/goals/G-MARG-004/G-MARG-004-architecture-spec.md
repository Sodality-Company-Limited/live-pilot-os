# Architecture Spec: G-MARG-004
Vertical slice connects NATS evaluation request -> loads/validates margin policy -> calculates net contribution margin and bps -> issues APPROVED or REJECTED verdict -> saves outbox -> publishes verdict event.
