# G-IDEN-008 architecture

The identity-session-service is a service-owned bounded context. PostgreSQL is authoritative for principals and sessions; no service reads another database. Browser authority is the frozen server-managed cookie contract. Internal context is validated and re-authorized at each domain owner. Evidence must bind to source revision, contract version, correlation ID, and the goal verification command.

