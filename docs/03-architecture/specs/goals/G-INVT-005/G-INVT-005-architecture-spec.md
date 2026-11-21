# Architecture Spec: G-INVT-005
Connects NATS request handler to database repository within a single database transaction, recording the reservation and writing the outbox event atomically.
