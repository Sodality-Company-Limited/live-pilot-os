# Architecture Spec: G-INVT-001
Inventory service is the single authoritative writer of item stock levels and reservation states. It enforces zero overselling, atomic row-level locking, and transactional outbox events. It does not calculate margins or execute marketplace platform API calls.
